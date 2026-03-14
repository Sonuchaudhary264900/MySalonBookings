// config/twilio.js

/**
 * Twilio Configuration
 * Handles SMS, OTP, notifications for salon platform
 */

const twilio = require("twilio");

let twilioClient = null;

// ===================================================
// INITIALIZE TWILIO
// ===================================================
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log("✅ Twilio Initialized");
  } else {
    console.log("⏳ Twilio credentials missing - running in placeholder mode");
  }
} catch (error) {
  console.error("❌ Twilio initialization failed:", error.message);
}

// ===================================================
// FORMAT PHONE NUMBER
// Converts phone numbers to international format
// Example:
// 9876543210 → +919876543210
// +919876543210 → +919876543210
// ===================================================
const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  return null;
};

// ===================================================
// VALIDATE PHONE NUMBER
// ===================================================
const validatePhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone);

  if (!formatted) return false;

  const phoneRegex = /^\+\d{10,15}$/;

  return phoneRegex.test(formatted);
};

// ===================================================
// SEND SMS
// ===================================================
const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone) {
      throw new Error("Invalid phone number format");
    }

    if (!twilioClient) {
      console.log(`📱 SMS PLACEHOLDER`);
      console.log(`   To: ${formattedPhone}`);
      console.log(`   Message: ${message}`);

      return {
        success: true,
        mode: "placeholder",
        phone: formattedPhone,
        sid: "SM_PLACEHOLDER_" + Date.now(),
      };
    }

    console.log(`📱 Sending SMS to ${formattedPhone}`);

    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`✅ SMS sent successfully`);
    console.log(`   SID: ${response.sid}`);
    console.log(`   Status: ${response.status}`);

    return {
      success: true,
      phone: formattedPhone,
      message,
      sid: response.sid,
      status: response.status,
      dateCreated: response.dateCreated,
      dateSent: response.dateSent,
    };
  } catch (error) {
    console.error(`❌ SMS failed:`, error.message);

    return {
      success: false,
      phone,
      message: "Failed to send SMS",
      error: error.message,
    };
  }
};

// ===================================================
// SEND OTP
// ===================================================
const sendOTP = async (phone, otp) => {
  const message = `Your OTP for Smart Salon is: ${otp}

This OTP is valid for 10 minutes.
Do not share it with anyone.`;

  return sendSMS(phone, message);
};

// ===================================================
// BOOKING CONFIRMATION
// ===================================================
const sendBookingConfirmation = async (phone, booking) => {
  const message = `✅ Booking Confirmed

Salon: ${booking.salonName}
Service: ${booking.serviceName}
Date: ${booking.appointmentDate}
Time: ${booking.appointmentTime}

Booking ID: ${booking.bookingId}

Thank you for choosing us!`;

  return sendSMS(phone, message);
};

// ===================================================
// REMINDER
// ===================================================
const sendReminder = async (phone, appointmentTime, salonName, salonPhone) => {
  const message = `⏰ Appointment Reminder

Your appointment at ${salonName}
Time: ${appointmentTime}

Need help? Call: ${salonPhone}`;

  return sendSMS(phone, message);
};

// ===================================================
// QUEUE UPDATE
// ===================================================
const sendQueueUpdate = async (phone, position, waitTime, salonName) => {
  const message = `📍 Queue Update - ${salonName}

Position: #${position}
Estimated Wait: ${waitTime} minutes

Please stay nearby.`;

  return sendSMS(phone, message);
};

// ===================================================
// YOU ARE NEXT
// ===================================================
const sendYouAreNextNotification = async (phone, salonName, salonPhone) => {
  const message = `🎯 You're Next!

Please proceed to ${salonName}.

Contact: ${salonPhone}`;

  return sendSMS(phone, message);
};

// ===================================================
// SERVICE COMPLETED
// ===================================================
const sendServiceCompletedNotification = async (phone, booking) => {
  const message = `✅ Service Completed

Salon: ${booking.salonName}
Service: ${booking.serviceName}
Amount: ₹${booking.amount}

Thank you for visiting!`;

  return sendSMS(phone, message);
};

// ===================================================
// SALON APPROVAL
// ===================================================
const sendSalonApprovalNotification = async (phone, salonName) => {
  const message = `🎉 Congratulations!

Your salon "${salonName}" has been approved.

You can now start accepting bookings.

Login to your dashboard to begin.`;

  return sendSMS(phone, message);
};

// ===================================================
// SALON REJECTION
// ===================================================
const sendSalonRejectionNotification = async (phone, salonName, reason) => {
  const message = `⚠️ Salon Application Update

Salon: ${salonName}

Status: Changes Required

Reason:
${reason}

Please update your details and resubmit.`;

  return sendSMS(phone, message);
};

// ===================================================
// MESSAGE STATUS
// ===================================================
const getMessageStatus = async (sid) => {
  try {
    if (!twilioClient) {
      return {
        success: false,
        message: "Twilio not configured",
      };
    }

    const message = await twilioClient.messages(sid).fetch();

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ===================================================
// TEST CONNECTION
// ===================================================
const testTwilioConnection = async () => {
  try {
    if (!twilioClient) {
      console.log("⏳ Twilio not configured");
      return false;
    }

    const account = await twilioClient.api.accounts(
      process.env.TWILIO_ACCOUNT_SID
    ).fetch();

    console.log("✅ Twilio Connected");
    console.log(`Account: ${account.friendlyName}`);

    return true;
  } catch (error) {
    console.error("❌ Twilio connection failed:", error.message);
    return false;
  }
};

module.exports = {
  twilioClient,
  sendSMS,
  sendOTP,
  sendBookingConfirmation,
  sendReminder,
  sendQueueUpdate,
  sendYouAreNextNotification,
  sendServiceCompletedNotification,
  sendSalonApprovalNotification,
  sendSalonRejectionNotification,
  getMessageStatus,
  testTwilioConnection,
  validatePhoneNumber,
  formatPhoneNumber,
};