// controllers/payment/paymentController.js
/*
  Payment Controller
  Handles:
  - Verify payment signature
  - Create payment order
  - Process payment
  - Get payment status
  - Handle payment failures
  - Process refunds
*/

const Booking = require('../../models/Booking');
const Transaction = require('../../models/Transaction');
const Customer = require('../../models/Customer');
const Salon = require('../../models/Salon');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { generateTransactionId } = require('../../utils/helpers');
const messages = require('../../utils/messages');
const { verifyPaymentSignature, initiateRefund } = require('../../config/razorpay');


// ===================================================
// CREATE PAYMENT ORDER
// ===================================================
exports.createPaymentOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    // Validate input
    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json(
        formatErrorResponse('Valid booking ID and amount are required', 400)
      );
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    // Verify ownership
    if (booking.customerId.toString() !== req.customer._id.toString()) {
      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN, 403)
      );
    }

    // Check if payment already made
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_ALREADY_PROCESSED, 400)
      );
    }

    // Get customer email
    const customer = await Customer.findById(req.customer._id);

    // Create Razorpay order
    const order = await require('../../config/razorpay').createOrder(
      amount,
      req.customer._id,
      bookingId,
      customer.email,
      customer.phone
    );

    if (!order.success) {
      return res.status(500).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 500)
      );
    }

    // Update booking with order ID
    booking.transactionId = order.orderId;
    await booking.save();

    res.json(
      formatSuccessResponse(
        {
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          customerId: req.customer._id,
          customerEmail: customer.email,
          customerPhone: customer.phone,
        },
        messages.PAYMENT.PAYMENT_INITIATED
      )
    );
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json(
      formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 500)
    );
  }
};

// ===================================================
// VERIFY PAYMENT SIGNATURE
// ===================================================
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;

    // Validate input
    if (!orderId || !paymentId || !signature || !bookingId) {
      return res.status(400).json(
        formatErrorResponse('Missing payment details', 400)
      );
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    // Verify ownership
    if (booking.customerId.toString() !== req.customer._id.toString()) {
      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN, 403)
      );
    }

    // Verify signature
    const verification = verifyPaymentSignature(orderId, paymentId, signature);
    if (!verification.success) {
      return res.status(400).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_INVALID_SIGNATURE, 400)
      );
    }

    // Create transaction record
    const transaction = await Transaction.create({
      transactionId: generateTransactionId(),
      razorpayId: paymentId,
      bookingId,
      customerId: req.customer._id,
      salonId: booking.salonId,
      amount: booking.totalAmount,
      currency: 'INR',
      discount: booking.discount || 0,
      finalAmount: booking.totalAmount,
      paymentMethod: 'card', // Can be updated based on actual method
      paymentStatus: 'success',
      razorpayResponse: verification,
    });

    // Update booking
    booking.paymentStatus = 'completed';
    booking.paidAt = new Date();
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    // Add to queue
    const { addToQueue } = require('./bookingController');
    await addToQueue(booking.salonId, booking);

    // Add loyalty points to customer
    const customer = await Customer.findById(req.customer._id);
    const loyaltyPoints = Math.round(booking.totalAmount);
    await customer.addLoyaltyPoints(loyaltyPoints);

    // Update salon stats
    const salon = await Salon.findById(booking.salonId);
    salon.totalRevenue += booking.totalAmount;
    salon.totalBookings += 1;
    await salon.save();



    res.json(
      formatSuccessResponse(
        {
          booking,
          transaction,
          loyaltyPointsEarned: loyaltyPoints,
        },
        messages.PAYMENT.PAYMENT_SUCCESSFUL
      )
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json(
      formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 500)
    );
  }
};

// ===================================================
// GET PAYMENT STATUS
// ===================================================
exports.getPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      transactionId,
      customerId: req.customer._id,
    });

    if (!transaction) {
      return res.status(404).json(
        formatErrorResponse('Transaction not found', 404)
      );
    }

    res.json(
      formatSuccessResponse(transaction, messages.GENERIC.RETRIEVED)
    );
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// PROCESS REFUND
// ===================================================
exports.processRefund = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND, 404)
      );
    }

    // Verify ownership
    if (booking.customerId.toString() !== req.customer._id.toString()) {
      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN, 403)
      );
    }

    // Check if payment was made
    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json(
        formatErrorResponse('No payment to refund', 400)
      );
    }

    const refundAmount = amount || booking.totalAmount;

    // Fetch transaction
    const transaction = await Transaction.findOne({
      bookingId,
      paymentStatus: 'success',
    });

    if (!transaction) {
      return res.status(404).json(
        formatErrorResponse('Transaction not found', 404)
      );
    }

    // Process refund with Razorpay
    try {
      const refund = await initiateRefund(transaction.razorpayId, refundAmount);

      // Update transaction
      transaction.refundAmount = refundAmount;
      transaction.refundStatus = refundAmount === booking.totalAmount ? 'full' : 'partial';
      transaction.refundDate = new Date();
      transaction.refundRazorpayId = refund.refundId;
      await transaction.save();

      // Update booking
      booking.refundAmount = refundAmount;
      booking.refundStatus = transaction.refundStatus;
      await booking.save();

      // Add refund amount to wallet for future use
      const customer = await Customer.findById(req.customer._id);
      await customer.addWalletBalance(refundAmount);

      res.json(
        formatSuccessResponse(
          {
            refundId: refund.refundId,
            amount: refundAmount,
            status: transaction.refundStatus,
          },
          messages.PAYMENT.REFUND_SUCCESSFUL
        )
      );
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json(
        formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 500)
      );
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// GET CUSTOMER TRANSACTIONS
// ===================================================
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const transactions = await Transaction.find({
      customerId: req.customer._id,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments({
      customerId: req.customer._id,
    });

    res.json(
      formatSuccessResponse(
        {
          transactions,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
        messages.GENERIC.RETRIEVED
      )
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};
