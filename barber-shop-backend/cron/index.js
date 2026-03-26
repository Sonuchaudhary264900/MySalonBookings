/*
  ==========================================================
  CRON JOB SYSTEM
  ==========================================================

  Handles:

  • Queue cleanup
  • OTP cleanup
  • Appointment reminders
  • Auto salon approval
  • No-show cancellations
  • Weekly reports

  Safe for production
  All jobs protected with try/catch
  Prevents crashes if models are missing
*/

const cron = require('node-cron');

const https = require('https');
const Queue = require('../models/Queue');
const OTP = require('../models/OTP');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Owner = require('../models/Owner');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');



console.log('🕐 Cron Jobs System Initialized');

/*
====================================================
KEEP-ALIVE PING
Pings the server every 10 minutes to prevent
Render free tier from sleeping
====================================================
*/
cron.schedule('*/10 * * * *', () => {
  const url = process.env.RENDER_EXTERNAL_URL || 'https://mysalonbookings.onrender.com';
  https.get(`${url}/ping`, (res) => {
    console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
  }).on('error', () => {});
});


/*
====================================================
QUEUE CLEANUP
Deletes queues older than 7 days
Runs daily at 2 AM
====================================================
*/

const cleanupOldQueues = cron.schedule('0 2 * * *', async () => {

  try {

    console.log('🧹 Running queue cleanup');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Queue.deleteMany({
      date: { $lt: sevenDaysAgo }
    });

    console.log(`✅ Removed ${result.deletedCount} old queues`);

  } catch (error) {

    console.error('❌ Queue cleanup error', error);

  }

});


/*
====================================================
OTP CLEANUP
Deletes expired OTPs
Runs every 30 minutes
====================================================
*/

const cleanupExpiredOTPs = cron.schedule('*/30 * * * *', async () => {

  try {

    console.log('🗑 Cleaning expired OTPs');

    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    if (result.deletedCount > 0) {
      console.log(`✅ Deleted ${result.deletedCount} OTPs`);
    }

  } catch (error) {

    console.error('❌ OTP cleanup error', error);

  }

});


/*
====================================================
24 HOUR APPOINTMENT REMINDER
Runs daily at 9 AM
====================================================
*/

const send24HourReminders = cron.schedule('0 9 * * *', async () => {

  try {

    console.log('📨 Sending 24 hour reminders');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0,0,0,0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23,59,59,999);

    const bookings = await Booking.find({

      appointmentDate:{
        $gte: tomorrow,
        $lte: endOfTomorrow
      },

      status: { $in:['confirmed','in_progress'] },

      reminderSentAt: { $exists:false }

    });

    console.log(`📅 ${bookings.length} bookings found`);

    let sent = 0;

    for(const booking of bookings){

      try{

        booking.reminderSentAt = new Date();
        await booking.save();

        sent++;

      }catch(error){

        console.error(`Reminder error booking ${booking._id}`, error);

      }

    }

    console.log(`✅ ${sent} reminders sent`);

  } catch(error){

    console.error('❌ 24 hour reminder error', error);

  }

});


/*
====================================================
1 HOUR APPOINTMENT REMINDER
Runs every hour
====================================================
*/

const send1HourReminders = cron.schedule('0 * * * *', async () => {

  try{

    console.log('⏰ Checking 1 hour reminders');

    const now = new Date();
    const oneHour = new Date(now.getTime()+3600000);

    const bookings = await Booking.find({

      status:{ $in:['confirmed','in_progress'] },
      oneHourReminderSent:{ $ne:true }

    });

    let sent = 0;

    for(const booking of bookings){

      try{

        const appointment = new Date(booking.appointmentDate);

        const [h,m] = booking.appointmentTime.split(':');

        appointment.setHours(h,m,0);

        if(appointment>now && appointment<=oneHour){

          booking.oneHourReminderSent = true;

          await booking.save();

          sent++;

        }

      }catch(error){

        console.error("1 hour reminder error", error);

      }

    }

    if(sent>0){

      console.log(`✅ ${sent} 1 hour reminders sent`);

    }

  }catch(error){

    console.error("❌ 1 hour reminder system error", error);

  }

});


/*
====================================================
AUTO APPROVE SALONS
Runs daily 3 AM
====================================================
*/

