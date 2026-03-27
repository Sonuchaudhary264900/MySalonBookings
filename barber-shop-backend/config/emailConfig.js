// config/emailConfig.js
/*
  Gmail SMTP Configuration
  For sending emails (OTP, confirmations, reminders, etc)
  Setup: https://myaccount.google.com/apppasswords
  
  Steps to enable Gmail SMTP:
  1. Enable 2FA on your Google account
  2. Create an App Password at https://myaccount.google.com/apppasswords
  3. Use the app password in GMAIL_APP_PASSWORD in .env
*/

const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // App password (not regular password)
  },
});

// Test email configuration
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP Connected Successfully');
    console.log(`📧 Email will be sent from: ${process.env.GMAIL_USER}`);
    return true;
  } catch (error) {
    console.error('❌ Gmail SMTP Connection Failed:', error.message);
    console.error('Make sure:');
    console.error('1. 2FA is enabled on your Gmail account');
    console.error('2. App password is created and correct in .env');
    console.error('3. GMAIL_USER and GMAIL_APP_PASSWORD are set in .env');
    return false;
  }
};

// Generic email sending function
const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || 'Email sent from My Salon Bookings',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error.message);
    throw error;
  }
};

// Send OTP email
const sendOTPEmail = async (to, otp, userType) => {
  const subject = 'Your OTP for My Salon Bookings';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
        <h1>My Salon Bookings</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2>Verify Your ${userType === 'owner' ? 'Business' : 'Account'}</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="background-color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="color: #4CAF50; letter-spacing: 5px; font-size: 24px;">${otp}</h3>
        </div>
        <p style="color: #666;">This OTP is valid for 10 minutes only.</p>
        <p style="color: #666;">Do not share this OTP with anyone.</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>If you didn't request this OTP, please ignore this email.</p>
        <p>&copy; 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.</p>
      </div>
    </div>
  `;

  const textContent = `Your OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  
  return await sendEmail(to, subject, htmlContent, textContent);
};

// Send booking confirmation email
const sendBookingConfirmationEmail = async (to, bookingDetails) => {
  const subject = 'Booking Confirmation - My Salon Bookings';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
        <h1>Booking Confirmed ✓</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2>Your Appointment Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold;">Salon:</td>
            <td style="padding: 10px;">${bookingDetails.salonName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold;">Service:</td>
            <td style="padding: 10px;">${bookingDetails.serviceName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold;">Date & Time:</td>
            <td style="padding: 10px;">${bookingDetails.appointmentDate} at ${bookingDetails.appointmentTime}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold;">Price:</td>
            <td style="padding: 10px;">₹${bookingDetails.amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Booking ID:</td>
            <td style="padding: 10px;">${bookingDetails.bookingId}</td>
          </tr>
        </table>
        <p style="color: #666; margin-top: 20px;">You will receive a reminder 10 minutes before your appointment.</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>&copy; 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(to, subject, htmlContent);
};

// Send appointment reminder email
const sendReminderEmail = async (to, bookingDetails) => {
  const subject = 'Appointment Reminder - My Salon Bookings';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center;">
        <h1>Appointment Reminder ⏰</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>Your appointment is coming up soon!</p>
        <h3>${bookingDetails.salonName}</h3>
        <p>📍 ${bookingDetails.address}</p>
        <p>🕒 Your appointment is at <strong>${bookingDetails.appointmentTime}</strong></p>
        <p style="color: #FF9800; font-weight: bold;">Please arrive on time</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>&copy; 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(to, subject, htmlContent);
};

// Send salon approval email (to owner)
const sendSalonApprovalEmail = async (to, salonName) => {
  const subject = 'Salon Approved - Welcome to My Salon Bookings';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
        <h1>Congratulations! ✓</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>Your salon <strong>"${salonName}"</strong> has been approved!</p>
        <p>You can now:</p>
        <ul>
          <li>Add services and pricing</li>
          <li>Manage your staff</li>
          <li>Accept bookings from customers</li>
          <li>Track your earnings</li>
        </ul>
        <p>Log in to your dashboard to get started.</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>&copy; 2026 My Salon Bookings by Gigamind Technology Pvt Ltd. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail(to, subject, htmlContent);
};

module.exports = {
  transporter,
  testEmailConnection,
  sendEmail,
  sendOTPEmail,
  sendBookingConfirmationEmail,
  sendReminderEmail,
  sendSalonApprovalEmail,
};
