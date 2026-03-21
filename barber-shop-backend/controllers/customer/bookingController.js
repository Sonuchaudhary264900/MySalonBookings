const Booking = require('../../models/Booking');
const Queue = require('../../models/Queue');
const Service = require('../../models/Service');
const Salon = require('../../models/Salon');
const Barber = require('../../models/Barber');
const Customer = require('../../models/Customer');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateBookingData, validatePagination } = require('../../utils/validators');
const { generateBookingId } = require('../../utils/helpers');
const messages = require('../../utils/messages');


const { createOrder } = require('../../config/razorpay');


// ===================================================
// CREATE BOOKING
// ===================================================
const createBooking = async (req, res) => {
  try {

    const { salonId, serviceId, serviceIds, barberId, appointmentDate, appointmentTime, paymentMethod, couponCode } = req.body;

    // Support both single serviceId and multiple serviceIds array
    const serviceIdList = serviceIds?.length ? serviceIds : (serviceId ? [serviceId] : []);

    const validation = validateBookingData({
      salonId,
      serviceId: serviceIdList[0],
      serviceIds: serviceIdList,
      appointmentDate,
      appointmentTime,
      paymentMethod,
    });

    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isApproved) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_APPROVED, 404)
      );
    }

    // Check if customer is blocked by this salon
    const isBlocked = salon.blockedCustomers?.some(
      bc => bc.customerId?.toString() === req.customer._id.toString()
    );
    if (isBlocked) {
      return res.status(403).json(
        formatErrorResponse('You are not allowed to book at this salon.', 403)
      );
    }

    // Enforce max 2 active bookings per customer per day
    const dayStart = new Date(appointmentDate + 'T00:00:00.000Z');
    const dayEnd   = new Date(appointmentDate + 'T23:59:59.999Z');
    const bookingsToday = await Booking.countDocuments({
      customerId: req.customer._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    });
    if (bookingsToday >= 2) {
      return res.status(400).json(
        formatErrorResponse('You can only have 2 active bookings per day. Complete your existing bookings first.', 400)
      );
    }

    // Enforce salon's advance booking window
    const advanceDays = salon.advanceBookingDays ?? 1;
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const maxAllowed = new Date(todayLocal);
    maxAllowed.setDate(todayLocal.getDate() + advanceDays);
    maxAllowed.setHours(23, 59, 59, 999);
    const requestedDate = new Date(appointmentDate + 'T00:00:00');
    if (requestedDate < todayLocal || requestedDate > maxAllowed) {
      const label = advanceDays === 0 ? 'today only' : `today and the next ${advanceDays} day(s)`;
      return res.status(400).json(
        formatErrorResponse(`This salon accepts bookings for ${label}.`, 400)
      );
    }

    // Fetch and validate all selected services
    const fetchedServices = await Service.find({ _id: { $in: serviceIdList }, isActive: true });
    if (fetchedServices.length !== serviceIdList.length) {
      return res.status(404).json(
        formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404)
      );
    }

    const totalDuration = fetchedServices.reduce((sum, s) => sum + (s.duration || 30), 0);
    const totalPrice    = fetchedServices.reduce((sum, s) => sum + (s.basePrice || 0), 0);
    const primaryService = fetchedServices[0];
    const combinedName  = fetchedServices.map(s => s.name).join(' + ');

    let barber = null;
    if (barberId) {
      barber = await Barber.findById(barberId);
      if (!barber || !barber.isActive) {
        return res.status(404).json(
          formatErrorResponse(messages.BARBER.BARBER_NOT_AVAILABLE, 404)
        );
      }
    }

    // Check for overlapping bookings
    const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const existingBookings = await Booking.find({
      salonId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    }).select('appointmentTime estimatedDuration').lean();

    const newStart = timeToMinutes(appointmentTime);
    const newEnd   = newStart + totalDuration;

    const hasConflict = existingBookings.some((b) => {
      const existStart = timeToMinutes(b.appointmentTime);
      const existEnd   = existStart + (b.estimatedDuration || 30);
      return newStart < existEnd && newEnd > existStart;
    });

    if (hasConflict) {
      return res.status(409).json(
        formatErrorResponse('This time slot is already booked or overlaps with an existing booking. Please choose another slot.', 409)
      );
    }

    const customer = await Customer.findById(req.customer._id);

    // Apply coupon if provided
    let discountAmount = 0;
    let appliedCouponCode = null;
    if (couponCode) {
      const Coupon = require('../../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon) {
        let discount = coupon.discountType === 'percentage'
          ? Math.round((totalPrice * coupon.discountValue) / 100)
          : coupon.discountValue;
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.min(discount, totalPrice);
        discountAmount = discount;
        appliedCouponCode = coupon.code;
        coupon.usageCount += 1;
        coupon.usedBy.push(req.customer._id);
        await coupon.save();
      }
    }
    const finalAmount = totalPrice - discountAmount;

    const booking = await Booking.create({
      bookingId: generateBookingId(),
      customerId: req.customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      salonId,
      salonName: salon.name,
      serviceId: primaryService._id,
      serviceName: combinedName,
      services: fetchedServices.map(s => ({
        serviceId:    s._id,
        serviceName:  s.name,
        servicePrice: s.basePrice,
        duration:     s.duration,
      })),
      barberId: barberId || null,
      barberName: barber?.name || "Any",
      appointmentDate: new Date(appointmentDate + 'T12:00:00.000Z'),
      appointmentTime,
      estimatedDuration: totalDuration,
      servicePrice: totalPrice,
      discount: discountAmount,
      couponApplied: appliedCouponCode,
      totalAmount: finalAmount,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending"
    });

    // Razorpay payment
    if (paymentMethod === "online") {

      const order = await createOrder(
        booking.totalAmount,
        req.customer._id,
        booking._id
      );

      booking.transactionId = order.orderId;
      await booking.save();

      return res.status(201).json(
        formatSuccessResponse({
          booking,
          paymentOrder: order
        }, messages.PAYMENT.PAYMENT_INITIATED)
      );
    }

    const autoConfirm = salon.autoConfirmBookings !== false; // default true
    booking.status = autoConfirm ? "confirmed" : "pending";
    booking.paymentStatus = "completed";
    await booking.save();

    await addToQueue(salonId, booking);

    // Fire-and-forget push notifications — never block the response
    (async () => {
      try {
        const { sendExpoPush } = require('../../utils/pushNotification');
        const Owner = require('../../models/Owner');
        const owner = await Owner.findById(salon.ownerId).select('pushToken').lean();

        if (customer.pushToken) {
          sendExpoPush(
            customer.pushToken,
            'Booking Confirmed! ✅',
            `Your ${combinedName} at ${salon.name} is booked for ${appointmentDate} at ${appointmentTime}`,
            { bookingId: booking._id.toString(), type: 'booking_confirmed' },
            { channelId: 'booking_confirmed' }
          ).catch(() => {});
        }

        if (owner?.pushToken) {
          sendExpoPush(
            owner.pushToken,
            '🔔 New Booking!',
            `${customer.name} booked ${combinedName} on ${appointmentDate} at ${appointmentTime}`,
            { bookingId: booking._id.toString(), type: 'new_booking', autoConfirm: String(autoConfirm) },
            { channelId: 'new_booking' }
          ).catch(() => {});
        }
      } catch {}
    })();



    res.status(201).json(
      formatSuccessResponse(booking, messages.BOOKING.BOOKING_CREATED)
    );

  } catch (error) {

    console.error("Create booking error:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// GET CUSTOMER BOOKINGS
// ===================================================
const getMyBookings = async (req, res) => {
  try {

    const { page = 1, limit = 10 } = req.query;
    const { page: p, limit: l } = validatePagination(page, limit);

    const query = { customerId: req.customer._id };

    const bookings = await Booking.find(query)
      .populate('salonId', 'name location address city phone')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l);

    const total = await Booking.countDocuments(query);

    res.json(
      formatSuccessResponse({
        bookings,
        pagination: {
          total,
          page: p,
          limit: l
        }
      })
    );

  } catch (error) {

    console.error("Get bookings error:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// GET BOOKING DETAILS
// ===================================================
const getBookingDetails = async (req, res) => {
  try {

    const { bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      customerId: req.customer._id,
    });

    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    res.json(
      formatSuccessResponse(booking, messages.GENERIC.RETRIEVED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// CANCEL BOOKING
// ===================================================
const cancelBooking = async (req, res) => {
  try {

    const { bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      customerId: req.customer._id,
    });

    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json(
        formatErrorResponse(`Cannot cancel a booking that is already ${booking.status}`, 400)
      );
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();

    await booking.save();

    await Queue.updateOne(
      { salonId: booking.salonId },
      { $pull: { queue: { bookingId } } }
    );

    res.json(
      formatSuccessResponse(booking, messages.BOOKING.BOOKING_CANCELLED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// ADD TO QUEUE
// ===================================================
const addToQueue = async (salonId, booking) => {

  let queue = await Queue.findOne({ salonId });

  if (!queue) {
    queue = await Queue.create({
      salonId,
      queue: []
    });
  }

  const position = queue.queue.length + 1;

  queue.queue.push({
    bookingId: booking._id,
    customerId: booking.customerId,
    customerName: booking.customerName,
    position,
    status: "waiting"
  });

  queue.totalWaiting += 1;

  await queue.save();

  return queue;
};



// ===================================================
// EXPORTS
// ===================================================
module.exports = {
  createBooking,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  addToQueue
};