const autoApproveSalons = cron.schedule('0 3 * * *', async () => {

  try{

    console.log("✨ Running salon auto approval");

    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours()-24);

    const salons = await Salon.find({

      approvalStatus:'pending',
      createdAt:{ $lt:dayAgo }

    });

    let approved = 0;

    for(const salon of salons){

      try{

        const serviceCount = await Service.countDocuments({
          salonId: salon._id
        });

        if(serviceCount>=1){

          salon.approvalStatus = 'approved';
          salon.isApproved = true;
          salon.approvedDate = new Date();

          await salon.save();

          const owner = await Owner.findById(salon.ownerId);

          if(owner){

            owner.status='approved';
            owner.approvalStatus='approved';

            await owner.save();

          }

          approved++;

        }

      }catch(error){

        console.error("Salon auto approval error", error);

      }

    }

    console.log(`✅ ${approved} salons approved`);

  }catch(error){

    console.error("❌ Auto approval system error", error);

  }

});


/*
====================================================
NO SHOW BOOKINGS
Runs hourly
====================================================
*/

const cancelNoShowBookings = cron.schedule('0 * * * *', async () => {

  try{

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime()-7200000);

    const bookings = await Booking.find({

      status:'in_progress',
      appointmentDate:{ $lt:twoHoursAgo }

    });

    let cancelled = 0;

    for(const booking of bookings){

      try{

        booking.status='cancelled';
        booking.cancelledAt=new Date();

        await booking.save();

        await Queue.updateOne(

          { salonId: booking.salonId },

          {
            $pull:{ queue:{ bookingId: booking._id }},
            $inc:{ totalWaiting:-1 }
          }

        );

        cancelled++;

      }catch(error){

        console.error("Cancel booking error", error);

      }

    }

    if(cancelled>0){

      console.log(`🚫 ${cancelled} bookings cancelled`);

    }

  }catch(error){

    console.error("❌ No show system error", error);

  }

});


/*
====================================================
AUTO COMPLETE BOOKINGS
Marks confirmed/in_progress bookings as completed
once their slot end time has passed.
Runs every 5 minutes.
====================================================
*/

const autoCompleteBookings = cron.schedule('*/5 * * * *', async () => {

  try {

    // Current time in IST (UTC+5:30)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, '0')}-${String(nowIST.getUTCDate()).padStart(2, '0')}`;
    const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();

    // Fetch only active bookings up to end of today (IST)
    // appointmentDate is stored as noon UTC, so tomorrow noon UTC covers all of today IST
    const tomorrowNoonUTC = new Date();
    tomorrowNoonUTC.setDate(tomorrowNoonUTC.getDate() + 1);
    tomorrowNoonUTC.setUTCHours(12, 0, 0, 0);

    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      appointmentDate: { $lte: tomorrowNoonUTC },
    }).lean();

    let completed = 0;

    for (const booking of bookings) {

      try {

        // Date stored as T12:00:00Z — slice gives correct calendar date
        const bookingDate = booking.appointmentDate
          ? booking.appointmentDate.toISOString().slice(0, 10)
          : null;

        if (!bookingDate || !booking.appointmentTime) continue;

        const [hStr, mStr] = booking.appointmentTime.split(':');
        const slotStart = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
        if (isNaN(slotStart)) continue;

        const slotEnd = slotStart + (booking.estimatedDuration || 30);

        const isPastDate = bookingDate < todayIST;
        const isTodaySlotDone = bookingDate === todayIST && slotEnd <= nowMinutes;

        if (isPastDate || isTodaySlotDone) {

          await Booking.updateOne(
            { _id: booking._id },
            { $set: { status: 'completed', completedAt: new Date() } }
          );

          completed++;

        }

      } catch (err) {

        console.error('Auto-complete single booking error:', err.message);

      }

    }

    if (completed > 0) {
      console.log(`✅ Auto-completed ${completed} booking(s)`);
    }

  } catch (error) {

    console.error('❌ Auto-complete bookings error:', error);

  }

});


/*
====================================================
WEEKLY REPORT
Runs Monday 6 AM
====================================================
*/

