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
const Business = require('../models/Business');
const Service = require('../models/Service');
const Owner = require('../models/Owner');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const HairstyleInteraction = require('../models/HairstyleInteraction');
const HairstyleCatalog     = require('../models/HairstyleCatalog');



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
Runs daily at 9 AM IST (3:30 AM UTC)
Sends push to customer 24h before appointment
====================================================
*/

const send24HourReminders = cron.schedule('30 3 * * *', async () => {

  try {
    console.log('📨 Sending 24 hour reminders');
    const { sendExpoPush } = require('../utils/pushNotification');

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    // Target: bookings on tomorrow (IST)
    const tomorrowIST = new Date(nowIST);
    tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
    const tomorrowStr = tomorrowIST.toISOString().slice(0, 10);

    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      reminderSentAt: { $exists: false },
    }).populate('customerId', 'pushToken name').lean();

    let sent = 0;

    for (const booking of bookings) {
      try {
        const bookingDate = booking.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== tomorrowStr) continue;

        const token = booking.customerId?.pushToken;
        if (token) {
          await sendExpoPush(
            token,
            '📅 Appointment Tomorrow',
            `Reminder: ${booking.serviceName || 'your appointment'} at ${booking.salonName} tomorrow at ${booking.appointmentTime}.`,
            { bookingId: booking._id.toString(), type: '24h_reminder' },
            { channelId: 'reminders' }
          ).catch(() => {});
        }

        await Booking.updateOne({ _id: booking._id }, { $set: { reminderSentAt: new Date() } });
        sent++;

      } catch (error) {
        console.error(`Reminder error booking ${booking._id}`, error);
      }
    }

    console.log(`✅ ${sent} 24h reminders sent`);

  } catch (error) {
    console.error('❌ 24 hour reminder error', error);
  }

});


/*
====================================================
1 HOUR APPOINTMENT REMINDER
Runs every 5 minutes — sends push 55-65 min before slot
====================================================
*/

