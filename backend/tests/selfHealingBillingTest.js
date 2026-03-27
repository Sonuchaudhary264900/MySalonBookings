#!/usr/bin/env node
/**
 * tests/selfHealingBillingTest.js
 *
 * Self-Testing + Self-Correcting System for SaaS Billing & Payment Logic
 * =====================================================================
 *
 * Modes:
 *   node tests/selfHealingBillingTest.js                    → test only, print diagnosis
 *   node tests/selfHealingBillingTest.js --fix              → test + auto-patch source files
 *   node tests/selfHealingBillingTest.js --fix --loops 3    → patch + re-verify up to 3 cycles
 *   node tests/selfHealingBillingTest.js --no-teardown      → keep test owner after run
 *
 * Prerequisites:
 *   • Backend running at BASE_URL (default http://localhost:5000/api/v1)
 *   • ALLOW_TEST_ENDPOINTS=true in backend .env
 *
 * Reports saved to: tests/reports/billing-{timestamp}.json
 */

'use strict';

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const ARGS        = new Set(process.argv.slice(2));
const FIX_MODE    = ARGS.has('--fix');
const NO_TEARDOWN = ARGS.has('--no-teardown');
const MAX_LOOPS   = (() => {
  const i = process.argv.indexOf('--loops');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) || 2 : 1;
})();

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL   = process.env.TEST_BASE_URL || 'http://localhost:5000/api/v1';
const TS         = Date.now();
const TEST_EMAIL = `test_${TS}@mysalon.test`;
const TEST_PHONE = `+91${String(TS).slice(-10)}`;
const TEST_PASS  = 'Test@12345';

// Paths to source files (relative to this file's directory)
const ROOT   = path.resolve(__dirname, '..');
const SRC    = {
  middleware:  path.join(ROOT, 'middleware', 'subscriptionMiddleware.js'),
  controller:  path.join(ROOT, 'controllers', 'payment', 'subscriptionController.js'),
  routes:      path.join(ROOT, 'routes', 'index.js'),
  cron:        path.join(ROOT, 'cron', 'index.js'),
};

// ─── ANSI colours ─────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',  bold:    '\x1b[1m',  dim:    '\x1b[2m',
  green:   '\x1b[32m', red:     '\x1b[31m', yellow: '\x1b[33m',
  cyan:    '\x1b[36m', blue:    '\x1b[34m', magenta:'\x1b[35m', grey: '\x1b[90m',
};

// ─── Logging helpers ──────────────────────────────────────────────────────────
const log      = (m)         => console.log(m);
const section  = (t)         => log(`\n${C.bold}${C.cyan}━━━ ${t} ━━━${C.reset}`);
const info     = (m)         => log(`  ${C.blue}ℹ${C.reset}  ${C.grey}${m}${C.reset}`);
const warn     = (m)         => log(`  ${C.yellow}⚠${C.reset}  ${C.yellow}${m}${C.reset}`);
const fix_log  = (m)         => log(`  ${C.magenta}🔧${C.reset}  ${C.magenta}${m}${C.reset}`);

// ─── Results tracking ─────────────────────────────────────────────────────────
let results = { passed: 0, failed: 0, skipped: 0, details: [] };

const resetResults = () => { results = { passed: 0, failed: 0, skipped: 0, details: [] }; };

const pass = (label) => {
  results.passed++;
  results.details.push({ label, status: 'PASS' });
  log(`  ${C.green}✔${C.reset}  ${label}`);
};
const fail = (label, why = '') => {
  results.failed++;
  results.details.push({ label, status: 'FAIL', why });
  log(`  ${C.red}✘${C.reset}  ${label}${C.grey}  ← ${why}${C.reset}`);
};
const skip = (label, why = '') => {
  results.skipped++;
  results.details.push({ label, status: 'SKIP', why });
  log(`  ${C.yellow}—${C.reset}  ${label}${C.grey}  (${why})${C.reset}`);
};
const assert = (label, ok, why = '') => ok ? pass(label) : fail(label, why || 'assertion failed');

// ─── HTTP client ──────────────────────────────────────────────────────────────
const api = (token) => axios.create({
  baseURL: BASE_URL,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  validateStatus: () => true,
  timeout: 15000,
});

// ─── Shared state ─────────────────────────────────────────────────────────────
let token   = null;
let ownerId = null;

// =============================================================================
//  SETUP / TEARDOWN
// =============================================================================
async function setup() {
  section('SETUP — Create Test Owner');
  const res = await api().post('/test/owner/create', {
    name: 'SelfHeal Test Owner', email: TEST_EMAIL, phone: TEST_PHONE, password: TEST_PASS,
  });
  if (res.status !== 200 || !res.data.success) {
    fail('Create test owner', `HTTP ${res.status} — ${JSON.stringify(res.data)}`);
    log(`\n${C.red}${C.bold}FATAL: Cannot create test owner.${C.reset}`);
    log(`${C.red}→ Is the server running at ${BASE_URL}?${C.reset}`);
    log(`${C.red}→ Is ALLOW_TEST_ENDPOINTS=true in .env?${C.reset}\n`);
    process.exit(1);
  }
  token   = res.data.data.token;
  ownerId = res.data.data.ownerId;
  pass('Test owner created');
  info(`email=${TEST_EMAIL}  ownerId=${ownerId}`);
}

async function teardown() {
  if (NO_TEARDOWN) { info('--no-teardown: skipping cleanup'); return; }
  section('TEARDOWN');
  const r = await api().delete('/test/owner/cleanup', { data: { email: TEST_EMAIL } });
  assert('Test owner cleaned up', r.status === 200 && r.data.success);
}

async function resetSub() {
  const r = await api(token).post('/test/subscription/reset');
  if (r.status !== 200) fail('reset subscription', `HTTP ${r.status}`);
  return r.data.success;
}