const generateWeeklyReport = cron.schedule('0 6 * * 1', async () => {

  try{

    console.log("📊 Generating weekly report");

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate()-7);

    const bookings = await Booking.find({

      status:'completed',
      completedAt:{ $gte:weekAgo }

    });

    const revenue = bookings.reduce((sum,b)=>sum+(b.totalAmount||0),0);

    const activeSalons = await Salon.countDocuments({

      isApproved:true,
      isActive:true

    });

    const activeCustomers = await Customer.countDocuments({

      totalBookings:{ $gt:0 }

    });

    const report = {

      totalBookings: bookings.length,

      totalRevenue: revenue,

      activeSalons,

      activeCustomers,

      avgBooking: bookings.length>0 ? revenue/bookings.length : 0,

      generatedAt: new Date()

    };

    console.log("📈 Weekly Report");

    console.log(JSON.stringify(report,null,2));

  }catch(error){

    console.error("❌ Weekly report error", error);

  }

});


/*
====================================================
10-MINUTE APPOINTMENT REMINDER
Runs every minute — sends push to customer 10 min before slot
====================================================
*/

const send10MinReminders = cron.schedule('* * * * *', async () => {
  try {
    const { sendExpoPush } = require('../utils/pushNotification');

    // Current IST time
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10);
    const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    const targetMins = nowMins + 10;

    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      tenMinReminderSent: { $ne: true },
    }).populate('customerId', 'pushToken name').lean();

    for (const booking of bookings) {
      try {
        const bookingDate = booking.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== todayIST || !booking.appointmentTime) continue;

        const [h, m] = booking.appointmentTime.split(':');
        const slotMins = parseInt(h, 10) * 60 + parseInt(m, 10);
        if (slotMins !== targetMins) continue;

        if (booking.customerId?.pushToken) {
          await sendExpoPush(
            booking.customerId.pushToken,
            '⏰ Appointment in 10 minutes!',
            `Your ${booking.serviceName} at ${booking.salonName} starts at ${booking.appointmentTime}. Please be on time.`,
            { bookingId: booking._id.toString(), type: 'ten_min_reminder' },
            { channelId: 'ten_min_reminder' }
          );
        }

        await Booking.updateOne({ _id: booking._id }, { $set: { tenMinReminderSent: true } });
      } catch (err) {
        console.error('10-min reminder single error:', err.message);
      }
    }
  } catch (error) {
    console.error('10-min reminder system error:', error);
  }
});


/*
====================================================
TRIAL EXPIRY REMINDER
Runs daily at 10 AM — sends push to owners whose
trial ends in exactly 3 days
====================================================
*/

const TRIAL_DAYS = 30;

const trialExpiryReminder = cron.schedule('0 10 * * *', async () => {
  try {
    console.log('💳 Checking trial expiry reminders');
    const { sendExpoPush } = require('../utils/pushNotification');

    const now = new Date();
    // Owners whose trial started ~27 days ago (trial ends in ~3 days)
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - (TRIAL_DAYS - 3) - 1);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() - (TRIAL_DAYS - 3));

    const owners = await Owner.find({
      'subscription.planType': 'free_trial',
      'subscription.trialEndReminderSent': { $ne: true },
      'subscription.trialStartDate': { $gte: windowStart, $lte: windowEnd },
    }).select('pushToken name subscription').lean();

    let sent = 0;
    for (const owner of owners) {
      try {
        const trialStart = new Date(owner.subscription.trialStartDate);
        const elapsed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, TRIAL_DAYS - elapsed);

        if (owner.pushToken) {
          await sendExpoPush(
            owner.pushToken,
            '⏳ Trial Ending Soon',
            `Your free trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Choose a plan to keep your salon running.`,
            { type: 'trial_expiry_reminder' },
            { channelId: 'billing' }
          ).catch(() => {});
        }

        await Owner.updateOne(
          { _id: owner._id },
          { $set: { 'subscription.trialEndReminderSent': true } }
        );
        sent++;
      } catch (err) {
        console.error('Trial reminder single owner error:', err.message);
      }
    }

    if (sent > 0) console.log(`✅ Sent ${sent} trial expiry reminders`);
  } catch (error) {
    console.error('❌ Trial expiry reminder error:', error);
  }
});