const send1HourReminders = cron.schedule('*/5 * * * *', async () => {

  try {
    const { sendExpoPush } = require('../utils/pushNotification');

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10);
    const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    // Window: 55–65 minutes ahead
    const windowStart = nowMins + 55;
    const windowEnd   = nowMins + 65;

    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      'remindersSent.oneHour': { $ne: true },
    }).populate('customerId', 'pushToken name').lean();

    let sent = 0;

    for (const booking of bookings) {
      try {
        const bookingDate = booking.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== todayIST || !booking.appointmentTime) continue;

        const [h, m] = booking.appointmentTime.split(':');
        const slotMins = parseInt(h, 10) * 60 + parseInt(m, 10);
        if (slotMins < windowStart || slotMins > windowEnd) continue;

        const token = booking.customerId?.pushToken;
        if (token) {
          await sendExpoPush(
            token,
            '⏰ Appointment in 1 hour!',
            `Your ${booking.serviceName || 'appointment'} at ${booking.salonName} is at ${booking.appointmentTime}. Get ready!`,
            { bookingId: booking._id.toString(), type: '1h_reminder' },
            { channelId: 'reminders' }
          ).catch(() => {});
        }

        await Booking.updateOne({ _id: booking._id }, { $set: { 'remindersSent.oneHour': true } });
        sent++;

      } catch (error) {
        console.error('1 hour reminder error', error);
      }
    }

    if (sent > 0) console.log(`✅ ${sent} 1h reminders sent`);

  } catch (error) {
    console.error('❌ 1 hour reminder system error', error);
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

    const salons = await Business.find({

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

    const activeSalons = await Business.countDocuments({

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
30-MINUTE APPOINTMENT REMINDER
Runs every 5 minutes — sends push to customer 25-35 min before slot
Also alerts the owner that a customer is arriving soon
====================================================
*/

const send30MinReminders = cron.schedule('*/5 * * * *', async () => {
  try {
    const { sendExpoPush } = require('../utils/pushNotification');

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10);
    const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    const windowStart = nowMins + 25;
    const windowEnd   = nowMins + 35;

    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      'remindersSent.thirtyMin': { $ne: true },
    }).populate('customerId', 'pushToken name').lean();

    let sent = 0;

    for (const booking of bookings) {
      try {
        const bookingDate = booking.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== todayIST || !booking.appointmentTime) continue;

        const [h, m] = booking.appointmentTime.split(':');
        const slotMins = parseInt(h, 10) * 60 + parseInt(m, 10);
        if (slotMins < windowStart || slotMins > windowEnd) continue;

        // Push to customer
        const customerToken = booking.customerId?.pushToken;
        if (customerToken) {
          await sendExpoPush(
            customerToken,
            '🚶 Head over now!',
            `Your ${booking.serviceName || 'appointment'} at ${booking.salonName} starts in 30 minutes at ${booking.appointmentTime}.`,
            { bookingId: booking._id.toString(), type: '30min_reminder' },
            { channelId: 'reminders' }
          ).catch(() => {});
        }

        // Push to owner — upcoming customer alert
        const owner = await Owner.findOne({ businessId: booking.salonId }).select('pushToken').lean();
        if (owner?.pushToken) {
          await sendExpoPush(
            owner.pushToken,
            '📋 Customer arriving in 30 min',
            `${booking.customerName || 'A customer'} is booked for ${booking.serviceName || 'a service'} at ${booking.appointmentTime}.`,
            { bookingId: booking._id.toString(), type: 'owner_upcoming_alert' },
            { channelId: 'bookings' }
          ).catch(() => {});
        }

        await Booking.updateOne({ _id: booking._id }, { $set: { 'remindersSent.thirtyMin': true } });
        sent++;

      } catch (error) {
        console.error('30-min reminder single error:', error.message);
      }
    }

    if (sent > 0) console.log(`✅ ${sent} 30-min reminders sent`);

  } catch (error) {
    console.error('❌ 30-min reminder system error:', error);
  }
});


/*
====================================================
OWNER DAILY SUMMARY
Runs daily at 10 PM IST (4:30 PM UTC)
Sends each active owner a summary of today's bookings
====================================================
*/

const ownerDailySummary = cron.schedule('30 16 * * *', async () => {
  try {
    console.log('📊 Sending owner daily summaries');
    const { sendExpoPush } = require('../utils/pushNotification');

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStr = nowIST.toISOString().slice(0, 10);
    const dayStart = new Date(todayStr + 'T00:00:00.000Z');
    const dayEnd   = new Date(todayStr + 'T23:59:59.999Z');

    // Get all salons with at least one booking today
    const todaysBookings = await Booking.aggregate([
      {
        $match: {
          appointmentDate: { $gte: dayStart, $lte: dayEnd },
          status: { $in: ['pending', 'confirmed', 'in_progress', 'completed'] },
        },
      },
      {
        $group: {
          _id: '$salonId',
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          revenue:   { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } },
        },
      },
    ]);

    let sent = 0;
    for (const row of todaysBookings) {
      try {
        const owner = await Owner.findOne({ businessId: row._id }).select('pushToken name').lean();
        if (!owner?.pushToken) continue;

        await sendExpoPush(
          owner.pushToken,
          '📊 Today\'s Summary',
          `${row.total} bookings today — ${row.completed} completed, ₹${row.revenue || 0} earned. See you tomorrow!`,
          { type: 'daily_summary', salonId: row._id.toString() },
          { channelId: 'analytics' }
        ).catch(() => {});

        sent++;
      } catch (err) {
        console.error('Daily summary single owner error:', err.message);
      }
    }

    if (sent > 0) console.log(`✅ ${sent} daily summaries sent`);

  } catch (error) {
    console.error('❌ Daily summary error:', error);
  }
});


/*
====================================================
10-MINUTE APPOINTMENT REMINDER
Runs every minute — sends push to customer 10 min before slot
====================================================
*/

