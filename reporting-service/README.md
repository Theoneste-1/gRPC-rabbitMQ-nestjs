# Reporting Service

The Reporting Service is responsible for generating analytical reports about parking operations. It consumes events from other services and provides aggregated data for business intelligence.

## Features

- **Revenue Reports**: Track total revenue, exits, average revenue per car, and revenue by parking location
- **Entry Reports**: List all car entries within a date range, filtered by parking location
- **Exit Reports**: List all car exits with duration, charges, and parking information
- **Occupancy Reports**: Track average occupancy rates and peak hours per parking location

## Architecture

- **gRPC Server**: Provides reporting services at port 5003
- **RabbitMQ Consumer**: Asynchronously consumes `car.entered` and `car.exited` events
- **PostgreSQL Database**: Stores transaction data for reporting

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- RabbitMQ (for event consumption)

### Installation

```bash
cd reporting-service
pnpm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=reporting_db
RABBITMQ_URL=amqp://localhost
REPORTING_GRPC_URL=127.0.0.1:5003
```

### Database Setup

The service uses TypeORM with automatic schema synchronization in development mode. Tables are created automatically on first run.

To manually create the database:

```bash
psql -U postgres -c "CREATE DATABASE reporting_db;"
```

### Running the Service

**Development:**

```bash
pnpm start:dev
```

**Production:**

```bash
pnpm build
pnpm start:prod
```

## API Endpoints (via API Gateway)

All endpoints are accessed through the API Gateway at `/reports` and require JWT authentication.

### Revenue Report

```
GET /reports/revenue?startDate=2024-01-01&endDate=2024-12-31&parkingCode=PARK001&page=1&limit=10
```

### Entries Report

```
GET /reports/entries?startDate=2024-01-01&endDate=2024-12-31&parkingCode=PARK001&page=1&limit=10
```

### Exits Report

```
GET /reports/exits?startDate=2024-01-01&endDate=2024-12-31&parkingCode=PARK001&page=1&limit=10
```

### Occupancy Report

```
GET /reports/occupancy?startDate=2024-01-01&endDate=2024-12-31&parkingCode=PARK001
```

## Event Schema

### car.entered Event

```json
{
  "transactionId": "uuid",
  "plateNumber": "ABC123",
  "parkingCode": "PARK001",
  "parkingName": "Downtown Parking",
  "entryTime": "2024-01-15T10:30:00Z"
}
```

### car.exited Event

```json
{
  "transactionId": "uuid",
  "plateNumber": "ABC123",
  "parkingCode": "PARK001",
  "exitTime": "2024-01-15T12:30:00Z",
  "durationHours": 2.0,
  "chargedAmount": 50.0
}
```

## gRPC Methods

The service exposes the following gRPC methods:

- `GetRevenueReport(ReportFilter) -> RevenueReport`
- `GetEntriesReport(ReportFilter) -> PaginatedEntriesReport`
- `GetExitsReport(ReportFilter) -> PaginatedExitsReport`
- `GetOccupancyReport(ReportFilter) -> OccupancyReport`

## Authorization

- **Authenticated users**: Can access reports based on their role
- **Admin role**: Full access to all reports
- **Attendant role**: May have restricted access (optional)

## Development

### Generate Protobuf Code

If proto files are modified, rebuild:

```bash
npm run build
```

### Run Tests

```bash
pnpm test
```

### Lint Code

```bash
pnpm lint
```

## Database Schema

### parking_transactions Table

| Column        | Type         | Description                                     |
| ------------- | ------------ | ----------------------------------------------- |
| id            | UUID         | Primary key                                     |
| transactionId | VARCHAR(50)  | Unique transaction identifier                   |
| plateNumber   | VARCHAR(20)  | Car plate number                                |
| parkingCode   | VARCHAR(20)  | Parking lot code                                |
| parkingName   | VARCHAR(100) | Parking lot name                                |
| entryTime     | TIMESTAMP    | Car entry timestamp                             |
| exitTime      | TIMESTAMP    | Car exit timestamp (nullable)                   |
| durationHours | DOUBLE       | Parking duration in hours                       |
| chargedAmount | DOUBLE       | Amount charged (nullable)                       |
| status        | VARCHAR(20)  | Transaction status (active/completed/cancelled) |
| createdAt     | TIMESTAMP    | Record creation timestamp                       |
| updatedAt     | TIMESTAMP    | Record update timestamp                         |

## Troubleshooting

### Connection Issues

- Verify RabbitMQ is running: `rabbitmq-plugins enable rabbitmq_management`
- Check database connectivity: `psql -h localhost -U postgres`

### Missing Events

- Ensure other services publish events to the correct RabbitMQ exchange: `parking_events`
- Check RabbitMQ logs for message routing issues

### Performance Issues

- Add database indexes on frequently queried fields (done by default)
- Consider pagination with reasonable limits for large date ranges

## Contributing

When modifying the reporting service:

1. Update proto files if API changes
2. Run `pnpm build` to regenerate code
3. Add tests for new report types
4. Update this README with changes

## License

UNLICENSED

# unit tests

$ pnpm run test

# e2e tests

$ pnpm run test:e2e

# test coverage

$ pnpm run test:cov

````

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
````

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
