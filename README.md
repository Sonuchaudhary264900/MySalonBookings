# My Salon Bookings

A full-stack SaaS platform for salons and barber shops. Salon owners can register, manage their salon, services, staff, and bookings. Customers can discover nearby salons, book appointments, manage favourites, and track booking history.

## Project Structure

```
MySalonBookings/
├── barber-shop-backend/       # Node.js + Express REST API
├── salon-owner-frontend/      # React + Vite (Owner web dashboard)
├── salon-user-frontend/       # React + Vite (Customer web app)
├── admin-frontend/            # React + Vite (Admin panel)
├── salon-owner-android/       # React Native + Expo (Owner Android app)
└── salon-user-android/        # React Native + Expo (Customer Android app)
```

## Tech Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| Backend        | Node.js 18+, Express.js, MongoDB (Mongoose)                 |
| Web Frontend   | React 18, Vite, Tailwind CSS                                |
| Android Apps   | React Native 0.76, Expo SDK 52                              |
| Navigation     | React Navigation v7 (Stack, Bottom Tabs, Drawer)            |
| Auth           | JWT (access + refresh tokens), OTP via Twilio               |
| Storage        | Cloudinary (images)                                         |
| Payments       | Razorpay                                                    |
| Maps           | Google Maps API, Expo Location                              |
| Email          | Nodemailer + Gmail SMTP                                     |
| Real-time      | Socket.IO                                                   |
| Notifications  | In-app notification polling (NotificationContext)           |

## Apps Overview

### Backend — `barber-shop-backend`
- REST API with JWT auth, role-based access (owner / customer / admin)
- Salon registration with admin approval workflow
- Bookings, services, reviews, reports endpoints
- Razorpay payment integration
- Cloudinary image uploads
- Winston logging, Helmet security, rate limiting

### Owner Web — `salon-owner-frontend`
- Salon registration and admin approval flow
- Dashboard: bookings, services, staff, reports, reviews
- Real-time booking notifications

### Customer Web — `salon-user-frontend`
- Discover and search salons by location/category
- Book appointments, manage history, favourites

### Admin Panel — `admin-frontend`
- Approve/reject salon registrations
- Manage users, salons, and platform settings

### Owner Android — `salon-owner-android`
- Expo SDK 52, React Native 0.76
- Dark sidebar drawer navigation
- Manage bookings, services, reports, reviews, profile
- Real-time notifications
- Bundle ID: `com.mysalonbookings.owner`

### Customer Android — `salon-user-android`
- Expo SDK 52, React Native 0.76
- Bottom tab + drawer navigation
- Browse salons, book appointments, favourites, notifications
- Dark mode default, theme toggle
- Bundle ID: `com.mysalonbookings.user`

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm >= 8
- Expo Go app (for Android development)

### 1. Clone the repository

```bash
git clone https://github.com/Sonuchaudhary264900/MySalonBookings.git
cd MySalonBookings
```

### 2. Backend

```bash
cd barber-shop-backend
npm install
cp .env.example .env    # fill in your credentials
npm run dev             # runs on http://localhost:5000
```

### 3. Owner Web

```bash
cd salon-owner-frontend
npm install
cp .env.example .env
npm run dev
```

### 4. Customer Web

```bash
cd salon-user-frontend
npm install
cp .env.example .env
npm run dev
```

### 5. Admin Panel

```bash
cd admin-frontend
npm install
cp .env.example .env
npm run dev
```

### 6. Owner Android App

```bash
cd salon-owner-android
npm install
npx expo start
```

### 7. Customer Android App

```bash
cd salon-user-android
npm install
npx expo start
```

Scan the QR code with Expo Go on your Android device.

## API Base URL

```
http://localhost:5000/api/v1
```

## Environment Variables

Each sub-project has a `.env.example` listing all required variables. Copy to `.env` and fill in your credentials.

**Never commit `.env` files** — they are excluded via `.gitignore`.

## Key API Routes

| Module                | Prefix                          |
|-----------------------|---------------------------------|
| Customer Auth         | `/api/v1/customer/auth`         |
| Customer Salons       | `/api/v1/customer/salons`       |
| Customer Bookings     | `/api/v1/customer/bookings`     |
| Customer Favourites   | `/api/v1/customer/favorites`    |
| Owner Auth            | `/api/v1/owner/auth`            |
| Owner Salon           | `/api/v1/owner/salon`           |
| Owner Bookings        | `/api/v1/owner/bookings`        |
| Owner Services        | `/api/v1/owner/services`        |
| Admin                 | `/api/v1/admin`                 |

## License

ISC