const send10MinReminders = cron.schedule('*/5 * * * *', async () => {
  try {
    const { sendExpoPush } = require('../utils/pushNotification');

    // Current IST time
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10);
    const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    // Window: 8–13 minutes ahead (covers 5-min polling gap)
    const windowStart = nowMins + 8;
    const windowEnd = nowMins + 13;

    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      'remindersSent.tenMin': { $ne: true },
    }).populate('customerId', 'pushToken name').lean();

    for (const booking of bookings) {
      try {
        const bookingDate = booking.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== todayIST || !booking.appointmentTime) continue;

        const [h, m] = booking.appointmentTime.split(':');
        const slotMins = parseInt(h, 10) * 60 + parseInt(m, 10);
        if (slotMins < windowStart || slotMins > windowEnd) continue;

        if (booking.customerId?.pushToken) {
          await sendExpoPush(
            booking.customerId.pushToken,
            '⏰ Appointment in 10 minutes!',
            `Your ${booking.serviceName} at ${booking.salonName} starts at ${booking.appointmentTime}. Please be on time.`,
            { bookingId: booking._id.toString(), type: 'ten_min_reminder' },
            { channelId: 'ten_min_reminder' }
          );
        }

        await Booking.updateOne({ _id: booking._id }, { $set: { 'remindersSent.tenMin': true } });
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
    }).select('_id businessId subscription').lean();

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
            salonId: owner.businessId,
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
          'subscription.billingCycleEndDate': new Date(now.getTime() + 30 * 86400000),
          'subscription.paymentStatus': 'overdue',
        },
      }
    );

    // ── Apply scheduled plan changes ─────────────────────────
    // Owners who requested a plan switch last cycle get their new plan applied now.
    const { logSubscriptionEvent } = require('../utils/subscriptionLogger');
    const changeOwners = await Owner.find({
      'subscription.planChangeRequested': true,
    }).select('_id businessId subscription').lean();

    let planSwitches = 0;
    for (const owner of changeOwners) {
      try {
        const newPlan = owner.subscription.nextPlan;
        if (!newPlan) continue;

        const cycleEnd = new Date(now.getTime() + 30 * 86400000);
        await Owner.updateOne(
          { _id: owner._id },
          {
            $set: {
              'subscription.planType':              newPlan,
              'subscription.nextPlan':              null,
              'subscription.planChangeRequested':   false,
              'subscription.planChangeRequestedAt': null,
              'subscription.billingCycleStart':     now,
              'subscription.billingCycleEndDate':   cycleEnd,
              'subscription.monthlyBookingCount':   0,
              'subscription.paymentStatus':         'overdue',
              'subscription.paymentDueReminderSent': false,
            },
          }
        );

        logSubscriptionEvent('plan_selected', owner, {
          planType: newPlan,
          meta: {
            mode:         'scheduled_switch_applied',
            previousPlan: owner.subscription.planType,
            appliedAt:    now,
          },
        });

        planSwitches++;
      } catch (err) {
        console.error('Plan switch apply error:', err.message);
      }
    }

    console.log(`✅ Monthly billing reset complete. ${invoicesCreated} per_booking invoices, ${planSwitches} plan switches applied`);
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
FIX 6 — UNASSIGNED BOOKING ESCALATION
Runs every 15 minutes — pushes owner if a booking is
unassigned within 60 minutes of the appointment time.
====================================================
*/
const unassignedEscalation = cron.schedule('*/15 * * * *', async () => {
  try {
    const { sendExpoPush } = require('../utils/pushNotification');
    const nowIST    = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST  = nowIST.toISOString().slice(0, 10);
    const nowMins   = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    const window60  = nowMins + 60;

    const bookings = await Booking.find({
      barberId: null,
      status: { $in: ['pending', 'confirmed'] },
    }).lean();

    for (const bk of bookings) {
      try {
        const bookingDate = bk.appointmentDate?.toISOString().slice(0, 10);
        if (bookingDate !== todayIST || !bk.appointmentTime) continue;
        const [h, m] = bk.appointmentTime.split(':').map(Number);
        const slotMins = h * 60 + m;
        if (slotMins > window60 || slotMins < nowMins) continue;

        const salon = await Business.findById(bk.salonId).select('ownerId').lean();
        if (!salon) continue;
        const owner = await Owner.findById(salon.ownerId).select('pushToken').lean();
        if (!owner?.pushToken) continue;

        await sendExpoPush(
          owner.pushToken,
          'Unassigned Booking Alert',
          `Booking at ${bk.appointmentTime} for ${bk.customerName || 'a customer'} has no assigned staff. Assign now!`,
          { bookingId: bk._id.toString(), type: 'unassigned_escalation' },
          { channelId: 'bookings' }
        ).catch(() => {});
      } catch (err) {
        console.error('Unassigned escalation single error:', err.message);
      }
    }
  } catch (err) {
    console.error('Unassigned escalation cron error:', err.message);
  }
});


