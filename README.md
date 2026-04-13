# ClinicQ — Clinic Appointment & Token Management System

A full-stack production-ready web application for managing clinic appointments with an automated token queue system.

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | Node.js + Express.js |
| Database  | MySQL 8+ |
| Auth      | JWT (jsonwebtoken) + bcryptjs |
| HTTP      | Axios |

---

## Project Structure

```
clinic-system/
├── backend/
│   ├── config/          # DB connection pool
│   ├── controllers/     # Business logic per module
│   ├── middleware/      # JWT auth + RBAC + validation
│   ├── models/          # (schema handled in SQL)
│   ├── routes/          # Express route definitions
│   ├── services/        # Token generation + notifications
│   ├── utils/           # Helpers
│   ├── database/        # schema.sql + seed.sql
│   ├── app.js           # Entry point
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── context/     # AuthContext (JWT state)
    │   ├── services/    # Axios API wrappers
    │   ├── components/  # Reusable UI components
    │   └── pages/       # Login, Register, Dashboards
    └── vite.config.js
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- npm or yarn

---

### 1. Database Setup

```sql
-- In MySQL Workbench or mysql CLI:
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

---

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=clinic_db
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

```bash
# Start development server
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at: `http://localhost:5173`

---

## Demo Accounts

| Role    | Email                  | Password      |
|---------|------------------------|---------------|
| Admin   | admin@clinic.com       | Password@123  |
| Doctor  | sarah@clinic.com       | Password@123  |
| Doctor  | michael@clinic.com     | Password@123  |
| Patient | alice@example.com      | Password@123  |
| Patient | bob@example.com        | Password@123  |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth

| Method | Endpoint           | Auth | Description |
|--------|--------------------|------|-------------|
| POST   | /auth/register     | No   | Patient registration |
| POST   | /auth/login        | No   | Login (all roles) |
| GET    | /auth/me           | Yes  | Get current user |

**POST /auth/register**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "Password@123",
  "age": 30,
  "gender": "female",
  "phone": "9876543210"
}
```

**POST /auth/login**
```json
{
  "email": "alice@example.com",
  "password": "Password@123"
}
```
Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": 4, "name": "Alice Smith", "role": "patient" }
}
```

---

### Admin (role: admin)

| Method | Endpoint             | Description |
|--------|----------------------|-------------|
| POST   | /admin/add-doctor    | Add a doctor |
| GET    | /admin/doctors       | List all doctors |
| DELETE | /admin/doctors/:id   | Remove a doctor |
| GET    | /admin/patients      | List all patients |
| GET    | /admin/reports       | Dashboard stats |

**POST /admin/add-doctor**
```json
{
  "name": "Dr. Rahul Verma",
  "email": "rahul@clinic.com",
  "password": "Doctor@123",
  "specialization": "Neurologist"
}
```

---

### Doctor (role: doctor)

| Method | Endpoint                         | Description |
|--------|----------------------------------|-------------|
| GET    | /doctor/profile                  | Own profile |
| POST   | /doctor/availability             | Set availability |
| GET    | /doctor/availability             | View own schedule |
| GET    | /doctor/appointments             | View appointments (filter: ?date= &status=) |
| PUT    | /doctor/appointments/:id/status  | Mark completed/cancelled |
| GET    | /doctor/token/current            | View queue (?date=) |
| POST   | /doctor/token/next               | Call next patient |

**POST /doctor/availability**
```json
{
  "date": "2024-12-20",
  "start_time": "09:00",
  "end_time": "13:00"
}
```

**PUT /doctor/appointments/5/status**
```json
{ "status": "completed" }
```

---

### Patient (role: patient)

| Method | Endpoint                           | Description |
|--------|------------------------------------|-------------|
| GET    | /patient/profile                   | Own profile |
| PUT    | /patient/profile                   | Update profile |
| GET    | /patient/appointments              | Own appointments (with token position) |
| GET    | /patient/doctors                   | List all doctors |
| GET    | /patient/doctors/:id/availability  | Doctor's open slots |

---

### Appointments (role: patient)

| Method | Endpoint                     | Description |
|--------|------------------------------|-------------|
| POST   | /appointments/book           | Book appointment |
| PUT    | /appointments/reschedule/:id | Reschedule |
| DELETE | /appointments/cancel/:id     | Cancel |
| GET    | /appointments/:id            | View single |

**POST /appointments/book**
```json
{
  "doctor_id": 1,
  "date": "2024-12-20",
  "time": "10:00",
  "notes": "Chest pain since 2 days"
}
```
Response:
```json
{
  "success": true,
  "message": "Appointment booked successfully.",
  "appointment": {
    "id": 7,
    "token_number": 3,
    "status": "booked"
  }
}
```

---

### Token Queue

| Method | Endpoint                   | Description |
|--------|----------------------------|-------------|
| GET    | /tokens/queue/:doctorId    | View queue (?date=) |

Response:
```json
{
  "currentToken": 2,
  "queue": [
    { "token_number": 3, "patient_name": "Alice Smith", "time": "10:00" },
    { "token_number": 4, "patient_name": "Bob Wilson",  "time": "10:30" }
  ]
}
```

---

### Reports (role: admin / doctor)

| Method | Endpoint               | Description |
|--------|------------------------|-------------|
| GET    | /reports/daily         | Daily breakdown (?date=) |
| GET    | /reports/doctor/:id    | Doctor-wise (?from= &to=) |

---

## Token Queue Algorithm

```
BOOK APPOINTMENT:
  1. BEGIN TRANSACTION
  2. SELECT COALESCE(MAX(token_number), 0) FROM appointments
        WHERE doctor_id = X AND date = D
  3. new_token = max_token + 1
  4. INSERT appointment with token_number = new_token
  5. INSERT INTO tokens (doctor_id, date, current_token=0) ON DUPLICATE KEY IGNORE
  6. COMMIT

CALL NEXT:
  1. SELECT current_token FROM tokens WHERE doctor_id=X AND date=D
  2. SELECT MIN(token_number) FROM appointments
        WHERE doctor_id=X AND date=D AND status='booked' AND token_number > current_token
  3. UPDATE tokens SET current_token = next_token
  4. Doctor calls patient with that token number
```

---

## Security Features

- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens expire in 7 days
- RBAC middleware prevents cross-role access
- express-validator sanitizes all inputs
- helmet sets security HTTP headers
- Rate limiting: 100 requests per 15 min per IP
- SQL uses parameterized queries (no SQL injection)
- Double-booking prevention at DB level

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Double booking | 409 Conflict if same patient books same doctor on same day |
| Invalid time slot | Validates time falls within doctor's availability window |
| Unauthorized access | 403 Forbidden with clear message |
| Token duplication | Atomic transaction with MAX(token)+1 prevents duplicates |
| Expired JWT | 401 with redirect to login |
| Doctor not available | 400 with descriptive error |
| Cancel completed | 400 — cannot cancel a finished appointment |