// =============================================================================
//  SCENARIO A — New user: trial active on registration
// =============================================================================
async function scenarioA_NewUser() {
  section('SCENARIO A — New User: Free Trial Activation');
  const r = await api(token).get('/owner/subscription/status');

  assert('GET /status returns 200',           r.status === 200);
  assert('trialActive = true',                r.data.data?.trialActive === true,          `got ${r.data.data?.trialActive}`);
  assert('accessStatus = trial',              r.data.data?.accessStatus === 'trial',       `got ${r.data.data?.accessStatus}`);
  assert('trialDaysRemaining = 30',           r.data.data?.trialDaysRemaining === 30,      `got ${r.data.data?.trialDaysRemaining}`);
  assert('planType = free_trial',             r.data.data?.planType === 'free_trial',      `got ${r.data.data?.planType}`);
  assert('paymentStatus = trial',             r.data.data?.paymentStatus === 'trial',      `got ${r.data.data?.paymentStatus}`);
  assert('monthlyBookingCount = 0',           r.data.data?.monthlyBookingCount === 0,      `got ${r.data.data?.monthlyBookingCount}`);
  assert('billingCycleStart = null (trial)',  r.data.data?.billingCycleStart === null,     `got ${r.data.data?.billingCycleStart}`);
}

// =============================================================================
//  SCENARIO B — Bookings allowed during trial; count increments
// =============================================================================
async function scenarioB_DuringTrial() {
  section('SCENARIO B — During Trial: Bookings Allowed');

  // Walk-in booking: no salon yet → expect 404, NOT 403
  const br = await api(token).post('/owner/bookings', {
    customerName: 'Trial Customer', customerPhone: '+919876543210',
    serviceId: '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10), appointmentTime: '10:00',
  });
  assert('Trial does NOT return 403',         br.status !== 403,   `Subscription blocked trial user — got 403`);
  assert('Trial does NOT return 401',         br.status !== 401,   `Auth failed unexpectedly`);
  info(`Walk-in response: HTTP ${br.status} (404=no salon is expected)`);

  // Manually set booking count → status should reflect it
  await api(token).post('/test/subscription/set-booking-count', { count: 5 });
  const sr = await api(token).get('/owner/subscription/status');
  assert('Booking count reflects manual set', sr.data.data?.monthlyBookingCount === 5, `got ${sr.data.data?.monthlyBookingCount}`);
  assert('estimatedBill = 0 during trial',    sr.data.data?.estimatedBill === 0,        `got ${sr.data.data?.estimatedBill}`);
  assert('accessStatus still = trial',        sr.data.data?.accessStatus === 'trial');

  // Reset count
  await api(token).post('/test/subscription/set-booking-count', { count: 0 });
}

// =============================================================================
//  SCENARIO C — Trial expiry: access blocked after day 30
// =============================================================================
async function scenarioC_TrialExpiry() {
  section('SCENARIO C — Trial Expiry: Access Blocked');

  // Move to day 29 — still active (boundary check)
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 29 });
  const d29 = await api(token).get('/owner/subscription/status');
  assert('Day 29: trialActive = true',        d29.data.data?.trialActive === true,   `got ${d29.data.data?.trialActive}`);
  assert('Day 29: daysRemaining = 1',         d29.data.data?.trialDaysRemaining === 1, `got ${d29.data.data?.trialDaysRemaining}`);

  // Move to day 30 — expired
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 30 });
  const d30 = await api(token).get('/owner/subscription/status');
  assert('Day 30: trialActive = false',       d30.data.data?.trialActive === false,  `got ${d30.data.data?.trialActive}`);
  assert('Day 30: daysRemaining = 0',         d30.data.data?.trialDaysRemaining === 0);
  assert('Day 30: accessStatus = restricted', d30.data.data?.accessStatus === 'restricted', `got ${d30.data.data?.accessStatus}`);

  // Booking attempt should return 403
  const br = await api(token).post('/owner/bookings', {
    customerName: 'Blocked', customerPhone: '+919800000001',
    serviceId: '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10), appointmentTime: '11:00',
  });
  assert('Expired trial: booking returns 403',    br.status === 403,            `got ${br.status}`);
  assert('Response has restricted=true',          br.data?.restricted === true, `restricted=${br.data?.restricted}`);
  assert('Response has a message string',         typeof br.data?.message === 'string');

  // Non-booking endpoints (status, history) must still work
  const hr = await api(token).get('/owner/subscription/billing-history');
  assert('Billing history accessible after expiry', hr.status === 200);

  info(`Blocked message: "${br.data?.message}"`);
}

// =============================================================================
//  SCENARIO D — Plan pre-selection during trial
// =============================================================================
async function scenarioD_PlanPreSelection() {
  section('SCENARIO D — Plan Pre-Selection During Trial');

  await resetSub();  // back to fresh trial

  // Pre-select starter during trial → should NOT activate it
  const sr = await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });
  assert('select-plan 200',                     sr.status === 200,                              `HTTP ${sr.status}`);
  assert('activatesAfterTrial = true',          sr.data.data?.activatesAfterTrial === true,     `got ${JSON.stringify(sr.data.data)}`);
  assert('planSelectedDuringTrial = starter',   sr.data.data?.planSelectedDuringTrial === 'starter', `got ${sr.data.data?.planSelectedDuringTrial}`);

  // Verify planType is still free_trial (NOT starter yet)
  const status = await api(token).get('/owner/subscription/status');
  assert('planType still = free_trial',         status.data.data?.planType === 'free_trial',   `got ${status.data.data?.planType}`);
  assert('planSelectedDuringTrial visible',      status.data.data?.planSelectedDuringTrial === 'starter');
  assert('accessStatus still = trial',          status.data.data?.accessStatus === 'trial');

  // Change pre-selection to per_booking
  const cr = await api(token).post('/owner/subscription/select-plan', { planType: 'per_booking' });
  assert('Can change pre-selection',            cr.status === 200);
  assert('New pre-selection = per_booking',     cr.data.data?.planSelectedDuringTrial === 'per_booking');

  info('Pre-selection during trial is deferred correctly — planType unchanged');
}

