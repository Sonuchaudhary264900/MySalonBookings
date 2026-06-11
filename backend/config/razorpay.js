// config/razorpay.js
// Razorpay payment gateway: order creation, signature verification,
// payment lookup and refunds. Requires RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay Initialized');
  } else {
    console.log('⏳ Razorpay credentials not found in .env - using placeholder mode');
  }
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
}

const NOT_CONFIGURED = {
  success: false,
  message: 'Razorpay is not configured. Add credentials to .env',
};

// ===================================================
// CREATE PAYMENT ORDER
// ===================================================
const createOrder = async (amount, customerId, bookingId) => {
  try {
    if (!razorpayInstance) return { ...NOT_CONFIGURED, mode: 'placeholder' };

    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      // Razorpay rejects receipts longer than 40 chars — keep id tail + base36 time
      receipt: `rcpt_${String(bookingId).slice(-15)}_${Date.now().toString(36)}`,
      payment_capture: 1,
      notes: {
        customerId: customerId,
        bookingId: bookingId,
        description: 'My Salon Bookings Payment',
      },
    });

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
      createdAt: new Date(order.created_at * 1000),
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error.message);
    throw {
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
    };
  }
};

// ===================================================
// VERIFY PAYMENT SIGNATURE
// ===================================================
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    if (!razorpayInstance) return NOT_CONFIGURED;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = expectedSignature === signature;
    if (!isValid) console.error('❌ Invalid payment signature for order:', orderId);

    return {
      success: isValid,
      message: isValid ? 'Payment verified successfully' : 'Invalid signature',
      orderId: orderId,
      paymentId: paymentId,
    };
  } catch (error) {
    console.error('❌ Error verifying signature:', error.message);
    return {
      success: false,
      message: 'Signature verification failed',
      error: error.message,
    };
  }
};

// ===================================================
// GET PAYMENT DETAILS
// ===================================================
const getPaymentDetails = async (paymentId) => {
  try {
    if (!razorpayInstance) return NOT_CONFIGURED;

    const payment = await razorpayInstance.payments.fetch(paymentId);

    return {
      success: true,
      paymentId: payment.id,
      amount: payment.amount / 100, // rupees
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      description: payment.description,
      notes: payment.notes,
      createdAt: new Date(payment.created_at * 1000),
      vpa: payment.vpa, // UPI payments
      card: payment.card_id, // card payments
    };
  } catch (error) {
    console.error('❌ Error fetching payment details:', error.message);
    throw {
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message,
    };
  }
};

// ===================================================
// INITIATE REFUND (full when amount omitted, partial otherwise)
// ===================================================
const initiateRefund = async (paymentId, amount = null) => {
  try {
    if (!razorpayInstance) return NOT_CONFIGURED;

    const refundOptions = {};
    if (amount) refundOptions.amount = Math.round(amount * 100); // paise

    const refund = await razorpayInstance.payments.refund(paymentId, refundOptions);
    console.log(`✅ Refund initiated: ${refund.id} for payment ${paymentId}`);

    return {
      success: true,
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount / 100, // rupees
      status: refund.status,
      notes: refund.notes,
      createdAt: new Date(refund.created_at * 1000),
    };
  } catch (error) {
    console.error('❌ Error initiating refund:', error.message);
    throw {
      success: false,
      message: 'Failed to initiate refund',
      error: error.message,
    };
  }
};

// ===================================================
// TEST RAZORPAY CONNECTION (startup health check)
// ===================================================
const testRazorpayConnection = async () => {
  try {
    if (!razorpayInstance) {
      console.log('⏳ Razorpay: Not configured (credentials missing)');
      return false;
    }

    await razorpayInstance.payments.all({ count: 1 });
    console.log('✅ Razorpay Connected Successfully');
    return true;
  } catch (error) {
    console.error('❌ Razorpay Connection Failed:', error.message);
    return false;
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  initiateRefund,
  testRazorpayConnection,
};