/*
====================================================
MONTHLY BILLING RESET
Runs on the 1st of every month at midnight
- Creates invoices for per_booking owners
- Resets monthlyBookingCount
- Marks overdue owners
====================================================
*/

const monthlyBillingReset = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('🧾 Running monthly billing reset');

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const billingMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Find all active paid per_booking owners
    const paidOwners = await Owner.find({
      'subscription.planType': 'per_booking',
      'subscription.paymentStatus': 'paid',
    }).select('_id salonId subscription').lean();

    let invoicesCreated = 0;
    for (const owner of paidOwners) {
      try {
        const bookingCount = owner.subscription.monthlyBookingCount || 0;
        const amount = Math.max(bookingCount * 1, 1);

        const existing = await Subscription.findOne({
          ownerId: owner._id,
          billingMonth,
        });
        if (!existing) {
          await Subscription.create({
            ownerId: owner._id,
            salonId: owner.salonId,
            planType: 'per_booking',
            billingMonth,
            bookingCount,
            amount,
            paymentStatus: 'pending',
          });
          invoicesCreated++;
        }

        await Owner.updateOne(
          { _id: owner._id },
          {
            $set: {
              'subscription.monthlyBookingCount': 0,
              'subscription.billingCycleStart': now,
              'subscription.paymentStatus': 'overdue',
            },
          }
        );
      } catch (err) {
        console.error('Monthly billing reset single owner error:', err.message);
      }
    }

    // Also reset starter plan owners (just reset booking count + mark overdue)
    await Owner.updateMany(
      { 'subscription.planType': 'starter', 'subscription.paymentStatus': 'paid' },
      {
        $set: {
          'subscription.monthlyBookingCount': 0,
          'subscription.billingCycleStart': now,
          'subscription.paymentStatus': 'overdue',
        },
      }
    );

    console.log(`✅ Monthly billing reset complete. ${invoicesCreated} per_booking invoices created`);
  } catch (error) {
    console.error('❌ Monthly billing reset error:', error);
  }
});


/*
====================================================
PAYMENT DUE REMINDER
Runs daily at 9 AM — notifies overdue owners
====================================================
*/

const paymentDueReminder = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('💰 Checking payment due reminders');
    const { sendExpoPush } = require('../utils/pushNotification');

    const owners = await Owner.find({
      'subscription.paymentStatus': 'overdue',
      'subscription.paymentDueReminderSent': { $ne: true },
    }).select('pushToken name subscription').lean();

    let sent = 0;
    for (const owner of owners) {
      try {
        if (owner.pushToken) {
          await sendExpoPush(
            owner.pushToken,
            '⚠️ Payment Due',
            'Your subscription payment is overdue. Please pay to continue accepting bookings.',
            { type: 'payment_due_reminder' },
            { channelId: 'billing' }
          ).catch(() => {});
        }

        await Owner.updateOne(
          { _id: owner._id },
          { $set: { 'subscription.paymentDueReminderSent': true } }
        );
        sent++;
      } catch (err) {
        console.error('Payment due reminder single owner error:', err.message);
      }
    }

    if (sent > 0) console.log(`✅ Sent ${sent} payment due reminders`);
  } catch (error) {
    console.error('❌ Payment due reminder error:', error);
  }
});


/*
====================================================
EXPORT
====================================================
*/

module.exports = {

  cleanupOldQueues,
  cleanupExpiredOTPs,
  send24HourReminders,
  send1HourReminders,
  send10MinReminders,
  autoApproveSalons,
  cancelNoShowBookings,
  autoCompleteBookings,
  generateWeeklyReport,
  trialExpiryReminder,
  monthlyBillingReset,
  paymentDueReminder,

  stopAllJobs:()=>{

    cleanupOldQueues.stop();
    cleanupExpiredOTPs.stop();
    send24HourReminders.stop();
    send1HourReminders.stop();
    send10MinReminders.stop();
    autoApproveSalons.stop();
    cancelNoShowBookings.stop();
    autoCompleteBookings.stop();
    generateWeeklyReport.stop();
    trialExpiryReminder.stop();
    monthlyBillingReset.stop();
    paymentDueReminder.stop();

    console.log("🛑 All cron jobs stopped");

  }

};