// =============================================================================
//  SCENARIO E — Plan activation post-trial + billing amounts
// =============================================================================
async function scenarioE_PlanActivationAndBilling() {
  section('SCENARIO E — Plan Activation + Billing Amounts');

  // ── E1: Starter ─────────────────────────────────────────────────────────────
  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 31 });

  const selRes = await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });
  assert('E1: select starter post-trial: 200',  selRes.status === 200,                         `HTTP ${selRes.status}`);
  assert('E1: planType = starter',              selRes.data.data?.planType === 'starter',       `got ${selRes.data.data?.planType}`);

  const ordRes = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  assert('E1: create-order 200',                ordRes.status === 200,                          `HTTP ${ordRes.status}`);
  assert('E1: amount = 150',                    ordRes.data.data?.amount === 150,               `got ${ordRes.data.data?.amount}`);
  assert('E1: currency = INR',                  ordRes.data.data?.currency === 'INR');
  assert('E1: invoiceId present',               !!ordRes.data.data?.invoiceId,                  'no invoiceId');

  // Force-pay → access restored
  const fpRes = await api(token).post('/test/subscription/force-pay', { planType: 'starter' });
  assert('E1: force-pay 200',                   fpRes.status === 200,                           `HTTP ${fpRes.status}`);
  const st1 = await api(token).get('/owner/subscription/status');
  assert('E1: paymentStatus = paid',            st1.data.data?.paymentStatus === 'paid',        `got ${st1.data.data?.paymentStatus}`);
  assert('E1: accessStatus = active',           st1.data.data?.accessStatus === 'active',       `got ${st1.data.data?.accessStatus}`);
  assert('E1: billingCycleEndDate set',         !!st1.data.data?.billingCycleEndDate);

  // ── E2: Per-booking — amount = bookingCount × 1 ──────────────────────────
  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 31 });
  await api(token).post('/owner/subscription/select-plan', { planType: 'per_booking' });
  await api(token).post('/test/subscription/set-booking-count', { count: 7 });

  const st2 = await api(token).get('/owner/subscription/status');
  assert('E2: monthlyBookingCount = 7',         st2.data.data?.monthlyBookingCount === 7,       `got ${st2.data.data?.monthlyBookingCount}`);
  assert('E2: estimatedBill = 7',               st2.data.data?.estimatedBill === 7,             `got ${st2.data.data?.estimatedBill}`);

  const ord2 = await api(token).post('/owner/subscription/create-order', { planType: 'per_booking' });
  assert('E2: order amount = 7',                ord2.data.data?.amount === 7,                   `got ${ord2.data.data?.amount}`);

  // Minimum charge ≥ ₹1 even with 0 bookings
  await api(token).post('/test/subscription/set-booking-count', { count: 0 });
  const ord3 = await api(token).post('/owner/subscription/create-order', { planType: 'per_booking' });
  assert('E2: minimum charge = ₹1 (0 bookings)',ord3.data.data?.amount >= 1,                    `got ${ord3.data.data?.amount}`);

  info(`Billing amounts verified: starter=₹150, per_booking=₹(count×1), min=₹1`);
}

// =============================================================================
//  SCENARIO F — Payment failure: access stays restricted; retry works
// =============================================================================
async function scenarioF_PaymentFailure() {
  section('SCENARIO F — Payment Failure: Retry Path');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 32 });
  await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });

  // Simulate failed webhook
  const wh = await api().post('/owner/subscription/webhook', {
    event: 'payment.failed',
    payload: { payment: { entity: { order_id: `order_fail_${TS}` } } },
  });
  assert('Failed webhook returns 200',          wh.status === 200,   `HTTP ${wh.status}`);

  // Access must still be restricted after failure
  const sr = await api(token).get('/owner/subscription/status');
  assert('After failed payment: not active',    sr.data.data?.accessStatus !== 'active', `got active — should still be restricted`);

  // Retry path: can create a new order
  const retry = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  assert('Retry: create-order succeeds',        retry.status === 200,                   `HTTP ${retry.status}`);
  assert('Retry: amount = 150',                 retry.data.data?.amount === 150,        `got ${retry.data.data?.amount}`);

  // Payment verifier rejects invalid signature (400, not 500)
  const vr = await api(token).post('/owner/subscription/verify-payment', {
    razorpayOrderId: 'order_bad', razorpayPaymentId: 'pay_bad',
    razorpaySignature: 'invalid', invoiceId: retry.data.data?.invoiceId,
  });
  assert('Bad signature returns 400 not 500',   vr.status === 400,   `got ${vr.status}`);

  info('After force-pay: access restored');
  await api(token).post('/test/subscription/force-pay', { planType: 'starter' });
  const sr2 = await api(token).get('/owner/subscription/status');
  assert('Post-payment access = active',        sr2.data.data?.accessStatus === 'active', `got ${sr2.data.data?.accessStatus}`);
}

// =============================================================================
//  SCENARIO G — Monthly billing cycle reset
// =============================================================================
async function scenarioG_MonthlyCycleReset() {
  section('SCENARIO G — Monthly Billing Cycle Reset');

  // ── G1: per_booking — invoice created + count resets ────────────────────
  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/test/subscription/force-pay', { planType: 'per_booking', bookingCount: 12 });
  await api(token).post('/test/subscription/set-booking-count', { count: 12 });

  const before = await api(token).get('/owner/subscription/status');
  assert('G1 before: bookingCount = 12',        before.data.data?.monthlyBookingCount === 12, `got ${before.data.data?.monthlyBookingCount}`);

  const mr = await api(token).post('/test/subscription/run-monthly-reset');
  assert('G1: monthly reset endpoint 200',      mr.status === 200,   `HTTP ${mr.status}`);

  const after = await api(token).get('/owner/subscription/status');
  assert('G1 after: bookingCount reset to 0',   after.data.data?.monthlyBookingCount === 0,   `got ${after.data.data?.monthlyBookingCount}`);
  assert('G1 after: paymentStatus = overdue',   after.data.data?.paymentStatus === 'overdue', `got ${after.data.data?.paymentStatus}`);

  const hist = await api(token).get('/owner/subscription/billing-history');
  assert('G1: billing history entry created',   hist.data.data?.length > 0,                   `no invoice found`);
  const latest = hist.data.data?.[0];
  if (latest) {
    assert('G1: invoice amount = 12',           latest.amount === 12,         `got ${latest.amount}`);
    assert('G1: invoice planType = per_booking',latest.planType === 'per_booking');
  }

  // ── G2: starter — cycle resets without invoice ───────────────────────────
  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/test/subscription/force-pay', { planType: 'starter' });
  await api(token).post('/test/subscription/set-booking-count', { count: 50 });

  const mr2 = await api(token).post('/test/subscription/run-monthly-reset');
  assert('G2: starter reset 200',               mr2.status === 200);

  const after2 = await api(token).get('/owner/subscription/status');
  assert('G2: starter bookingCount reset to 0', after2.data.data?.monthlyBookingCount === 0,  `got ${after2.data.data?.monthlyBookingCount}`);
  assert('G2: starter now overdue (renews)',     after2.data.data?.paymentStatus === 'overdue',`got ${after2.data.data?.paymentStatus}`);

  info('Monthly reset applies to both per_booking and starter plans');
}

