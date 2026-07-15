# Office Inventory System Backend

This repository contains the backend for the Office Computer System Inventory application.

## Features

- Authentication with JWT
- Admin, staff, and personnel role enforcement
- Personnel and user management
- Inventory CRUD with search, status filtering, and pagination
- Dashboard aggregation and activity logs
- Reports endpoints with Excel and PDF export
- Password reset via one-time codes
- Workspace isolation based on `owner_id`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example`.

3. Set `DATABASE_URL`, `JWT_SECRET`, and email settings.

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

   If `npm install` fails on Windows (especially inside OneDrive) with a Prisma rename/EPERM error, run:
   ```bash
   npm install --ignore-scripts
   npx prisma generate
   ```

5. Run the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /auth/login`
- `POST /auth/signup`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `GET /dashboard`
- `GET /personnel`
- `POST /personnel`
- `PUT /personnel/:id`
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`
- `PATCH /users/:id/reset-password`
- `GET /inventory`
- `POST /inventory`
- `PUT /inventory/:id`
- `DELETE /inventory/:id`
- `GET /reports/inventory`
- `GET /reports/device-status`
- `GET /reports/inventory/excel`
- `GET /reports/inventory/pdf`

## Notes

- The first signup call creates the initial workspace admin.
- All protected routes require `Authorization: Bearer <token>`.
- Admin-only routes are protected via role middleware.
- Reports endpoints validate status and date filters.
