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

Create each template below under **Template → Content Template**. The Jio DLT
portal uses **typed variable tags** — use `{#number#}` for pure-digit values and
`{#alphanumeric#}` for everything else (names/dates/times/status).

> **TRAI rule:** *Service Inferred* templates allow a **maximum of 3 variables**.
> All templates below are kept at ≤3 variables (that's why the customer name and
> the delay-minutes were dropped and date+time were merged). They are filled
> **in order** by the backend — keep the wording and variable order exactly.
>
> Replace `GlowLoox` with your approved brand/entity name if different.

### 1. OTP  → `FAST2SMS_OTP_TEMPLATE_ID`  (category: OTP)
```
{#number#} is your GlowLoox verification code. Valid for 10 minutes. Do not share it with anyone.
```
Variables (in order): `otp`  *(1 var)*

### 2. Booking Confirmation  → `FAST2SMS_BOOKING_TEMPLATE_ID`
```
Your booking at {#alphanumeric#} for {#alphanumeric#} is confirmed for {#alphanumeric#}. - GlowLoox
```
Variables: `salonName, serviceName, dateTime`  *(3 vars; dateTime = "15 Aug 5:30 PM")*

### 3. Appointment Reminder  → `FAST2SMS_REMINDER_TEMPLATE_ID`
```
Reminder: your {#alphanumeric#} at {#alphanumeric#} is at {#alphanumeric#}. See you soon! - GlowLoox
```
Variables: `serviceName, salonName, time`  *(3 vars)*

### 4. Delay Alert  → `FAST2SMS_DELAY_TEMPLATE_ID`
```
Your appointment at {#alphanumeric#} is delayed, now expected around {#alphanumeric#}. Sorry for the wait! - GlowLoox
```
Variables: `salonName, tentativeTime`  *(2 vars)*

### 5. Status Update  → `FAST2SMS_STATUS_TEMPLATE_ID`
```
Your booking at {#alphanumeric#} on {#alphanumeric#} is now {#alphanumeric#}. - GlowLoox
```
Variables: `salonName, date, status`  *(3 vars)*

### OTP auto-detect / auto-copy
The OTP template above already works with keyboard auto-fill (Gboard/iOS show a
"Copy 1234" / autofill chip) because it contains a numeric code next to the words
"verification code". No hash needed for that.

For **fully-automatic** fill (Android SMS Retriever API — fills with no tap and no
SMS-read permission) the message must start with `<#>` and end with your app's
unique 11-char hash, e.g.:
```
<#> {#number#} is your GlowLoox verification code. Do not share it. a1B2c3D4e5F
```
The hash differs per signed app (customer vs owner), so this needs app-side code
and a per-app template. Register the plain version above first; add the hash
variant later when the SMS-OTP login screen is wired.

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
