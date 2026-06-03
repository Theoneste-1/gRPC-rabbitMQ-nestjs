# XWZ Parking System Backend Integration Guide

This guide explains how to run and test the backend microservices for the XWZ LTD parking management system.

## Backend Coverage

The backend now covers the required assignment features:

- User signup, login, JWT validation, refresh token, forgot password, and reset password.
- User roles: `ADMIN` and `ATTENDANT`.
- Parking registration, parking listing, parking lookup, available spaces, and fee per hour.
- Car entry, ticket generation, car exit, bill generation, and vacant-space updates.
- Reports for entered cars, outgoing cars, revenue, and occupancy between date ranges.
- Swagger UI through the API Gateway.
- RabbitMQ events for reporting and email notifications.
- Pagination on list/report endpoints.

## Services

| Service                | Responsibility                             | Default Port              |
| ---------------------- | ------------------------------------------ | ------------------------- |
| `api-gateway`          | Public HTTP API + Swagger                  | `3000`                    |
| `auth-service`         | Users, roles, JWT auth                     | HTTP `3001`, gRPC `50051` |
| `parking-service`      | Parking locations and spaces               | gRPC `5002`               |
| `transaction-service`  | Car entry, exit, tickets, bills            | gRPC `5004`               |
| `reporting-service`    | Revenue, entries, exits, occupancy reports | gRPC `5003`               |
| `notification-service` | Email notifications from RabbitMQ events   | RabbitMQ consumer         |

## Infrastructure

Start PostgreSQL and RabbitMQ first.

```bash
docker run --name xwz-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
docker run --name xwz-rabbitmq -p 5672:5672 -p 15672:15672 -d rabbitmq:3.12-management
```

Create databases:

```bash
psql -h localhost -U postgres -c "CREATE DATABASE auth_db;"
psql -h localhost -U postgres -c "CREATE DATABASE parking_db;"
psql -h localhost -U postgres -c "CREATE DATABASE transaction_db;"
psql -h localhost -U postgres -c "CREATE DATABASE reporting_db;"
```

## Environment Files

Use these minimum `.env` values.

`auth-service/.env`

```env
HTTP_PORT=3001
GRPC_AUTH_PORT=50051
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=auth_db
JWT_SECRET=super-secret
JWT_REFRESH_SECRET=refresh-secret
FRONTEND_URL=http://localhost:5173
RABBITMQ_URL=amqp://localhost
```

`parking-service/.env`

```env
PARKING_GRPC_URL=127.0.0.1:5002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=parking_db
RABBITMQ_URL=amqp://localhost
```

`transaction-service/.env`

```env
TRANSACTION_GRPC_URL=127.0.0.1:5004
PARKING_GRPC_URL=localhost:5002
AUTH_GRPC_URL=localhost:50051
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=transaction_db
RABBITMQ_URL=amqp://localhost
```

`reporting-service/.env`

```env
REPORTING_GRPC_URL=127.0.0.1:5003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=reporting_db
RABBITMQ_URL=amqp://localhost
```

`notification-service/.env`

```env
RABBITMQ_URL=amqp://localhost
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=Parking System <no-reply@xwz.local>
OPERATOR_EMAILS=admin@xwz.local
```

`api-gateway/.env`

```env
GATEWAY_PORT=3000
AUTH_GRPC_URL=localhost:50051
PARKING_GRPC_URL=localhost:5002
TRANSACTION_GRPC_URL=localhost:5004
REPORTING_GRPC_URL=localhost:5003
```

## Install Dependencies

Run once in each service folder:

```bash
pnpm install
```

## Startup Order

Open separate terminals and start services in this order:

```bash
cd auth-service
pnpm start:dev
```

```bash
cd parking-service
pnpm start:dev
```

```bash
cd transaction-service
pnpm start:dev
```

```bash
cd reporting-service
pnpm start:dev
```

```bash
cd notification-service
pnpm start:dev
```

```bash
cd api-gateway
pnpm start:dev
```

Swagger UI:

```text
http://localhost:3000/api/docs
```

RabbitMQ management UI:

```text
http://localhost:15672
```

## Main API Flow

