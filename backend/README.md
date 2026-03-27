# Smart Barber - Backend API

Express.js REST API for the Smart Barber salon booking platform.

## Tech Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (access + refresh tokens)
- **SMS/OTP**: Twilio
- **Email**: Nodemailer + Gmail SMTP
- **Image Upload**: Cloudinary
- **Payments**: Razorpay
- **Maps**: Google Maps API
- **Logging**: Winston + Morgan

## Setup

```bash
npm install
cp .env.example .env   # fill in your credentials
npm run dev            # development (nodemon)
npm start              # production
```

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Owner Auth
| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| POST   | `/owner/auth/send-otp`         | Send OTP for registration            |
| POST   | `/owner/auth/verify-otp`       | Verify OTP (returns phone only)      |
| POST   | `/owner/auth/register`         | Register owner (phone, otp, name, email, password) |
| POST   | `/owner/auth/login`            | Login (identifier, password)         |
| GET    | `/owner/auth/me`               | Get current owner (auth required)    |
| POST   | `/owner/auth/refresh-token`    | Refresh access token                 |
| POST   | `/owner/auth/logout`           | Logout                               |

### Owner Salon
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/owner/salon`                  | Create salon             |
| GET    | `/owner/salon`                  | Get my salon             |
| PUT    | `/owner/salon`                  | Update salon             |
| PUT    | `/owner/salon/photos`           | Update salon photos      |
| GET    | `/owner/salon/approval-status`  | Get approval status      |

### Owner Services
| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| POST   | `/owner/services`                 | Add service          |
| GET    | `/owner/services`                 | List services        |
| PUT    | `/owner/services/:serviceId`      | Update service       |
| DELETE | `/owner/services/:serviceId`      | Delete service       |

### Owner Analytics
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/owner/analytics/dashboard`      | Dashboard stats          |
| GET    | `/owner/analytics/booking-stats`  | Booking statistics       |

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable               | Description                        |
|------------------------|------------------------------------|
| `MONGODB_URI`          | MongoDB connection string          |
| `JWT_SECRET`           | JWT signing secret (keep strong)   |
| `JWT_REFRESH_SECRET`   | Refresh token secret               |
| `GOOGLE_MAPS_API_KEY`  | Google Maps API key                |
| `CLOUDINARY_*`         | Cloudinary image upload credentials|
| `GMAIL_USER`           | Gmail address for emails           |
| `GMAIL_APP_PASSWORD`   | Gmail app password (not your login)|
| `TWILIO_*`             | Twilio SMS credentials             |
| `RAZORPAY_*`           | Razorpay payment credentials       |

## Scripts

```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Start production server
npm run seed   # Seed the database
npm run lint   # Run ESLint
```
