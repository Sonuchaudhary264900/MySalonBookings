# DLT SMS Templates (Jio DLT + Fast2SMS)

Transactional SMS goes out through **Fast2SMS** using **DLT-approved templates**.
The Jio DLT portal is only where you *register* the Entity, Header (sender ID) and
Content Templates — it does not send anything. Fast2SMS is the aggregator that
actually delivers the message.

Flow: **WhatsApp is tried first**; if it isn't delivered, the DLT SMS is sent as a
fallback (booking confirmation, reminders, status changes, delay alerts). **OTP**
is sent directly over SMS.

---

## Step 1 — Register a Header (Sender ID) on Jio DLT

Under **Header SMS → Add Header**, register a 6-character alphabetic header for
transactional traffic, e.g. `GLOWLX`. Put the approved header in env as
`FAST2SMS_SENDER_ID`.

## Step 2 — Register Content Templates on Jio DLT

Create each template below under **Template → Content Template** (category:
*Transactional* / *Service Implicit* as appropriate). DLT variables are written as
`{#var#}` and are filled **in order** by the backend. Keep the wording and the
number/order of variables exactly as below (you may adjust brand wording, but not
the variable order).

> Replace `GlowLoox` with your approved brand/entity name if different.

### 1. OTP  → `FAST2SMS_OTP_TEMPLATE_ID`
```
{#var#} is your GlowLoox verification code. Valid for 10 minutes. Do not share it with anyone.
```
Variables (in order): `otp`

### 2. Booking Confirmation  → `FAST2SMS_BOOKING_TEMPLATE_ID`
```
Hi {#var#}, your booking at {#var#} for {#var#} on {#var#} at {#var#} is confirmed. - GlowLoox
```
Variables: `customerName, salonName, serviceName, date, time`

### 3. Appointment Reminder  → `FAST2SMS_REMINDER_TEMPLATE_ID`
```
Hi {#var#}, reminder: your {#var#} at {#var#} is at {#var#}. See you soon! - GlowLoox
```
Variables: `customerName, serviceName, salonName, time`

### 4. Delay Alert  → `FAST2SMS_DELAY_TEMPLATE_ID`
```
Hi {#var#}, your appointment at {#var#} is now expected around {#var#} (running {#var#} min late). Sorry for the wait! - GlowLoox
```
Variables: `customerName, salonName, tentativeTime, delayMinutes`

### 5. Status Update  → `FAST2SMS_STATUS_TEMPLATE_ID`
```
Hi {#var#}, your booking at {#var#} on {#var#} is now {#var#}. - GlowLoox
```
Variables: `customerName, salonName, date, status`

## Step 3 — Link templates in Fast2SMS & copy the Message IDs

In Fast2SMS → **DLT SMS**, add/import your DLT Entity ID (PE ID), the header, and
each approved template. Fast2SMS assigns every template a numeric **Message ID**.
Copy each into the matching env var:

| Template            | Env var                        |
|---------------------|--------------------------------|
| OTP                 | `FAST2SMS_OTP_TEMPLATE_ID`     |
| Booking confirmation| `FAST2SMS_BOOKING_TEMPLATE_ID` |
| Reminder            | `FAST2SMS_REMINDER_TEMPLATE_ID`|
| Delay alert         | `FAST2SMS_DELAY_TEMPLATE_ID`   |
| Status update       | `FAST2SMS_STATUS_TEMPLATE_ID`  |

Also set `FAST2SMS_API_KEY` (Fast2SMS → Dev API) and `FAST2SMS_SENDER_ID`.

## Step 4 — Deploy

Add all `FAST2SMS_*` vars to the Render backend environment and redeploy. Until
they're set, the SMS layer is a graceful no-op (WhatsApp/push keep working). Once
set, any WhatsApp send that fails automatically falls back to SMS, and status/delay
alerts + OTP go out over SMS.

---

### Notes
- Numbers are normalised to bare 10-digit Indian format automatically.
- The pipe character `|` and newlines are stripped from variable values (they are
  the DLT field separator).
- Message-template *content* must match the DLT registration exactly or the
  carrier rejects it (error: template mismatch). If you change wording here, update
  the DLT template too.