### 1. Register Admin

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Admin\",\"lastName\":\"User\",\"email\":\"admin@xwz.local\",\"password\":\"password123\",\"role\":\"ADMIN\"}"
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@xwz.local\",\"password\":\"password123\"}"
```

Copy `accessToken` from the response and use it as:

```text
Authorization: Bearer <accessToken>
```

### 3. Register Parking

Admin only.

```bash
curl -X POST http://localhost:3000/parkings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"code\":\"KGL001\",\"name\":\"Downtown Parking\",\"location\":\"Kigali City Center\",\"totalSpaces\":50,\"feePerHour\":1000}"
```

### 4. View Parkings

Admin or attendant.

```bash
curl "http://localhost:3000/parkings?page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### 5. Register Car Entry

Admin or attendant.

```bash
curl -X POST http://localhost:3000/transactions/entry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"plateNumber\":\"RAD 123A\",\"parkingCode\":\"KGL001\",\"driverEmail\":\"driver@example.com\"}"
```

This returns a digital ticket and decreases available spaces.

### 6. Register Car Exit

Admin or attendant.

```bash
curl -X POST http://localhost:3000/transactions/exit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"plateNumber\":\"RAD 123A\",\"parkingCode\":\"KGL001\",\"driverEmail\":\"driver@example.com\"}"
```

This returns a bill and increases available spaces.

### 7. View Active Cars

```bash
curl "http://localhost:3000/transactions/active?page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### 8. Search by Plate

```bash
curl "http://localhost:3000/transactions/plate/RAD%20123A" \
  -H "Authorization: Bearer <accessToken>"
```

### 9. Transaction History

```bash
curl "http://localhost:3000/transactions/history?startDate=2026-06-02T00:00:00Z&endDate=2026-06-02T23:59:59Z&page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### 10. Reports

Entries:

```bash
curl "http://localhost:3000/reports/entries?startDate=2026-06-02T00:00:00Z&endDate=2026-06-02T23:59:59Z&page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

Exits and total amount collected:

```bash
curl "http://localhost:3000/reports/exits?startDate=2026-06-02T00:00:00Z&endDate=2026-06-02T23:59:59Z&page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

Revenue:

```bash
curl "http://localhost:3000/reports/revenue?startDate=2026-06-02T00:00:00Z&endDate=2026-06-02T23:59:59Z&page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

Occupancy:

```bash
curl "http://localhost:3000/reports/occupancy?startDate=2026-06-02T00:00:00Z&endDate=2026-06-02T23:59:59Z" \
  -H "Authorization: Bearer <accessToken>"
```

## Endpoint Summary

| Method | Path                               | Role             |
| ------ | ---------------------------------- | ---------------- |
| `POST` | `/auth/register`                   | Public           |
| `POST` | `/auth/login`                      | Public           |
| `POST` | `/auth/refresh`                    | Public           |
| `POST` | `/auth/forgot-password`            | Public           |
| `POST` | `/auth/reset-password`             | Public           |
| `GET`  | `/auth/profile`                    | Authenticated    |
| `POST` | `/parkings`                        | Admin            |
| `GET`  | `/parkings`                        | Admin, Attendant |
| `GET`  | `/parkings/:code`                  | Admin, Attendant |
| `POST` | `/transactions/entry`              | Admin, Attendant |
| `POST` | `/transactions/exit`               | Admin, Attendant |
| `GET`  | `/transactions/active`             | Admin, Attendant |
| `GET`  | `/transactions/history`            | Admin, Attendant |
| `GET`  | `/transactions/plate/:plateNumber` | Admin, Attendant |
| `GET`  | `/reports/entries`                 | Authenticated    |
| `GET`  | `/reports/exits`                   | Authenticated    |
| `GET`  | `/reports/revenue`                 | Authenticated    |
| `GET`  | `/reports/occupancy`               | Authenticated    |

## Notes

- Reporting depends on transaction events through RabbitMQ. Keep `reporting-service`, `transaction-service`, and RabbitMQ running when testing reports.
- Email notifications require SMTP. For local development, MailHog or Mailpit on port `1025` works well.
- `driverEmail` is optional on car entry/exit. If supplied, notification service can send ticket and bill emails.
- All list endpoints support pagination using `page` and `limit`.
