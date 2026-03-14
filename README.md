# Smart Barber - Salon Booking System

A full-stack SaaS platform for barber shops and salons. Salon owners can register, manage their salon, services, and bookings. Customers can discover salons, book appointments, and manage favourites.

## Project Structure

```
smart_barber/
├── barber-shop-backend/       # Express.js REST API (Node.js)
├── salon-owner-frontend/      # React + Vite (Owner dashboard)
├── salon-user-frontend/       # React + Vite (Customer app)
└── admin-frontend/            # React + Vite (Admin panel)
```

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | Node.js, Express.js, MongoDB (Mongoose)         |
| Frontend  | React 18, Vite, Tailwind CSS                    |
| Auth      | JWT (access + refresh tokens), OTP via Twilio   |
| Storage   | Cloudinary (images)                             |
| Payments  | Razorpay                                        |
| Maps      | Google Maps API                                 |
| Email     | Nodemailer + Gmail SMTP                         |

## Getting Started

### Prerequisites

- Node.js >= 14
- MongoDB (local or Atlas)
- npm >= 6

### 1. Clone the repository

```bash
git clone https://github.com/your-username/smart-barber.git
cd smart-barber
```

### 2. Backend setup

```bash
cd barber-shop-backend
npm install
cp .env.example .env        # then fill in your real values
npm run dev
```

### 3. Owner Frontend setup

```bash
cd salon-owner-frontend
npm install
cp .env.example .env        # then fill in your real values
npm run dev
```

### 4. Customer Frontend setup

```bash
cd salon-user-frontend
npm install
cp .env.example .env        # then fill in your real values
npm run dev
```

### 5. Admin Frontend setup

```bash
cd admin-frontend
npm install
cp .env.example .env        # then fill in your real values
npm run dev
```

## Environment Variables

Each sub-project has a `.env.example` file listing all required variables with descriptions. Copy it to `.env` and fill in your credentials.

**Never commit `.env` files.** They are already excluded via `.gitignore`.

## API Base URL

```
http://localhost:5000/api/v1
```

See `barber-shop-backend/routes/index.js` for all available endpoints.

## License

ISC
