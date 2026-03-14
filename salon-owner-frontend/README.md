# Smart Barber - Owner Dashboard

React + Vite frontend for salon owners to manage their salon, services, bookings, and analytics.

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **HTTP**: Axios
- **Auth**: JWT stored in localStorage

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # http://localhost:3000
npm run build          # production build
```

## Environment Variables

See `.env.example`. Key variables:

| Variable                  | Description                          |
|---------------------------|--------------------------------------|
| `VITE_API_BASE_URL`       | Backend API URL                      |
| `VITE_GOOGLE_MAPS_API_KEY`| Google Maps API key (for salon map)  |
| `VITE_CUSTOMER_APP_URL`   | Customer app URL (for QR codes)      |

## Key Pages

| Route        | Description              |
|--------------|--------------------------|
| `/login`     | Owner login              |
| `/register`  | Owner registration (OTP) |
| `/dashboard` | Analytics dashboard      |
| `/salon`     | Salon profile management |
| `/services`  | Services management      |
| `/bookings`  | Booking management       |