// =============================================================================
//  SCENARIO H — Plan switching: applies next cycle, not current
// =============================================================================
async function scenarioH_PlanSwitching() {
  section('SCENARIO H — Plan Switching (Anti-Abuse + Next-Cycle Apply)');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/test/subscription/force-pay', { planType: 'starter' });

  const initSt = await api(token).get('/owner/subscription/status');
  assert('H: initial plan = starter',           initSt.data.data?.planType === 'starter',      `got ${initSt.data.data?.planType}`);
  assert('H: initial paid',                     initSt.data.data?.paymentStatus === 'paid');

  // Request switch to per_booking
  const sw = await api(token).post('/owner/subscription/request-plan-change', { planType: 'per_booking' });
  assert('H: request-change 200',               sw.status === 200,                             `HTTP ${sw.status}`);
  assert('H: nextPlan = per_booking',           sw.data.data?.nextPlan === 'per_booking',      `got ${sw.data.data?.nextPlan}`);

  // Verify plan did NOT switch immediately
  const afterReq = await api(token).get('/owner/subscription/status');
  assert('H: planType still = starter (not switched yet)', afterReq.data.data?.planType === 'starter', `got ${afterReq.data.data?.planType}`);
  assert('H: planChangeRequested = true',       afterReq.data.data?.planChangeRequested === true);
  assert('H: nextPlan = per_booking',           afterReq.data.data?.nextPlan === 'per_booking');
  assert('H: billingCycleEndDate set',          !!afterReq.data.data?.billingCycleEndDate);

  // Anti-abuse: second switch request returns 409
  const sw2 = await api(token).post('/owner/subscription/request-plan-change', { planType: 'starter' });
  assert('H: duplicate switch returns 409',     sw2.status === 409,  `got ${sw2.status}`);

  // Cancel switch
  const cc = await api(token).post('/owner/subscription/cancel-plan-change');
  assert('H: cancel-change 200',                cc.status === 200,   `HTTP ${cc.status}`);

  const afterCancel = await api(token).get('/owner/subscription/status');
  assert('H: after cancel: planChangeRequested = false', afterCancel.data.data?.planChangeRequested === false);
  assert('H: after cancel: nextPlan = null',    afterCancel.data.data?.nextPlan === null);
  assert('H: plan still = starter after cancel',afterCancel.data.data?.planType === 'starter');

  // Re-request and run monthly reset → switch should apply
  await api(token).post('/owner/subscription/request-plan-change', { planType: 'per_booking' });
  const mr = await api(token).post('/test/subscription/run-monthly-reset');
  assert('H: monthly reset runs',               mr.status === 200);
  assert('H: plan_switched_to:per_booking in changes', mr.data.data?.changes?.some(c => c.includes('per_booking')), `changes: ${JSON.stringify(mr.data.data?.changes)}`);

  const afterSwitch = await api(token).get('/owner/subscription/status');
  assert('H: planType switched to per_booking', afterSwitch.data.data?.planType === 'per_booking', `got ${afterSwitch.data.data?.planType}`);
  assert('H: planChangeRequested = false after apply', afterSwitch.data.data?.planChangeRequested === false);

  info('Plan switch correctly deferred to next billing cycle');
}

// =============================================================================
//  EDGE CASE 1 — Logout/re-login cannot bypass expired trial
// =============================================================================
async function edge1_LogoutBypass() {
  section('EDGE CASE 1 — Logout/Re-Login Cannot Bypass Restriction');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });

  const loginR = await api().post('/owner/auth/login', { identifier: TEST_EMAIL, password: TEST_PASS });
  const freshToken = loginR.data?.data?.token || loginR.data?.token;

  if (!freshToken) { skip('Logout bypass check', `Login returned no token — HTTP ${loginR.status}`); return; }
  info('Fresh token obtained after re-login');

  const br = await api(freshToken).post('/owner/bookings', {
    customerName: 'Bypass', customerPhone: '+919700000001',
    serviceId: '000000000000000000000000',
    appointmentDate: new Date().toISOString().slice(0, 10), appointmentTime: '15:00',
  });
  assert('Fresh token cannot bypass: still 403', br.status === 403, `Got ${br.status} — bypass succeeded`);

  token = freshToken; // use fresh token for rest of session
}

// =============================================================================
//  EDGE CASE 2 — Duplicate payment prevention (invoice dedup by billing month)
// =============================================================================
async function edge2_DuplicatePayment() {
  section('EDGE CASE 2 — Duplicate Payment Prevention');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 31 });
  await api(token).post('/owner/subscription/select-plan', { planType: 'starter' });

  const o1 = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });
  const o2 = await api(token).post('/owner/subscription/create-order', { planType: 'starter' });

  assert('Order 1 created',                     o1.status === 200,   `HTTP ${o1.status}`);
  assert('Order 2 created',                     o2.status === 200,   `HTTP ${o2.status}`);
  assert('Both orders share same invoiceId',
    o1.data.data?.invoiceId?.toString() === o2.data.data?.invoiceId?.toString(),
    `invoice1=${o1.data.data?.invoiceId}  invoice2=${o2.data.data?.invoiceId}`
  );
  info(`Invoice dedup OK: ${o1.data.data?.invoiceId}`);
}

