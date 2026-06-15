# 🚀 GlowLoox / MySalonBookings — Launch Checklist

> Status: **Code is release-ready.** All web apps build clean, both mobile apps configured, auth is OTP-only end to end, payments + webhook + security hardening done. Everything below is what's left — almost all of it is account/dashboard work only you can do.

---

## 🔴 MUST DO BEFORE GOING LIVE (hard blockers)

### 1. Firebase production SHA-1 fingerprint  ← #1 trap, do this or login breaks
EAS production builds are signed differently than test builds; **phone OTP login silently fails on the published app** until the production SHA-1 is in Firebase.
- [ ] `cd "Salon Bookings App" && eas credentials -p android` → copy SHA-1 (production keystore)
- [ ] `cd salon-owner-android && eas credentials -p android` → copy SHA-1
- [ ] Firebase Console → **smartsalonotp** → Project Settings → Your apps → add SHA-1 to `com.mysalonbookings.user` AND `com.mysalonbookings.owner`
- [ ] Re-download both `google-services.json`, replace in each app folder, rebuild
- [ ] Firebase → Authentication → Settings → authorize your production **web** domains for Phone Auth

### 2. Live Razorpay keys (real payments)
Render currently has TEST keys → "Test Mode" banner, no real money.
- [ ] Activate Razorpay **KYC** (required for live mode)
- [ ] Render env: set `RAZORPAY_KEY_ID` = `rzp_live_SzywyF2LhMw47T`, `RAZORPAY_KEY_SECRET` = (in local `backend/.env`)
- [ ] Render env: set `RAZORPAY_WEBHOOK_SECRET`
- [ ] Verify Razorpay webhook is **Live**: URL `https://<your-backend>/api/v1/owner/subscription/webhook`, event `payment.captured`, secret matches

### 3. Backend (Render) env vars + redeploy
- [ ] `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL` (Upstash)
- [ ] `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`
- [ ] `GOOGLE_MAPS_API_KEY`, `SENTRY_DSN`
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` = your real web domains (wrong value = CORS blocks the web apps)
- [ ] Redeploy

### 4. Web (Vercel) env vars — all 3 web apps, then redeploy
- [ ] `VITE_API_BASE_URL`, `VITE_SOCKET_URL`
- [ ] `VITE_RAZORPAY_KEY_ID` (currently missing)
- [ ] `VITE_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- [ ] `VITE_GOOGLE_MAPS_API_KEY`

### 5. Build the mobile apps (Expo)
- [ ] `eas login`
- [ ] `cd "Salon Bookings App" && eas build -p android --profile production`
- [ ] `cd salon-owner-android && eas build -p android --profile production`

### 6. Google Cloud Console — restrict the Maps API key (bill protection)
- [ ] Restrict web key by HTTP referrer (your domains)
- [ ] Restrict Android key by app package + SHA-1

### 7. Play Console (content pre-written in project memory)
- [ ] $25 developer account
- [ ] Store listing + screenshots (2–5 per app) + 1024x500 feature graphic
- [ ] Content rating (Everyone), Data Safety form, categories (User=Lifestyle, Owner=Business)
- [ ] Target country: India (first release)
- [ ] Upload both AABs

---

## ✅ SMOKE TEST ON A REAL DEVICE (before publish, ~15 min)
- [ ] Customer: phone → OTP → logged in  (validates the SHA-1 step)
- [ ] Owner: phone → OTP → logged in; **Delete Account** works; salon shows **online** when logged in
- [ ] One real **₹1 payment** end-to-end after live keys are set
- [ ] A booking → owner gets push notification → status change reaches customer

---

## 🟡 DO SOON (post-launch, week 1 — not blockers)

- [ ] **WhatsApp notifications** (optional): create Meta app, get Phone Number ID + token, get 3 templates approved (`booking_confirmation`, `appointment_reminder_24h`, `appointment_reminder_1h`), set `WHATSAPP_*` env vars on Render, redeploy. (Code is done; no-ops until set.)
- [ ] **Withdrawal OTP** (fraud guard): require Firebase phone re-verification before wallet withdrawals. Mitigated for now by manual admin approval of every payout. *(Agent can do this — code task.)*
- [ ] **Automated tests** (Jest + supertest): booking/coupon/wallet/auth coverage. Biggest latent risk for a real-money app — currently zero tests. *(Agent can do this — code task.)*

---

## 🟢 RELIABILITY / PERFORMANCE BACKLOG (post-launch hardening — code tasks the agent can do)

- [ ] **Customer-web cookie auth**: move JWT from localStorage → httpOnly cookies + CSRF (match owner web). Mitigated today by zero XSS vectors. Needs a customer AuthContext + rewiring ~14 files + browser testing.
- [ ] **Split huge components**: SalonDetails (2746 lines), GlowLooxProfile (1958), Bookings (1724), Home (1681), Services (1628), Settings (1619), Reels (1575). Low urgency (already route-split); improves maintainability.

---

## ℹ️ Already done (no action needed)
Security hardening (socket auth, coupon validation, booking race guard, OTP/CSRF), live Razorpay webhook reconciliation, refresh-token rotation, OTP-only auth across all apps, dead-code cleanup, ErrorBoundaries on all 5 apps, admin code-splitting, image lazy-loading, faster cold starts, push notifications on all booking status changes, EAS project IDs, google-services.json present.
