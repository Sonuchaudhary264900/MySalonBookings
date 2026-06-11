const Booking = require('../../models/Booking');
const Queue = require('../../models/Queue');
const Service = require('../../models/Service');
const Business = require('../../models/Business');
const Barber = require('../../models/Barber');
const Customer = require('../../models/Customer');
const Transaction = require('../../models/Transaction');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateBookingData, validatePagination } = require('../../utils/validators');
const { generateBookingId } = require('../../utils/helpers');
const messages = require('../../utils/messages');
const { autoAssignStaff } = require('../../utils/autoAssign');
const { credit, debit, reverseEarning } = require('../../utils/walletService');


const { createOrder, verifyPaymentSignature, getPaymentDetails } = require('../../config/razorpay');


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

    const salon = await Business.findById(salonId);
    if (!salon || !salon.isApproved) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_APPROVED, 404)
      );
    }

    // Fix 2: phone verified check
    const customer = await Customer.findById(req.customer._id);
    if (!customer.phoneVerified) {
      return res.status(403).json(
        formatErrorResponse('Please verify your phone number before booking.', 403)
      );
    }

    // Fix 2: per-phone 3/day limit (across all salons)
    const phoneBookingsToday = await Booking.countDocuments({
      customerPhone: customer.phone,
      appointmentDate: { $gte: new Date(appointmentDate + 'T00:00:00.000Z'), $lte: new Date(appointmentDate + 'T23:59:59.999Z') },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    });
    if (phoneBookingsToday >= 3) {
      return res.status(429).json(
        formatErrorResponse('You can only book 3 appointments per day. Try again tomorrow.', 429)
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

    // Check if salon is open on the requested date
    const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayName   = DAY_NAMES[new Date(appointmentDate + 'T12:00:00').getDay()];
    const dayHours  = salon.workingHours?.[dayName];

    const isHoliday = (salon.workingHours?.holidays || []).some(h =>
      new Date(h.date).toISOString().slice(0, 10) === appointmentDate
    );
    if (isHoliday) {
      return res.status(400).json(
        formatErrorResponse('The salon is closed on this date. Please choose another date.', 400)
      );
    }
    if (!dayHours || dayHours.isClosed) {
      return res.status(400).json(
        formatErrorResponse('The salon is closed on this day. Please choose another date.', 400)
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

    // Check appointment time is within working hours
    const parseMin = (t, fallback) => { const parts = (t || fallback).split(':').map(Number); return parts[0] * 60 + parts[1]; };
    const openMin  = parseMin(dayHours.open,  '09:00');
    const closeMin = parseMin(dayHours.close, '18:00');
    const apptMin  = parseMin(appointmentTime, '09:00');
    if (apptMin < openMin || apptMin + totalDuration > closeMin) {
      return res.status(400).json(
        formatErrorResponse('The requested time is outside the salon\'s working hours.', 400)
      );
    }

    // Reject bookings for past time slots (timezone-aware)
    // Use salon's timezone offset; default to IST (+5:30) for India-based salons.
    // Full per-salon timezone is Phase 2 — this covers 99% of current users safely.
    const tzOffsetMs  = (salon.timezoneOffsetMinutes ?? 330) * 60 * 1000; // default IST = +330 min
    const nowLocal    = new Date(Date.now() + tzOffsetMs);
    const todayISTStr = nowLocal.toISOString().slice(0, 10);
    if (appointmentDate === todayISTStr) {
      const nowMin = nowLocal.getUTCHours() * 60 + nowLocal.getUTCMinutes();
      if (apptMin < nowMin) { // strict <: allow booking at the exact current minute
        return res.status(400).json(
          formatErrorResponse('This time slot has already passed. Please choose an upcoming slot.', 400)
        );
      }
    }

    const primaryService = fetchedServices[0];
    const combinedName  = fetchedServices.map(s => s.name).join(' + ');

    // Use the same parseMin helper defined above (no second helper needed)
    const newStart = parseMin(appointmentTime, '09:00');
    const newEnd   = newStart + totalDuration;

    // ── Validate or auto-assign barber ──────────────────────────────────────
    let barber = null;
    if (barberId) {
      // Customer picked a specific staff member — validate they exist and are free
      barber = await Barber.findById(barberId);
      if (!barber || !barber.isActive) {
        return res.status(404).json(
          formatErrorResponse(messages.BARBER.BARBER_NOT_AVAILABLE, 404)
        );
      }

      // Barber-specific overlap check (per-staff, not salon-wide)
      const barberBookingsToday = await Booking.find({
        barberId: barber._id,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
      }).select('appointmentTime estimatedDuration').lean();

      const barberHasConflict = barberBookingsToday.some(b => {
        const es = parseMin(b.appointmentTime, '09:00');
        const ee = es + (b.estimatedDuration || 30);
        return newStart < ee && newEnd > es;
      });

      if (barberHasConflict) {
        return res.status(409).json(
          formatErrorResponse('This stylist is not available at that time. Please choose another stylist or time.', 409)
        );
      }
    } else {
      // Customer picked "Any Available" — run smart auto-assign algorithm
      barber = await autoAssignStaff({
        salonId,
        appointmentDate,
        appointmentTime,
        totalDuration,
        serviceIds: serviceIdList,
      });
      // barber may be null — booking will be created as UNASSIGNED (handled below)
    }

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
        // Track detailed usage history
        coupon.usageHistory.push({
          customerId: req.customer._id,
          discountApplied: discount,
          usedAt: new Date(),
          // bookingId will be patched after booking creation below
        });
        // Auto-disable if usage limit reached
        if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
          coupon.isActive = false;
        }
        await coupon.save();
      }
    }
    const finalAmount = totalPrice - discountAmount;

    const booking = await Booking.create({
      bookingId: generateBookingId(),
      customerId: req.customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerGender: customer.gender || null,
      salonId,
      salonName: salon.name,
      services: fetchedServices.map(s => ({
        serviceId:    s._id,
        serviceName:  s.name,
        servicePrice: s.basePrice,
        duration:     s.duration,
      })),
      barberId:  barber?._id || null,
      barberName: barber?.name || null, // null = truly unassigned (not "Any")
      staffName:  barber?.name || null, // alias for non-barbershop business types
      appointmentDate: new Date(appointmentDate + 'T00:00:00.000Z'),
      appointmentTime,
      estimatedDuration: totalDuration,
      discount: discountAmount,
      couponApplied: appliedCouponCode,
      totalAmount: finalAmount,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending"
    });

    // Patch bookingId into the coupon usageHistory entry we just created
    if (appliedCouponCode) {
      const Coupon = require('../../models/Coupon');
      await Coupon.updateOne(
        { code: appliedCouponCode, 'usageHistory.bookingId': { $exists: false } },
        { $set: { 'usageHistory.$[last].bookingId': booking._id } },
        { arrayFilters: [{ 'last.bookingId': { $exists: false } }] }
      ).catch(() => {}); // non-critical, don't fail booking
    }

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
          paymentOrder: order,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        }, messages.PAYMENT.PAYMENT_INITIATED)
      );
    }

    // Wallet payment — debit the customer's wallet immediately
    if (paymentMethod === "wallet") {
      try {
        const walletResult = await debit(req.customer._id, 'Customer', booking.totalAmount, 'booking_payment', {
          bookingId: booking._id,
          description: `Payment for booking ${booking.bookingId}`,
          status: 'success',
        });

        booking.transactionId = walletResult.transaction._id.toString();
        booking.paidAt = new Date();

        await Transaction.create({
          transactionId: walletResult.transaction._id.toString(),
          bookingId: booking._id,
          customerId: req.customer._id,
          salonId: salon._id,
          amount: booking.totalAmount,
          finalAmount: booking.totalAmount,
          paymentMethod: 'wallet',
          paymentStatus: 'success',
        });

        await credit(salon.ownerId, 'Owner', booking.totalAmount, 'booking_earning', {
          bookingId: booking._id,
          description: `Earnings from booking ${booking.bookingId}`,
          status: 'success',
        }).catch(() => {});
      } catch (err) {
        if (err.code === 'INSUFFICIENT_BALANCE') {
          await Booking.deleteOne({ _id: booking._id });
          return res.status(400).json(
            formatErrorResponse(messages.PAYMENT.INSUFFICIENT_BALANCE, 400)
          );
        }
        throw err;
      }
    }

    const autoConfirm = salon.autoConfirmBookings !== false; // default true
    booking.status = autoConfirm ? "confirmed" : "pending";
    booking.paymentStatus = "completed";
    await booking.save();

    await addToQueue(salonId, booking);

    // Fire-and-forget push + WhatsApp notifications — never block the response
    (async () => {
      try {
        const { sendExpoPush } = require('../../utils/pushNotification');
        const { sendBookingConfirmation } = require('../../utils/whatsapp');
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

        if (customer.phone) {
          sendBookingConfirmation({
            phone: customer.phone,
            customerName: customer.name || 'there',
            salonName: salon.name,
            serviceName: combinedName,
            date: appointmentDate,
            time: appointmentTime,
          }).catch(() => {});
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
      } catch (err) {
        console.error('[push:booking]', err.message, err.stack);
      }
    })();



    res.status(201).json(
      formatSuccessResponse(booking, messages.BOOKING.BOOKING_CREATED)
    );

  } catch (error) {

    console.error("Create booking error:", error);

    if (error.code === 11000) {
      return res.status(409).json(
        formatErrorResponse('This time slot is already booked. Please choose another time.', 409)
      );
    }

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// VERIFY ONLINE PAYMENT (Razorpay) FOR A BOOKING
// ===================================================
const verifyBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.MISSING_REQUIRED_FIELDS, 400)
      );
    }

    const booking = await Booking.findOne({ _id: bookingId, customerId: req.customer._id });
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    if (booking.paymentStatus === 'completed') {
      return res.status(200).json(
        formatSuccessResponse(booking, messages.PAYMENT.PAYMENT_ALREADY_PROCESSED)
      );
    }

    const verification = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!verification.success) {
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.status(400).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_INVALID_SIGNATURE, 400)
      );
    }

    const existingTxn = await Transaction.findOne({ transactionId: razorpay_payment_id });
    if (existingTxn) {
      return res.status(200).json(
        formatSuccessResponse(booking, messages.PAYMENT.PAYMENT_ALREADY_PROCESSED)
      );
    }

    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    if (!paymentDetails.success) {
      return res.status(400).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 400)
      );
    }

    const salon = await Business.findById(booking.salonId);
    const customer = await Customer.findById(req.customer._id);

    booking.transactionId = razorpay_payment_id;
    booking.paidAt = new Date();

    await finalizeBookingAfterPayment(booking, salon, customer);

    await Transaction.create({
      transactionId: razorpay_payment_id,
      razorpayId: razorpay_order_id,
      bookingId: booking._id,
      customerId: customer._id,
      salonId: salon._id,
      amount: booking.totalAmount,
      finalAmount: booking.totalAmount,
      paymentMethod: 'online',
      paymentStatus: 'success',
      razorpayResponse: paymentDetails,
    });

    await credit(salon.ownerId, 'Owner', booking.totalAmount, 'booking_earning', {
      bookingId: booking._id,
      description: `Earnings from booking ${booking.bookingId}`,
      status: 'success',
    }).catch(() => {});

    return res.status(200).json(
      formatSuccessResponse(booking, messages.PAYMENT.PAYMENT_SUCCESSFUL)
    );

  } catch (error) {
    console.error('Verify booking payment error:', error);
    return res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// FINALIZE BOOKING AFTER PAYMENT CONFIRMATION
// (shared by online-payment verification; mirrors the
// confirm/queue/notify steps run for cash & wallet bookings)
// ===================================================
const finalizeBookingAfterPayment = async (booking, salon, customer) => {
  const autoConfirm = salon.autoConfirmBookings !== false; // default true
  booking.status = autoConfirm ? "confirmed" : "pending";
  booking.paymentStatus = "completed";
  await booking.save();

  await addToQueue(salon._id, booking);

  const combinedName = booking.services.map(s => s.serviceName).join(', ');
  const appointmentDateStr = booking.appointmentDate.toISOString().split('T')[0];

  (async () => {
    try {
      const { sendExpoPush } = require('../../utils/pushNotification');
      const { sendBookingConfirmation } = require('../../utils/whatsapp');
      const Owner = require('../../models/Owner');
      const owner = await Owner.findById(salon.ownerId).select('pushToken').lean();

      if (customer.pushToken) {
        sendExpoPush(
          customer.pushToken,
          'Booking Confirmed! ✅',
          `Your ${combinedName} at ${salon.name} is booked for ${appointmentDateStr} at ${booking.appointmentTime}`,
          { bookingId: booking._id.toString(), type: 'booking_confirmed' },
          { channelId: 'booking_confirmed' }
        ).catch(() => {});
      }

      if (customer.phone) {
        sendBookingConfirmation({
          phone: customer.phone,
          customerName: customer.name || 'there',
          salonName: salon.name,
          serviceName: combinedName,
          date: appointmentDateStr,
          time: booking.appointmentTime,
        }).catch(() => {});
      }

      if (owner?.pushToken) {
        sendExpoPush(
          owner.pushToken,
          '🔔 New Booking!',
          `${customer.name} booked ${combinedName} on ${appointmentDateStr} at ${booking.appointmentTime}`,
          { bookingId: booking._id.toString(), type: 'new_booking', autoConfirm: String(autoConfirm) },
          { channelId: 'new_booking' }
        ).catch(() => {});
      }
    } catch (err) {
      console.error('[push:booking]', err.message, err.stack);
    }
  })();

  return booking;
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
      .populate('salonId', 'name location address city phone businessType')
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

    if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
      return res.status(400).json(
        formatErrorResponse(`Cannot cancel a booking that is already ${booking.status}`, 400)
      );
    }

    // Fix 7: cancellation cutoff
    const salon = await Business.findById(booking.salonId).select('cancellationCutoffHours').lean();
    const cutoffHours = salon?.cancellationCutoffHours ?? 2;
    if (cutoffHours > 0 && booking.appointmentDate && booking.appointmentTime) {
      const [h, m] = booking.appointmentTime.split(':').map(Number);
      const apptMs = new Date(booking.appointmentDate).setUTCHours(h, m, 0, 0);
      const minsUntil = (apptMs - Date.now()) / 60000;
      if (minsUntil < cutoffHours * 60) {
        return res.status(400).json(
          formatErrorResponse(`Cancellations are not allowed within ${cutoffHours} hour(s) of the appointment.`, 400)
        );
      }
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();

    // Refund online/wallet payments back to the customer's wallet
    if (booking.paymentStatus === 'completed' && (booking.paymentMethod === 'online' || booking.paymentMethod === 'wallet')) {
      await credit(booking.customerId, 'Customer', booking.totalAmount, 'booking_refund', {
        bookingId: booking._id,
        description: `Refund for cancelled booking ${booking.bookingId}`,
        status: 'success',
      }).catch(() => {});

      const salonForRefund = await Business.findById(booking.salonId).select('ownerId').lean();
      if (salonForRefund?.ownerId) {
        await reverseEarning(salonForRefund.ownerId, 'Owner', booking.totalAmount, 'booking_refund', {
          bookingId: booking._id,
          description: `Refund deducted for cancelled booking ${booking.bookingId}`,
          status: 'success',
        }).catch(() => {});
      }

      booking.paymentStatus = 'refunded';
    }

    await booking.save();

    await Queue.updateOne(
      { salonId: booking.salonId },
      { $pull: { queue: { bookingId } } }
    );

    // Recalculate live tentative timing — cancellation may free up the barber's queue
    if (booking.barberId) {
      const { recalcQueueTiming } = require('../../utils/queueTiming');
      const dateStr = booking.appointmentDate.toISOString().slice(0, 10);
      recalcQueueTiming(booking.salonId, booking.barberId, dateStr, req.app.get('io')).catch(() => {});
    }

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
  verifyBookingPayment,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  addToQueue
};