// =============================================================================
//  EDGE CASE 3 — Invalid plan type rejected
// =============================================================================
async function edge3_InvalidPlan() {
  section('EDGE CASE 3 — Invalid Plan Type Rejected');

  const r1 = await api(token).post('/owner/subscription/select-plan', { planType: 'enterprise' });
  assert('enterprise plan → 400',               r1.status === 400,   `got ${r1.status}`);
  assert('Error message string',                typeof r1.data?.message === 'string');

  const r2 = await api(token).post('/owner/subscription/select-plan', { planType: '' });
  assert('empty plan → 400',                    r2.status === 400,   `got ${r2.status}`);

  const r3 = await api(token).post('/owner/subscription/request-plan-change', { planType: 'gold' });
  assert('invalid switch → 400',                r3.status === 400,   `got ${r3.status}`);
}

// =============================================================================
//  EDGE CASE 4 — Billing amount security: per-booking can't be manipulated
// =============================================================================
async function edge4_BillingIntegrity() {
  section('EDGE CASE 4 — Billing Amount Integrity');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/owner/subscription/select-plan', { planType: 'per_booking' });
  await api(token).post('/test/subscription/set-booking-count', { count: 10 });

  const ord = await api(token).post('/owner/subscription/create-order', { planType: 'per_booking' });
  assert('E4: amount = 10 (10 bookings × ₹1)',  ord.data.data?.amount === 10, `got ${ord.data.data?.amount}`);

  // Amount must match what's in the DB — not a client-supplied value
  // The endpoint derives amount from DB booking count, not from request body
  const ordFixed = await api(token).post('/owner/subscription/create-order', {
    planType: 'per_booking',
    amount: 1,     // attacker tries to force ₹1 for 10 bookings
  });
  assert('Client-supplied amount ignored — still 10', ordFixed.data.data?.amount === 10, `got ${ordFixed.data.data?.amount}`);

  info('Amount is derived server-side from DB booking count — client cannot override');
}

// =============================================================================
//  EDGE CASE 5 — Cancel plan-change when none is pending
// =============================================================================
async function edge5_CancelNonExistentChange() {
  section('EDGE CASE 5 — Cancel Non-Existent Plan Change');

  await resetSub();
  const r = await api(token).post('/owner/subscription/cancel-plan-change');
  assert('Cancel with no pending change → 400', r.status === 400,   `got ${r.status}`);
  assert('Error message present',               typeof r.data?.message === 'string');
}

// =============================================================================
//  VALIDATION RULES — cross-check invariants after all scenarios
// =============================================================================
async function validationRules() {
  section('VALIDATION RULES — System Invariants');

  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/test/subscription/force-pay', { planType: 'starter' });

  const st = await api(token).get('/owner/subscription/status');
  const d  = st.data.data;

  // Rule 1: No unpaid user with active access
  assert('RULE: paid users have accessStatus=active', d?.paymentStatus === 'paid' && d?.accessStatus === 'active',
    `paymentStatus=${d?.paymentStatus}, accessStatus=${d?.accessStatus}`);

  // Rule 2: Billing cycle end date is in the future after payment
  if (d?.billingCycleEndDate) {
    assert('RULE: billingCycleEndDate is in the future', new Date(d.billingCycleEndDate) > new Date(),
      `cycleEnd=${d.billingCycleEndDate}`);
  }

  // Rule 3: No planChangeRequested on fresh payment
  assert('RULE: no pending plan change after fresh payment', d?.planChangeRequested === false,
    `planChangeRequested=${d?.planChangeRequested}`);

  // Rule 4: Booking count resets after monthly reset
  await api(token).post('/test/subscription/set-booking-count', { count: 99 });
  await api(token).post('/test/subscription/run-monthly-reset');
  const afterReset = await api(token).get('/owner/subscription/status');
  assert('RULE: booking count = 0 after cycle reset', afterReset.data.data?.monthlyBookingCount === 0,
    `got ${afterReset.data.data?.monthlyBookingCount}`);

  // Rule 5: estimatedBill = monthlyBookingCount × 1 for per_booking
  await resetSub();
  await api(token).post('/test/subscription/set-trial-date', { daysAgo: 35 });
  await api(token).post('/test/subscription/force-pay', { planType: 'per_booking', bookingCount: 0 });
  await api(token).post('/test/subscription/set-booking-count', { count: 23 });
  const pbSt = await api(token).get('/owner/subscription/status');
  assert('RULE: estimatedBill = bookingCount × ₹1',
    pbSt.data.data?.estimatedBill === pbSt.data.data?.monthlyBookingCount * 1,
    `estimatedBill=${pbSt.data.data?.estimatedBill}, count=${pbSt.data.data?.monthlyBookingCount}`
  );
}

// =============================================================================
//  LOGGING VERIFICATION
// =============================================================================
async function verifyLogging() {
  section('LOGGING — Audit Trail Verification');

  const state = await api(token).get('/test/subscription/owner-state');
  assert('Owner-state endpoint accessible',     state.status === 200, `HTTP ${state.status}`);

  const logs   = state.data.data?.recentLogs || [];
  assert('At least one audit log exists',       logs.length > 0,      `found ${logs.length}`);

  if (logs.length > 0) {
    const l = logs[0];
    assert('Log has ownerId',    !!l.ownerId);
    assert('Log has event',      !!l.event);
    assert('Log has createdAt',  !!l.createdAt);
  }

  const events = new Set(logs.map(l => l.event));
  info(`Events captured: ${[...events].join(', ')}`);

  if (events.has('plan_selected'))        pass('plan_selected event logged');
  else                                    info('plan_selected not in recent 20 (expected after resets)');
  if (events.has('payment_order_created'))pass('payment_order_created event logged');
  else                                    info('payment_order_created not in recent 20');
}