/*
====================================================
FIX 8 — LATE → NO-SHOW ESCALATION
Runs every 5 minutes — escalates bookings marked late
more than 30 minutes ago to no-show if still not started.
====================================================
*/
const lateToNoShowEscalation = cron.schedule('*/5 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const lateBookings = await Booking.find({
      lateMarkedAt: { $lt: cutoff },
      status: { $in: ['pending', 'confirmed'] },
    }).lean();

    for (const bk of lateBookings) {
      try {
        await Booking.updateOne(
          { _id: bk._id },
          { $set: { status: 'no_show', noShowMarkedAt: new Date() } }
        );
        if (bk.customerId) {
          const Customer = require('../models/Customer');
          const cust = await Customer.findById(bk.customerId);
          if (cust) {
            cust.noShowCount = (cust.noShowCount || 0) + 1;
            if (cust.noShowCount >= 3 && !cust.isBanned) {
              cust.isBanned  = true;
              cust.banReason = 'Auto-banned: 3 or more no-shows';
              cust.bannedAt  = new Date();
            }
            await cust.save();
          }
        }
      } catch (err) {
        console.error('Late→no-show single error:', err.message);
      }
    }
  } catch (err) {
    console.error('Late→no-show escalation error:', err.message);
  }
});


/*
====================================================
CHAT CLEANUP — delete messages for completed/cancelled bookings
Runs every hour. Deletes messages for bookings that finished
more than 1 hour ago, so the chat stays live briefly after completion.
====================================================
*/

const cleanupChatMessages = cron.schedule('0 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    // Find booking IDs that are completed/cancelled before cutoff
    const closedBookings = await Booking.find({
      status: { $in: ['completed', 'cancelled'] },
      updatedAt: { $lt: cutoff },
    }).select('_id').lean();

    if (closedBookings.length === 0) return;

    const bookingIds = closedBookings.map(b => b._id);
    const result = await Message.deleteMany({ bookingId: { $in: bookingIds } });

    if (result.deletedCount > 0) {
      console.log(`🗑️  Deleted ${result.deletedCount} chat messages for ${closedBookings.length} closed bookings`);
    }
  } catch (err) {
    console.error('Chat cleanup cron error:', err.message);
  }
});

/*
====================================================
EXPORT
====================================================
*/

/* ====================================================
   BIRTHDAY CAMPAIGN — daily at 10:00 AM IST
   Sends a birthday push + optional coupon to customers
==================================================== */
const birthdayCampaign = cron.schedule('30 4 * * *', async () => {
  // 4:30 UTC = 10:00 IST
  try {
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();

    const now    = new Date();
    const month  = now.getMonth() + 1;
    const day    = now.getDate();

    // Customers whose birthday is today (any year)
    const customers = await Customer.find({
      dateOfBirth: { $exists: true, $ne: null },
      expoPushToken: { $exists: true, $ne: null },
    }).lean();

    const birthdayCustomers = customers.filter((c) => {
      const dob = new Date(c.dateOfBirth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    const messages = birthdayCustomers
      .filter((c) => Expo.isExpoPushToken(c.expoPushToken))
      .map((c) => ({
        to:    c.expoPushToken,
        title: `Happy Birthday, ${c.name?.split(' ')[0] || 'there'}! 🎂`,
        body:  'Treat yourself today — your favourite salon has a special offer waiting for you.',
        data:  { type: 'birthday' },
      }));

    if (messages.length) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk).catch(() => {});
      }
      console.log(`🎂 Birthday campaigns sent: ${messages.length}`);
    }
  } catch (err) {
    console.error('Birthday campaign cron error:', err.message);
  }
});

/* ====================================================
   RE-ENGAGEMENT CAMPAIGN — every Sunday at 11:00 AM IST
   Targets customers who haven't visited in 30+ days
==================================================== */
const reEngagementCampaign = cron.schedule('30 5 * * 0', async () => {
  // 5:30 UTC Sunday = 11:00 IST Sunday
  try {
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveCustomers = await Customer.find({
      lastVisitAt:   { $lt: thirtyDaysAgo },
      expoPushToken: { $exists: true, $ne: null },
      deletedAt:     null,
    }).limit(500).lean();

    const messages = inactiveCustomers
      .filter((c) => Expo.isExpoPushToken(c.expoPushToken))
      .map((c) => ({
        to:    c.expoPushToken,
        title: `We miss you, ${c.name?.split(' ')[0] || 'there'}!`,
        body:  "It's been a while — book your next appointment and look your best.",
        data:  { type: 're-engagement' },
      }));

    if (messages.length) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk).catch(() => {});
      }
      console.log(`💌 Re-engagement campaigns sent: ${messages.length}`);
    }
  } catch (err) {
    console.error('Re-engagement campaign cron error:', err.message);
  }
});

