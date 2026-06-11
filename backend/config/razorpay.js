// config/razorpay.js
/*
  Razorpay Payment Gateway Configuration
  For processing online payments from customers
  Setup: Sign up at https://razorpay.com
  
  Features:
  - Create payment orders
  - Verify payment signatures
  - Process refunds
  - Payment status tracking
  
  NOTE: This is REAL implementation - not placeholder
  Once you get Razorpay API keys, update .env file
*/

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
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
    console.log('   Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env to enable');
  }
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
}

// ===================================================
// CREATE PAYMENT ORDER
// ===================================================
const createOrder = async (amount, customerId, bookingId, customerEmail, customerPhone) => {
  try {
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured. Add credentials to .env',
        mode: 'placeholder',
      };
    }

    console.log(`💳 Creating Razorpay order for ₹${amount}`);

    const options = {
      amount: Math.round(amount * 100), // Convert to paise (smallest unit)
      currency: 'INR',
      // Razorpay rejects receipts longer than 40 chars — keep id tail + base36 time
      receipt: `rcpt_${String(bookingId).slice(-15)}_${Date.now().toString(36)}`,
      payment_capture: 1, // Auto capture payment
      notes: {
        customerId: customerId,
        bookingId: bookingId,
        description: 'My Salon Bookings Payment',
      },
    };

    const order = await razorpayInstance.orders.create(options);

    console.log(`✅ Razorpay Order Created: ${order.id}`);

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
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured',
      };
    }

    // Create the string to be signed
    const body = `${orderId}|${paymentId}`;

    // Generate HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Compare signatures
    const isValid = expectedSignature === signature;

    console.log(isValid ? '✅ Payment signature verified' : '❌ Invalid payment signature');

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
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured',
      };
    }

    console.log(`📊 Fetching payment details for: ${paymentId}`);

    const payment = await razorpayInstance.payments.fetch(paymentId);

    console.log(`✅ Payment details retrieved`);

    return {
      success: true,
      paymentId: payment.id,
      amount: payment.amount / 100, // Convert back to rupees
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      description: payment.description,
      notes: payment.notes,
      createdAt: new Date(payment.created_at * 1000),
      vpa: payment.vpa, // For UPI payments
      card: payment.card_id, // For card payments
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
// INITIATE REFUND
// ===================================================
const initiateRefund = async (paymentId, amount = null) => {
  try {
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured',
      };
    }

    console.log(`💰 Initiating refund for payment: ${paymentId}`);

    const refundOptions = {};

    // If amount is provided, refund only that amount (partial refund)
    // Otherwise, refund full amount
    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
      console.log(`   (Partial refund: ₹${amount})`);
    }

    const refund = await razorpayInstance.payments.refund(paymentId, refundOptions);

    console.log(`✅ Refund initiated: ${refund.id}`);

    return {
      success: true,
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount / 100, // Convert back to rupees
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
// GET REFUND DETAILS
// ===================================================
const getRefundDetails = async (refundId) => {
  try {
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured',
      };
    }

    console.log(`📊 Fetching refund details: ${refundId}`);

    const refund = await razorpayInstance.refunds.fetch(refundId);

    console.log(`✅ Refund details retrieved`);

    return {
      success: true,
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount / 100,
      status: refund.status,
      notes: refund.notes,
      createdAt: new Date(refund.created_at * 1000),
    };
  } catch (error) {
    console.error('❌ Error fetching refund details:', error.message);
    throw {
      success: false,
      message: 'Failed to fetch refund details',
      error: error.message,
    };
  }
};

// ===================================================
// GET ALL PAYMENTS
// ===================================================
const getPayments = async (options = {}) => {
  try {
    if (!razorpayInstance) {
      return {
        success: false,
        message: 'Razorpay is not configured',
      };
    }

    console.log(`📊 Fetching payments...`);

    // Default options
    const queryOptions = {
      count: options.limit || 10,
      skip: options.skip || 0,
      ...options,
    };

    const payments = await razorpayInstance.payments.all(queryOptions);

    console.log(`✅ Retrieved ${payments.items.length} payments`);

    return {
      success: true,
      count: payments.count,
      items: payments.items.map((payment) => ({
        paymentId: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: new Date(payment.created_at * 1000),
      })),
    };
  } catch (error) {
    console.error('❌ Error fetching payments:', error.message);
    throw {
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    };
  }
};

// ===================================================
// TEST RAZORPAY CONNECTION
// ===================================================
const testRazorpayConnection = async () => {
  try {
    if (!razorpayInstance) {
      console.log('⏳ Razorpay: Not configured (credentials missing)');
      console.log('   To enable: Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
      return false;
    }

    // Test connection by fetching account details
    const payments = await razorpayInstance.payments.all({ count: 1 });
    console.log('✅ Razorpay Connected Successfully');
    return true;
  } catch (error) {
    console.error('❌ Razorpay Connection Failed:', error.message);
    console.error('   Make sure your API keys are correct in .env');
    return false;
  }
};

module.exports = {
  razorpayInstance,
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  initiateRefund,
  getRefundDetails,
  getPayments,
  testRazorpayConnection,
};
