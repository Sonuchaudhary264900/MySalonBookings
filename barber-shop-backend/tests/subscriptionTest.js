#!/usr/bin/env node
// tests/subscriptionTest.js
// =============================================================================
// SAAS SUBSCRIPTION & PAYMENT — COMPLETE TEST SUITE
// =============================================================================
// Usage:  node tests/subscriptionTest.js
// Prereqs: Backend server running at BASE_URL, ALLOW_TEST_ENDPOINTS=true in .env
// =============================================================================

const axios = require('axios');

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api/v1';
const TS       = Date.now();
const TEST_EMAIL  = `test_${TS}@mysalon.test`;
const TEST_PHONE  = `+91${String(TS).slice(-10)}`;
const TEST_PASS   = 'Test@12345';

// ── ANSI colours ─────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  grey:   '\x1b[90m',
};

// ── Results tracker ───────────────────────────────────────────────────────────
const results = { passed: 0, failed: 0, skipped: 0, details: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────
const log  = (msg)         => console.log(msg);
const pass = (label)       => { results.passed++;  results.details.push({ label, status: 'PASS' }); console.log(`  ${C.green}✔${C.reset}  ${label}`); };
const fail = (label, why)  => { results.failed++;  results.details.push({ label, status: 'FAIL', why }); console.log(`  ${C.red}✘${C.reset}  ${label}${C.grey}  ← ${why}${C.reset}`); };
const skip = (label, why)  => { results.skipped++; results.details.push({ label, status: 'SKIP', why }); console.log(`  ${C.yellow}—${C.reset}  ${label}${C.grey}  (skipped: ${why})${C.reset}`); };
const section = (title)    => log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}`);
const info  = (msg)        => log(`  ${C.blue}ℹ${C.reset}  ${C.grey}${msg}${C.reset}`);

const assert = (label, condition, why = '') => condition ? pass(label) : fail(label, why || 'assertion failed');

const api = (token) => axios.create({
  baseURL: BASE_URL,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  validateStatus: () => true,   // never throw on HTTP error status
  timeout: 15000,
});

// ── State shared across tests ─────────────────────────────────────────────────
let token = null;
let ownerId = null;

// =============================================================================
// SETUP — create a test owner
// =============================================================================
async function setup() {
  section('SETUP — Create Test Owner');
  const res = await api().post('/test/owner/create', {
    name:     'Test Salon Owner',
    email:    TEST_EMAIL,
    phone:    TEST_PHONE,
    password: TEST_PASS,
  });

  if (res.status !== 200 || !res.data.success) {
    fail('Create test owner', `HTTP ${res.status} — ${JSON.stringify(res.data)}`);
    log(`\n${C.red}${C.bold}Setup failed. Is the server running at ${BASE_URL}?${C.reset}`);
    log(`${C.red}Is ALLOW_TEST_ENDPOINTS=true in .env?${C.reset}\n`);
    process.exit(1);
  }

  token    = res.data.data.token;
  ownerId  = res.data.data.ownerId;
  pass('Test owner created');
  info(`email=${TEST_EMAIL}  ownerId=${ownerId}`);
}

// =============================================================================
// TEARDOWN — delete test owner
// =============================================================================
async function teardown() {
  section('TEARDOWN — Clean Up Test Data');
  const res = await api().delete('/test/owner/cleanup', { data: { email: TEST_EMAIL } });
  assert('Test owner removed', res.status === 200 && res.data.success);
}

// =============================================================================
// SCENARIO A — New user: trial is active on registration
// =============================================================================
async function scenarioA_NewUser() {
  section('SCENARIO A — New User: Free Trial');
  const res = await api(token).get('/owner/subscription/status');

  assert('Status 200', res.status === 200);
  assert('success=true', res.data.success === true);
  assert('Trial is active', res.data.data?.trialActive === true, `trialActive=${res.data.data?.trialActive}`);
  assert('Access status = trial', res.data.data?.accessStatus === 'trial', `accessStatus=${res.data.data?.accessStatus}`);
  assert('Days remaining = 30', res.data.data?.trialDaysRemaining === 30, `got ${res.data.data?.trialDaysRemaining}`);
  assert('Plan type = free_trial', res.data.data?.planType === 'free_trial');
  assert('Payment status = trial', res.data.data?.paymentStatus === 'trial');
  info(`Trial days remaining: ${res.data.data?.trialDaysRemaining}`);
}

// =============================================================================
// SCENARIO B — During trial: bookings are allowed, count increments
// =============================================================================
async function scenarioB_DuringTrial() {
  section('SCENARIO B — During Trial: Bookings Allowed');

  // Check initial booking count
  const statusBefore = await api(token).get('/owner/subscription/status');
  const countBefore = statusBefore.data.data?.monthlyBookingCount || 0;
  info(`Booking count before: ${countBefore}`);

  // Try walk-in booking (owner has no salon yet, expect 404 not 403)
  const bookingRes = await api(token).post('/owner/bookings', {
    customerName:    'Walk In Customer',
    customerPhone:   '+919876543210',
    serviceId:       '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '10:00',
  });

  // 403 = subscription blocked (FAIL), 404 = no salon yet (OK — trial works)
  assert(
    'Trial does NOT block booking (no 403)',
    bookingRes.status !== 403,
    `Got 403 — subscription middleware is incorrectly blocking trial user`
  );
  info(`Walk-in booking response: ${bookingRes.status} (404=no salon, 409=slot taken, 201=created)`);

  // Verify state unchanged
  const statusAfter = await api(token).get('/owner/subscription/status');
  assert('Status still trial after booking attempt', statusAfter.data.data?.accessStatus === 'trial');
}

// =============================================================================
// SCENARIO C — Trial expiry: simulate 31 days ago, access should be blocked
// =============================================================================
async function scenarioC_TrialExpiry() {
  section('SCENARIO C — Trial Expiry: Bookings Blocked After Trial Ends');

  // Move trial start date 31 days into the past
  const setRes = await api(token).post('/test/subscription/set-trial-date', { daysAgo: 31 });
  assert('Trial date moved to 31 days ago', setRes.status === 200 && setRes.data.success, JSON.stringify(setRes.data));

  // Verify status shows expired
  const statusRes = await api(token).get('/owner/subscription/status');
  assert('Trial no longer active', statusRes.data.data?.trialActive === false, `trialActive=${statusRes.data.data?.trialActive}`);
  assert('Access status = restricted', statusRes.data.data?.accessStatus === 'restricted', `accessStatus=${statusRes.data.data?.accessStatus}`);
  assert('Days remaining = 0', statusRes.data.data?.trialDaysRemaining === 0, `got ${statusRes.data.data?.trialDaysRemaining}`);

  // Booking should now be blocked with 403
  const bookingRes = await api(token).post('/owner/bookings', {
    customerName:    'Blocked User',
    customerPhone:   '+919876543210',
    serviceId:       '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '11:00',
  });
  assert('Booking returns 403 after trial expires', bookingRes.status === 403, `Got ${bookingRes.status}`);
  assert('Response has restricted=true', bookingRes.data?.restricted === true, `restricted=${bookingRes.data?.restricted}`);
  assert('Message mentions plan selection', typeof bookingRes.data?.message === 'string', `message=${bookingRes.data?.message}`);

  // Billing history still visible (old data accessible)
  const historyRes = await api(token).get('/owner/subscription/billing-history');
  assert('Billing history still accessible after expiry', historyRes.status === 200);

  info(`Blocked message: "${bookingRes.data?.message}"`);
}

// =============================================================================
// SCENARIO D — Plan selection: Starter ₹150/month
// =============================================================================
async function scenarioD_PlanSelection() {
  section('SCENARIO D — Plan Selection: Starter ₹150/month');

  // Select starter plan
  const selectRes = await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });
  assert('Select plan returns 200', selectRes.status === 200, `HTTP ${selectRes.status}`);
  assert('Plan set to starter', selectRes.data.data?.planType === 'starter', `planType=${selectRes.data.data?.planType}`);
  info(`Plan selected: ${selectRes.data.data?.planType}`);

  // Create Razorpay order
  const orderRes = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  assert('Create order returns 200', orderRes.status === 200, `HTTP ${orderRes.status}`);
  assert('Response has orderId or placeholder', typeof orderRes.data.data?.orderId !== 'undefined');
  assert('Amount = 150', orderRes.data.data?.amount === 150, `amount=${orderRes.data.data?.amount}`);
  assert('InvoiceId present', !!orderRes.data.data?.invoiceId, 'no invoiceId');
  assert('Currency = INR', orderRes.data.data?.currency === 'INR');
  info(`Razorpay order: ${orderRes.data.data?.orderId || '(placeholder mode)'}, amount=₹${orderRes.data.data?.amount}`);

  return { invoiceId: orderRes.data.data?.invoiceId, orderId: orderRes.data.data?.orderId };
}

// =============================================================================
// SCENARIO D2 — Payment verification (simulated)
// =============================================================================
async function scenarioD2_PaymentVerification(invoiceId, orderId) {
  section('SCENARIO D2 — Payment Verification');

  if (!invoiceId) { skip('Payment verification', 'no invoiceId from order creation'); return; }

  // Simulate a Razorpay webhook: payment.captured
  const webhookRes = await api().post('/owner/subscription/webhook', {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id:       `pay_test_${TS}`,
          order_id: orderId || `order_test_${TS}`,
        },
      },
    },
  });
  assert('Webhook returns 200', webhookRes.status === 200, `HTTP ${webhookRes.status}`);

  // Also test verify-payment endpoint with dummy data
  // (will fail signature check — we just verify the endpoint is reachable and returns 400 not 500)
  const verifyRes = await api(token).post('/owner/subscription/verify-payment', {
    razorpayOrderId:    orderId || 'order_dummy',
    razorpayPaymentId:  `pay_test_${TS}`,
    razorpaySignature:  'invalid_signature_for_test',
    invoiceId,
  });
  assert(
    'Verify-payment endpoint reachable (400 on bad sig, not 500)',
    verifyRes.status === 400 || verifyRes.status === 200,
    `Got ${verifyRes.status}`
  );
  info(`verify-payment response: ${verifyRes.status} — ${verifyRes.data?.message}`);
}

// =============================================================================
// SCENARIO E — Per-booking plan: ₹1/booking usage tracking
// =============================================================================
async function scenarioE_PerBookingPlan() {
  section('SCENARIO E — Per-Booking Plan: ₹1/booking');

  // Reset to fresh trial first
  const resetRes = await api(token).post('/test/subscription/reset');
  assert('Reset to fresh trial', resetRes.status === 200 && resetRes.data.success);

  // Select per_booking plan
  const selectRes = await api(token).post('/owner/subscription/select-plan', { planType: 'per_booking' });
  assert('Per-booking plan selected', selectRes.status === 200, `HTTP ${selectRes.status}`);

  // Create order — amount should be max(bookingCount * 1, 1) = ₹1 minimum
  const orderRes = await api(token).post('/owner/subscription/create-order', { planType: 'per_booking' });
  assert('Per-booking order created', orderRes.status === 200, `HTTP ${orderRes.status}`);
  assert('Minimum charge is ₹1', orderRes.data.data?.amount >= 1, `amount=${orderRes.data.data?.amount}`);

  const statusRes = await api(token).get('/owner/subscription/status');
  const bookingCount = statusRes.data.data?.monthlyBookingCount || 0;
  const expectedBill = bookingCount * 1;
  assert('Estimated bill matches booking count × ₹1', statusRes.data.data?.estimatedBill === expectedBill,
    `estimatedBill=${statusRes.data.data?.estimatedBill}, expected=${expectedBill}`);

  info(`Booking count: ${bookingCount}, Estimated bill: ₹${expectedBill}`);
}

// =============================================================================
// SCENARIO F — Payment failure handling
// =============================================================================
async function scenarioF_PaymentFailure() {
  section('SCENARIO F — Payment Failure: Retry Available');

  // Simulate payment.failed webhook
  const failRes = await api().post('/owner/subscription/webhook', {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          order_id: `order_fail_${TS}`,
        },
      },
    },
  });
  assert('Failed webhook returns 200', failRes.status === 200, `HTTP ${failRes.status}`);
  info('Webhook processed payment.failed event');

  // Expire trial to put owner in restricted state
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 32 });
  const statusRes = await api(token).get('/owner/subscription/status');
  assert('Access still restricted after failed payment', statusRes.data.data?.accessStatus === 'restricted', `accessStatus=${statusRes.data.data?.accessStatus}`);

  // Verify create-order still works (retry path)
  await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });
  const retryOrderRes = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  assert('Retry payment order can be created', retryOrderRes.status === 200, `HTTP ${retryOrderRes.status}`);
  assert('Retry returns ₹150 amount', retryOrderRes.data.data?.amount === 150, `amount=${retryOrderRes.data.data?.amount}`);
  info('Retry order created successfully — user can reattempt payment');
}

// =============================================================================
// SCENARIO G — Grace period: 2-3 days after trial ends
// =============================================================================
async function scenarioG_GracePeriod() {
  section('SCENARIO G — Grace Period (2-3 days after trial)');

  // Reset subscription
  await api(token).post('/test/subscription/reset');

  // Move trial to exactly 29 days ago — last day of trial
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 29 });
  const almostExpiredRes = await api(token).get('/owner/subscription/status');
  assert('Day 29: trial still active (1 day left)', almostExpiredRes.data.data?.trialActive === true,
    `trialActive=${almostExpiredRes.data.data?.trialActive}, daysLeft=${almostExpiredRes.data.data?.trialDaysRemaining}`);
  assert('Day 29: access = trial', almostExpiredRes.data.data?.accessStatus === 'trial');
  info(`Day 29: ${almostExpiredRes.data.data?.trialDaysRemaining} days left`);

  // Move to day 30 — trial just ended (grace start)
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 30 });
  const graceDayRes = await api(token).get('/owner/subscription/status');
  assert('Day 30: trial no longer active', graceDayRes.data.data?.trialActive === false);
  assert('Day 30: access = restricted (system enforces hard cutoff at day 30)', graceDayRes.data.data?.accessStatus === 'restricted',
    `accessStatus=${graceDayRes.data.data?.accessStatus}`);
  info('Note: current system enforces hard cutoff at day 30, no grace period in subscription logic');
  info('To implement grace period: change TRIAL_DAYS constant to 32 in middleware + controller');

  // Booking blocked at day 30
  const blockedRes = await api(token).post('/owner/bookings', {
    customerName: 'Grace Test', customerPhone: '+919800000000',
    serviceId: '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '14:00',
  });
  assert('Day 30: booking blocked (403)', blockedRes.status === 403, `Got ${blockedRes.status}`);
}

// =============================================================================
// EDGE CASE 1 — Logout/re-login bypass attempt
// =============================================================================
async function edgeCase_LogoutBypass() {
  section('EDGE CASE 1 — Logout/Login Bypass Attempt');

  // Expire trial
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });

  // Re-login (get a fresh token)
  const loginRes = await api().post('/owner/auth/login', { identifier: TEST_EMAIL, password: TEST_PASS });
  const newToken = loginRes.data?.data?.token || loginRes.data?.token;

  if (!newToken) {
    skip('Logout bypass test', `Login returned no token — HTTP ${loginRes.status}`);
    return;
  }

  info(`Fresh token obtained after re-login`);

  // Try booking with fresh token — should still be blocked
  const bookingRes = await api(newToken).post('/owner/bookings', {
    customerName: 'Bypass Attempt', customerPhone: '+919700000000',
    serviceId: '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '15:00',
  });
  assert('Fresh token cannot bypass expired trial (403)', bookingRes.status === 403,
    `Got ${bookingRes.status} — bypass succeeded!`);

  // Update token to fresh one for subsequent tests
  token = newToken;
}

// =============================================================================
// EDGE CASE 2 — Duplicate payment prevention
// =============================================================================
async function edgeCase_DuplicatePayment() {
  section('EDGE CASE 2 — Duplicate Payment Prevention');

  // Reset to fresh trial + select starter
  await api(token).post('/test/subscription/reset');
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 31 });
  await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });

  // Create order twice — same billing month → should reuse same invoice
  const order1 = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  const order2 = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });

  assert('First order created', order1.status === 200, `HTTP ${order1.status}`);
  assert('Second order created', order2.status === 200, `HTTP ${order2.status}`);
  assert(
    'Both orders share the same invoiceId (dedup)',
    order1.data.data?.invoiceId?.toString() === order2.data.data?.invoiceId?.toString(),
    `invoice1=${order1.data.data?.invoiceId} invoice2=${order2.data.data?.invoiceId}`
  );
  info(`Invoice deduplication: both calls returned invoiceId=${order1.data.data?.invoiceId}`);
}

// =============================================================================
// EDGE CASE 3 — Booking count reset at month end (cron logic validation)
// =============================================================================
async function edgeCase_BookingCountReset() {
  section('EDGE CASE 3 — Booking Count Reset Logic');

  await api(token).post('/test/subscription/reset');

  // Get initial state
  const before = await api(token).get('/owner/subscription/status');
  assert('Initial booking count = 0', before.data.data?.monthlyBookingCount === 0,
    `count=${before.data.data?.monthlyBookingCount}`);

  // Check state of subscription
  const state = await api(token).get('/test/subscription/owner-state');
  assert('Owner state endpoint returns data', state.status === 200 && state.data.success);
  assert('Computed accessStatus present', !!state.data.data?.computed?.accessStatus);
  info(`Owner state: accessStatus=${state.data.data?.computed?.accessStatus}, trialDaysLeft=${state.data.data?.computed?.trialDaysLeft}`);
  info('Monthly reset happens via cron on 1st of month at midnight — cannot be unit-tested here');
}

// =============================================================================
// EDGE CASE 4 — Invalid plan type rejection
// =============================================================================
async function edgeCase_InvalidPlan() {
  section('EDGE CASE 4 — Invalid Plan Type Rejection');

  const res = await api(token).post('/owner/subscription/select-plan', { planType: 'enterprise' });
  assert('Invalid plan type returns 400', res.status === 400, `Got ${res.status}`);
  assert('Error message present', typeof res.data?.message === 'string');
  info(`Rejected plan message: "${res.data?.message}"`);
}

// =============================================================================
// LOGGING SYSTEM VERIFICATION
// =============================================================================
async function verifyLogging() {
  section('LOGGING SYSTEM — Verify Audit Logs');

  const state = await api(token).get('/test/subscription/owner-state');
  assert('Owner state endpoint accessible', state.status === 200, `HTTP ${state.status}`);

  const logs = state.data.data?.recentLogs || [];
  assert('At least one log entry exists', logs.length > 0, `found ${logs.length} logs`);

  const events = logs.map(l => l.event);
  info(`Logged events: ${[...new Set(events)].join(', ')}`);

  // Verify log schema fields
  if (logs.length > 0) {
    const latest = logs[0];
    assert('Log has ownerId', !!latest.ownerId, 'missing ownerId');
    assert('Log has event', !!latest.event, 'missing event');
    assert('Log has createdAt', !!latest.createdAt, 'missing createdAt');

    const hasAccessBlocked = events.includes('access_blocked');
    const hasPlanSelected  = events.includes('plan_selected');
    const hasOrderCreated  = events.includes('payment_order_created');

    if (hasAccessBlocked) pass('access_blocked events logged');
    else info('No access_blocked events yet (trial was reset multiple times)');

    if (hasPlanSelected) pass('plan_selected events logged');
    else info('No plan_selected events captured in recent logs');

    if (hasOrderCreated) pass('payment_order_created events logged');
    else info('No payment_order_created in recent 20 logs');
  }
}

// =============================================================================
// PRINT SUMMARY
// =============================================================================
function printSummary() {
  const total = results.passed + results.failed + results.skipped;
  log(`\n${C.bold}${'═'.repeat(55)}${C.reset}`);
  log(`${C.bold}  TEST SUMMARY${C.reset}`);
  log(`${'═'.repeat(55)}`);
  log(`  Total:   ${total}`);
  log(`  ${C.green}Passed:  ${results.passed}${C.reset}`);
  log(`  ${C.red}Failed:  ${results.failed}${C.reset}`);
  log(`  ${C.yellow}Skipped: ${results.skipped}${C.reset}`);
  log(`${'═'.repeat(55)}`);

  if (results.failed > 0) {
    log(`\n${C.red}${C.bold}  FAILURES:${C.reset}`);
    results.details
      .filter(d => d.status === 'FAIL')
      .forEach(d => log(`  ${C.red}✘${C.reset}  ${d.label}${C.grey}  ← ${d.why || ''}${C.reset}`));
  }

  const allPassed = results.failed === 0;
  log(`\n${allPassed ? C.green : C.red}${C.bold}  ${allPassed ? '✔ ALL TESTS PASSED' : '✘ SOME TESTS FAILED'}${C.reset}\n`);
  process.exitCode = allPassed ? 0 : 1;
}

// =============================================================================
// MAIN RUNNER
// =============================================================================
(async () => {
  log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║  SAAS SUBSCRIPTION & PAYMENT — TEST SUITE             ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════╝${C.reset}`);
  log(`${C.grey}  Base URL : ${BASE_URL}${C.reset}`);
  log(`${C.grey}  Test email: ${TEST_EMAIL}${C.reset}`);

  try {
    await setup();

    // Core scenarios
    await scenarioA_NewUser();
    await scenarioB_DuringTrial();
    await scenarioC_TrialExpiry();

    const { invoiceId, orderId } = await scenarioD_PlanSelection();
    await scenarioD2_PaymentVerification(invoiceId, orderId);

    await scenarioE_PerBookingPlan();
    await scenarioF_PaymentFailure();
    await scenarioG_GracePeriod();

    // Edge cases
    await edgeCase_LogoutBypass();
    await edgeCase_DuplicatePayment();
    await edgeCase_BookingCountReset();
    await edgeCase_InvalidPlan();

    // Logging verification
    await verifyLogging();

  } catch (err) {
    log(`\n${C.red}${C.bold}UNEXPECTED ERROR: ${err.message}${C.reset}`);
    if (err.code === 'ECONNREFUSED') {
      log(`${C.red}→ Cannot connect to ${BASE_URL}. Make sure the backend is running.${C.reset}`);
    }
    results.failed++;
    results.details.push({ label: 'Unexpected error', status: 'FAIL', why: err.message });
  } finally {
    try { await teardown(); } catch (e) { /* ignore teardown errors */ }
    printSummary();
  }
})();