// =============================================================================
//  DIAGNOSTIC ENGINE
//  Maps test failures → root causes → known fix IDs
// =============================================================================

const DIAGNOSTIC_RULES = [
  {
    match:   (d) => d.label.includes('trialActive') && d.why.includes('true'),
    issue:   'trial_boundary',
    explain: 'Trial reported active after day 30 — off-by-one in isTrialActive(). Boundary uses <= instead of <.',
    fixes:   ['fix_trial_boundary_middleware', 'fix_trial_boundary_controller'],
  },
  {
    match:   (d) => d.label.includes('403') && (d.why.includes('403') || d.why.includes('not 403')),
    issue:   'subscription_middleware_bypass',
    explain: 'POST /owner/bookings is not blocked after trial expires. checkSubscription middleware may not be applied to the route.',
    fixes:   ['fix_booking_route_middleware'],
  },
  {
    match:   (d) => d.label.includes('amount') && d.why.includes('150'),
    issue:   'starter_price_wrong',
    explain: 'Starter plan amount is not ₹150. STARTER_PRICE constant may be wrong in subscriptionController.js.',
    fixes:   ['fix_starter_price'],
  },
  {
    match:   (d) => d.label.includes('estimatedBill') || (d.label.includes('amount') && d.label.includes('per')),
    issue:   'per_booking_billing_formula',
    explain: 'Per-booking amount does not equal monthlyBookingCount × 1. Check the formula in getSubscriptionStatus or createPaymentOrder.',
    fixes:   ['fix_per_booking_formula'],
  },
  {
    match:   (d) => d.label.includes('invoiceId') || d.label.includes('dedup'),
    issue:   'duplicate_invoice',
    explain: 'Duplicate invoices created for the same billing month. Dedup query (Subscription.findOne) is missing or incomplete.',
    fixes:   ['fix_invoice_dedup'],
  },
  {
    match:   (d) => d.label.includes('planType still = free_trial') || d.label.includes('planType still = starter'),
    issue:   'plan_switch_immediate',
    explain: 'Plan switch is applying immediately instead of at next billing cycle. selectPlan or requestPlanChange does not defer correctly.',
    fixes:   ['fix_plan_switch_defer'],
  },
  {
    match:   (d) => d.label.includes('booking count') && d.label.includes('reset'),
    issue:   'booking_count_not_reset',
    explain: 'monthlyBookingCount is not reset to 0 by the billing cycle reset. Check the $set in cron monthlyBillingReset.',
    fixes:   ['fix_booking_count_reset'],
  },
  {
    match:   (d) => d.label.includes('planSelectedDuringTrial') || d.label.includes('activatesAfterTrial'),
    issue:   'trial_preselection_missing',
    explain: 'selectPlan during trial should store plan in planSelectedDuringTrial (not activate immediately). Controller logic may be wrong.',
    fixes:   ['fix_trial_preselection'],
  },
  {
    match:   (d) => d.label.includes('planChangeRequested') && d.why.includes('false'),
    issue:   'plan_change_not_tracked',
    explain: 'planChangeRequested flag not set when switch is requested. Check requestPlanChange in subscriptionController.',
    fixes:   ['fix_plan_change_flag'],
  },
];

function runDiagnostics(failedDetails) {
  const diagnoses = [];
  const coveredIssues = new Set();

  for (const d of failedDetails) {
    for (const rule of DIAGNOSTIC_RULES) {
      if (rule.match(d) && !coveredIssues.has(rule.issue)) {
        coveredIssues.add(rule.issue);
        diagnoses.push({ ...rule, triggeredBy: d.label });
      }
    }
  }
  return diagnoses;
}

// =============================================================================
//  CODE ANALYSIS ENGINE
//  Reads source files and checks for known bug patterns
// =============================================================================

