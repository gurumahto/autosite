# Autosite Generator

Autosite is a Next.js application for collecting business details, selecting a website template, saving site data in PostgreSQL, and processing website-generation jobs.

## Requirements

- Node.js 18.18 or newer
- npm
- PostgreSQL 14 or newer, or a hosted PostgreSQL provider
- Vercel account for production deployment

## Installation

Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd autosite
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env.local
```

On macOS/Linux, use:

```bash
cp .env.example .env.local
```

## Environment Variables

Configure `.env.local` with values for your environment:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/autosite
NEXT_PUBLIC_APP_URL=http://localhost:3000
STORAGE_PROVIDER=local
LOCAL_STORAGE_ROOT=.local-storage
WORKER_SECRET=replace-with-a-random-secret
CRON_SECRET=replace-with-a-random-secret
MAX_GENERATION_ATTEMPTS=3
```

Do not commit `.env.local` or any file containing credentials.

For Vercel, add the variables in **Project Settings > Environment Variables**. The production database URL must be a hosted PostgreSQL URL. Do not use `localhost` or `127.0.0.1` in Vercel.

## Database Setup

Create the database, then run the schema:

```bash
psql "$DATABASE_URL" -f Database/CreateTables.sql
```

On Windows PowerShell, if the connection string is not already available as an environment variable:

```powershell
psql "postgresql://username:password@localhost:5432/autosite" -f Database/CreateTables.sql
```

The schema creates users, templates, business data, websites, generation jobs, and deployment jobs.

## Start the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a production build:

```bash
npm run build
npm start
```

Check the application health and database connection:

```text
GET http://localhost:3000/api/health
```

A healthy response is:

```json
{"status":"ok","database":"ok"}
```

## Use the Application

1. Open the application homepage.
2. Enter the owner name, email, phone number, business name, business type, and description.
3. Select either the Salon Studio or Photo Studio template.
4. Select **Start building**.
5. The application saves the user, template, business data, draft website, and generation job in one transaction.
6. The site initially moves to `Building` while the generation worker processes the job.
7. Use the site status API to check progress after authentication is added.

The current form creates the core business record. Logo, cover image, gallery, social links, hours, and template-specific content are part of the data contract but are not yet exposed as form controls.

## API Endpoints

### Save business data

```http
POST /api/user-data
Content-Type: application/json
```

Example body:

```json
{
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "phone": "+15550100000",
  "businessName": "Northline Studio",
  "businessType": "Photography Studio",
  "description": "A creative photography studio.",
  "templateId": "photo-studio"
}
```

### Start generation for a site

```http
POST /api/sites/{siteId}/generate
x-user-id: {userId}
Idempotency-Key: unique-request-key
```

The generation endpoint requires the current development authorization header `x-user-id`. It creates an idempotent job and returns `202` when a new job is queued.

### Get site status

```http
GET /api/sites/{siteId}
x-user-id: {userId}
```

### Run one generation job

```http
POST /api/internal/generation/run
Authorization: Bearer ${CRON_SECRET}
```

This internal endpoint processes one queued generation job. In production it is scheduled automatically by Vercel Cron when `vercel.json` is deployed. For local testing, call it manually with the configured secret.

## Storage

Local development stores generated artifacts under the path configured by `LOCAL_STORAGE_ROOT`. Production cloud storage adapters are planned for Vercel Blob, Amazon S3, Cloudflare R2, and Azure Blob Storage.

Generated artifacts and credentials must not be committed to Git.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Select the Next.js framework preset.
4. Set the project root to the directory containing `package.json`.
5. Add the production `DATABASE_URL` from the hosted PostgreSQL database.
6. Add `CRON_SECRET` and `MAX_GENERATION_ATTEMPTS`.
7. Confirm the database schema has been executed on the hosted database.
8. Deploy the project.
9. Submit a disposable test record and inspect Vercel Runtime Logs.

Expected responses for a working setup:

- `GET /`: `200`
- `GET /api/health`: `200` with `database: "ok"`
- `POST /api/user-data`: `201`
- Generation request: `202`

## Troubleshooting

### `ECONNREFUSED 127.0.0.1:5432` on Vercel

The Vercel `DATABASE_URL` still points to local PostgreSQL. Replace it with the hosted database connection string and redeploy.

### `Module not found`

Confirm that the deployment uses the latest commit and that the Vercel project root contains `package.json`, `app/`, and `lib/`.

### `POST /api/user-data` returns `503`

Check the Vercel runtime logs and verify that:

- `DATABASE_URL` exists in the Production environment.
- The database is reachable from Vercel.
- `Database/CreateTables.sql` was executed.
- The database provider permits connections from Vercel.

### Generation remains `Building`

Confirm that `CRON_SECRET` is configured in Vercel and that the Cron job from `vercel.json` is active. Check the generation worker runtime logs.

## Validation Commands

```bash
npm run build
npm run lint
```

## Project Structure

```text
app/                         Next.js pages and API routes
app/api/health               Database health endpoint
app/api/user-data            Business data persistence endpoint
app/api/sites                 Site generation and status endpoints
app/api/internal/generation  Internal generation worker endpoint
lib/db                       PostgreSQL connection and transactions
lib/generation               Site rendering and generation worker
lib/logging                  Structured redacted logging
lib/storage                  Storage provider abstraction
Database/CreateTables.sql    PostgreSQL schema
vercel.json                  Vercel Cron configuration
.env.example                 Environment variable template
```