/* ====================================================
   HARD-DELETE SOFT-DELETED RECORDS — daily at 2:00 AM
   Permanently removes records deleted 30+ days ago
==================================================== */
const hardDeleteExpired = cron.schedule('0 2 * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const Service  = require('../models/Service');
    const Coupon   = require('../models/Coupon');
    const BookingM = require('../models/Booking');

    const [b, s, c, cu] = await Promise.all([
      BookingM.deleteMany({ deletedAt: { $lt: cutoff } }),
      Service.deleteMany({ deletedAt: { $lt: cutoff } }),
      Customer.deleteMany({ deletedAt: { $lt: cutoff } }),
      Coupon.deleteMany({ deletedAt: { $lt: cutoff } }),
    ]);
    const total = b.deletedCount + s.deletedCount + c.deletedCount + cu.deletedCount;
    if (total > 0) console.log(`🗑️ Hard-deleted ${total} expired soft-deleted records`);
  } catch (err) {
    console.error('Hard-delete cron error:', err.message);
  }
});

/*
====================================================
STYLEAI — MONTHLY IMPRESSION CLEANUP
Deletes high-volume impression events older than 90 days.
Other event types (save, book_cta, converted_booking, outcome_*, manual_override)
are kept permanently for ML training and attribution — NO TTL index on the collection.
Runs: 1st of every month at 3:00 AM
====================================================
*/
const cleanupOldImpressions = cron.schedule('0 3 1 * *', async () => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const result = await HairstyleInteraction.deleteMany({
      event_type: 'impression',
      createdAt:  { $lt: ninetyDaysAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`StyleAI: deleted ${result.deletedCount} old impression events`);
    }
  } catch (err) {
    console.error('StyleAI impression cleanup cron error:', err.message);
  }
});

/*
====================================================
STYLEAI — WEEKLY TRENDING SCORE DECAY
Decays trendingScore by 30% each week to prevent old styles from
dominating trending forever. Styles with no recent interactions fade out.
Runs: Every Sunday at 2:30 AM
====================================================
*/
const decayTrendingScores = cron.schedule('30 2 * * 0', async () => {
  try {
    const result = await HairstyleCatalog.updateMany(
      { trendingScore: { $gt: 0 } },
      [{ $set: { trendingScore: { $floor: { $multiply: ['$trendingScore', 0.7] } } } }]
    );
    // Reset trending flag on styles whose score dropped to 0
    await HairstyleCatalog.updateMany(
      { trendingScore: 0, trending: true },
      { $set: { trending: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`StyleAI: decayed trendingScore on ${result.modifiedCount} styles`);
    }
  } catch (err) {
    console.error('StyleAI trending decay cron error:', err.message);
  }
});

module.exports = {

  cleanupOldQueues,
  cleanupExpiredOTPs,
  send24HourReminders,
  send1HourReminders,
  send30MinReminders,
  send10MinReminders,
  ownerDailySummary,
  autoApproveSalons,
  cancelNoShowBookings,
  autoCompleteBookings,
  generateWeeklyReport,
  trialExpiryReminder,
  monthlyBillingReset,
  paymentDueReminder,
  cleanupChatMessages,
  unassignedEscalation,
  lateToNoShowEscalation,
  birthdayCampaign,
  reEngagementCampaign,
  hardDeleteExpired,
  cleanupOldImpressions,
  decayTrendingScores,

  stopAllJobs: () => {

    cleanupOldQueues.stop();
    cleanupExpiredOTPs.stop();
    send24HourReminders.stop();
    send1HourReminders.stop();
    send30MinReminders.stop();
    send10MinReminders.stop();
    ownerDailySummary.stop();
    autoApproveSalons.stop();
    cancelNoShowBookings.stop();
    autoCompleteBookings.stop();
    generateWeeklyReport.stop();
    trialExpiryReminder.stop();
    monthlyBillingReset.stop();
    paymentDueReminder.stop();
    cleanupChatMessages.stop();
    unassignedEscalation.stop();
    lateToNoShowEscalation.stop();
    birthdayCampaign.stop();
    reEngagementCampaign.stop();
    hardDeleteExpired.stop();
    cleanupOldImpressions.stop();
    decayTrendingScores.stop();

    console.log("🛑 All cron jobs stopped");

  }

};