const CODE_CHECKS = [
  {
    id:     'fix_trial_boundary_middleware',
    file:   'middleware',
    desc:   'Trial boundary: middleware should use elapsed < TRIAL_DAYS (not <=)',
    bugPattern:  /elapsed\s*<=\s*TRIAL_DAYS/,
    fixPattern:  /elapsed\s*<=\s*TRIAL_DAYS/g,
    fixWith:     'elapsed < TRIAL_DAYS',
  },
  {
    id:     'fix_trial_boundary_controller',
    file:   'controller',
    desc:   'Trial boundary: controller getTrialDaysRemaining should return > 0 check',
    bugPattern:  /getTrialDaysRemaining\(.*\)\s*>=\s*0/,
    fixPattern:  /getTrialDaysRemaining\(.*\)\s*>=\s*0/g,
    fixWith:     null, // complex — only report
  },
  {
    id:     'fix_starter_price',
    file:   'controller',
    desc:   'STARTER_PRICE must equal 150',
    bugPattern:  /STARTER_PRICE\s*=\s*(?!150)[0-9]+/,
    fixPattern:  /STARTER_PRICE\s*=\s*[0-9]+/g,
    fixWith:     'STARTER_PRICE = 150',
  },
  {
    id:     'fix_per_booking_formula',
    file:   'controller',
    desc:   'Per-booking estimatedBill must be monthlyBookingCount * PER_BOOKING_PRICE',
    bugPattern:  /estimatedBill\s*=[\s\S]*?(?!\*\s*PER_BOOKING_PRICE)/,
    // Too complex to auto-patch — report only
    fixPattern:  null,
    fixWith:     null,
  },
  {
    id:     'fix_invoice_dedup',
    file:   'controller',
    desc:   'createPaymentOrder must query for existing pending invoice before creating new one',
    bugPattern: /Subscription\.create\(\{[^}]+\}\)/,
    // Check that findOne exists before the create
    additionalCheck: (content) => !content.includes('Subscription.findOne') || !content.includes('billingMonth'),
    fixPattern:  null,
    fixWith:     null,
  },
  {
    id:     'fix_booking_route_middleware',
    file:   'routes',
    desc:   'POST /owner/bookings route must include checkSubscription middleware',
    bugPattern:  /router\.post\(["'\/owner\/bookings["'].*?(?!checkSubscription)/,
    additionalCheck: (content) => {
      const match = content.match(/router\.post\(["']\/owner\/bookings["'][^)]+\)/);
      return match ? !match[0].includes('checkSubscription') : false;
    },
    fixPattern:  null,
    fixWith:     null,
  },
  {
    id:     'fix_booking_count_reset',
    file:   'cron',
    desc:   'monthlyBillingReset cron must set monthlyBookingCount: 0',
    bugPattern:  null,
    additionalCheck: (content) => {
      const hasReset = content.includes("'subscription.monthlyBookingCount': 0");
      return !hasReset;
    },
    fixPattern:  null,
    fixWith:     null,
  },
  {
    id:     'fix_trial_preselection',
    file:   'controller',
    desc:   'selectPlan during trial must store in planSelectedDuringTrial, not set planType',
    bugPattern:  null,
    additionalCheck: (content) => {
      // Check that planSelectedDuringTrial assignment exists in selectPlan
      return !content.includes('planSelectedDuringTrial = planType');
    },
    fixPattern:  null,
    fixWith:     null,
  },
  {
    id:     'fix_plan_change_flag',
    file:   'controller',
    desc:   'requestPlanChange must set planChangeRequested = true',
    bugPattern:  null,
    additionalCheck: (content) => !content.includes('planChangeRequested') || !content.includes('= true'),
    fixPattern:  null,
    fixWith:     null,
  },
];

function analyzeSourceFiles() {
  const report = [];

  for (const check of CODE_CHECKS) {
    const filePath = SRC[check.file];
    if (!filePath) { report.push({ ...check, status: 'skipped', reason: 'file key unknown' }); continue; }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      report.push({ ...check, status: 'skipped', reason: 'file not readable' });
      continue;
    }

    let bugFound = false;
    if (check.bugPattern) bugFound = check.bugPattern.test(content);
    if (!bugFound && check.additionalCheck) bugFound = check.additionalCheck(content);

    report.push({
      ...check,
      status: bugFound ? 'BUG_DETECTED' : 'CLEAN',
      canAutoFix: !!(check.fixPattern && check.fixWith),
    });
  }
  return report;
}

// =============================================================================
//  AUTO-FIX ENGINE
//  Applies simple string-replace patches to source files
// =============================================================================

function applyAutoFixes(codeReport) {
  const applied = [];
  const failed  = [];

  for (const item of codeReport) {
    if (item.status !== 'BUG_DETECTED' || !item.canAutoFix) continue;

    const filePath = SRC[item.file];
    try {
      const original = fs.readFileSync(filePath, 'utf8');
      const patched  = original.replace(item.fixPattern, item.fixWith);

      if (patched === original) {
        failed.push({ id: item.id, reason: 'pattern not found in file (may already be fixed)' });
        continue;
      }

      // Backup original
      const backupPath = filePath + '.bak';
      fs.writeFileSync(backupPath, original, 'utf8');

      // Write patched
      fs.writeFileSync(filePath, patched, 'utf8');
      applied.push({ id: item.id, file: item.file, desc: item.desc, backupPath });

    } catch (e) {
      failed.push({ id: item.id, reason: e.message });
    }
  }
  return { applied, failed };
}

// =============================================================================
//  REPORT WRITER
// =============================================================================

function writeReport({ cycle, testResults, codeAnalysis, fixes, durationMs }) {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const filename = path.join(reportsDir, `billing-${TS}${cycle > 1 ? `-cycle${cycle}` : ''}.json`);
  const report = {
    meta: {
      timestamp:  new Date().toISOString(),
      cycle,
      durationMs,
      baseUrl:    BASE_URL,
      fixMode:    FIX_MODE,
    },
    summary: {
      passed:   testResults.passed,
      failed:   testResults.failed,
      skipped:  testResults.skipped,
      total:    testResults.passed + testResults.failed + testResults.skipped,
      allPassed: testResults.failed === 0,
    },
    failures: testResults.details.filter(d => d.status === 'FAIL'),
    codeAnalysis: codeAnalysis.map(c => ({ id: c.id, file: c.file, status: c.status, desc: c.desc, canAutoFix: c.canAutoFix })),
    fixesApplied: fixes?.applied || [],
    fixesFailed:  fixes?.failed  || [],
    allResults:   testResults.details,
  };

  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  return filename;
}

// =============================================================================
//  PRINT SUMMARY
// =============================================================================

function printSummary(cycle, diagnoses, codeReport, fixes) {
  const t = results;
  const total = t.passed + t.failed + t.skipped;

  log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`);
  log(`${C.bold}  TEST SUMMARY${cycle > 1 ? `  (cycle ${cycle})` : ''}${C.reset}`);
  log(`${'═'.repeat(60)}`);
  log(`  Total    ${total}`);
  log(`  ${C.green}Passed   ${t.passed}${C.reset}`);
  log(`  ${C.red}Failed   ${t.failed}${C.reset}`);
  log(`  ${C.yellow}Skipped  ${t.skipped}${C.reset}`);
  log(`${'═'.repeat(60)}`);

  if (t.failed > 0) {
    log(`\n${C.red}${C.bold}  FAILURES:${C.reset}`);
    t.details.filter(d => d.status === 'FAIL').forEach(d =>
      log(`  ${C.red}✘${C.reset}  ${d.label}${C.grey}  ← ${d.why || ''}${C.reset}`)
    );
  }

  if (diagnoses.length > 0) {
    log(`\n${C.bold}${C.yellow}  ROOT CAUSE DIAGNOSIS:${C.reset}`);
    diagnoses.forEach(d => {
      log(`  ${C.yellow}⚡${C.reset} ${C.bold}${d.issue}${C.reset}`);
      log(`      ${C.grey}${d.explain}${C.reset}`);
      log(`      ${C.grey}Triggered by: "${d.triggeredBy}"${C.reset}`);
      log(`      ${C.grey}Fix IDs: ${d.fixes.join(', ')}${C.reset}`);
    });
  }

  const bugs = codeReport.filter(c => c.status === 'BUG_DETECTED');
  if (bugs.length > 0) {
    log(`\n${C.bold}${C.magenta}  CODE ANALYSIS — BUGS DETECTED:${C.reset}`);
    bugs.forEach(b => {
      const canFix = b.canAutoFix ? `${C.green}[AUTO-FIXABLE]${C.reset}` : `${C.yellow}[MANUAL FIX NEEDED]${C.reset}`;
      log(`  ${C.magenta}🐛${C.reset}  ${b.id}  ${canFix}`);
      log(`      ${C.grey}${b.desc}${C.reset}`);
    });
  } else if (t.failed === 0) {
    log(`\n  ${C.green}Code analysis: no known bug patterns detected${C.reset}`);
  }

  if (fixes) {
    if (fixes.applied.length > 0) {
      log(`\n${C.bold}${C.magenta}  AUTO-FIXES APPLIED:${C.reset}`);
      fixes.applied.forEach(f => {
        log(`  ${C.magenta}✔${C.reset}  ${f.id}  ${C.grey}(${f.file})${C.reset}`);
        log(`      ${C.grey}${f.desc}${C.reset}`);
        log(`      ${C.grey}Backup: ${f.backupPath}${C.reset}`);
      });
      log(`\n  ${C.yellow}${C.bold}⚠ Restart the backend server, then re-run to verify fixes.${C.reset}`);
    }
    if (fixes.failed.length > 0) {
      log(`\n${C.bold}  AUTO-FIXES SKIPPED (require manual intervention):${C.reset}`);
      fixes.failed.forEach(f => log(`  ${C.grey}—  ${f.id}: ${f.reason}${C.reset}`));
    }
  }

  const manualNeeded = bugs.filter(b => !b.canAutoFix && diagnoses.some(d => d.fixes.includes(b.id)));
  if (manualNeeded.length > 0) {
    log(`\n${C.bold}  MANUAL FIXES REQUIRED:${C.reset}`);
    manualNeeded.forEach(b => {
      log(`  ${C.red}→${C.reset}  ${C.bold}${b.id}${C.reset}  ${C.grey}in ${SRC[b.file]}${C.reset}`);
      log(`      ${C.grey}${b.desc}${C.reset}`);
    });
  }

  const allPassed = t.failed === 0;
  log(`\n${allPassed ? C.green : C.red}${C.bold}  ${allPassed ? '✔ ALL TESTS PASSED' : '✘ SOME TESTS FAILED'}${C.reset}\n`);
}

// =============================================================================
//  MAIN RUNNER
// =============================================================================

async function runAllTests() {
  resetResults();
  const start = Date.now();

  try {
    await scenarioA_NewUser();
    await scenarioB_DuringTrial();
    await scenarioC_TrialExpiry();
    await scenarioD_PlanPreSelection();
    await scenarioE_PlanActivationAndBilling();
    await scenarioF_PaymentFailure();
    await scenarioG_MonthlyCycleReset();
    await scenarioH_PlanSwitching();
    await edge1_LogoutBypass();
    await edge2_DuplicatePayment();
    await edge3_InvalidPlan();
    await edge4_BillingIntegrity();
    await edge5_CancelNonExistentChange();
    await validationRules();
    await verifyLogging();
  } catch (err) {
    log(`\n${C.red}${C.bold}UNEXPECTED ERROR: ${err.message}${C.reset}`);
    if (err.code === 'ECONNREFUSED') {
      log(`${C.red}→ Cannot connect to ${BASE_URL}. Make sure the backend is running.${C.reset}`);
    } else {
      console.error(err);
    }
    fail('Unexpected runtime error', err.message);
  }

  return Date.now() - start;
}

(async () => {
  log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║  SELF-HEALING BILLING & PAYMENT TEST SYSTEM               ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);
  log(`${C.grey}  Base URL  : ${BASE_URL}${C.reset}`);
  log(`${C.grey}  Fix mode  : ${FIX_MODE}${C.reset}`);
  log(`${C.grey}  Max loops : ${MAX_LOOPS}${C.reset}`);
  log(`${C.grey}  Test email: ${TEST_EMAIL}${C.reset}`);

  await setup();

  let lastFixes = null;
  let cycle     = 0;

  for (cycle = 1; cycle <= MAX_LOOPS; cycle++) {
    if (cycle > 1) {
      log(`\n${C.bold}${C.cyan}━━━ RE-VERIFICATION CYCLE ${cycle} ━━━${C.reset}`);
      resetResults();
    }

    const durationMs = await runAllTests();
    const failedDetails = results.details.filter(d => d.status === 'FAIL');
    const diagnoses     = runDiagnostics(failedDetails);
    const codeReport    = analyzeSourceFiles();

    let fixes = null;
    if (FIX_MODE && failedDetails.length > 0) {
      section('AUTO-FIX ENGINE');
      const autoFixable = codeReport.filter(c => c.status === 'BUG_DETECTED' && c.canAutoFix);
      if (autoFixable.length > 0) {
        fix_log(`Applying ${autoFixable.length} auto-fixable patch(es)...`);
        fixes = applyAutoFixes(codeReport);
        lastFixes = fixes;
      } else {
        fix_log('No auto-fixable bugs detected — manual intervention required for remaining issues');
      }
    }

    const reportFile = writeReport({ cycle, testResults: { ...results }, codeAnalysis: codeReport, fixes, durationMs });
    info(`Report saved: ${reportFile}`);

    printSummary(cycle, diagnoses, codeReport, fixes);

    // Stop looping if all pass or no fixes were applied (no progress possible)
    if (results.failed === 0) break;
    if (!fixes || fixes.applied.length === 0) {
      if (cycle < MAX_LOOPS) warn('No auto-fixes applied — remaining failures require manual fixes or server restart');
      break;
    }
    if (cycle < MAX_LOOPS) {
      warn(`Fixes applied to source files. Restart the backend server, then re-run OR loop will re-verify after restart.`);
      // If server auto-restart is configured (PM2 watch mode etc), give it time and continue
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  try { await teardown(); } catch { /* ignore */ }

  process.exitCode = results.failed === 0 ? 0 : 1;
})();
