# Website Generator Platform

## Business Requirement
Build a production-ready Next.js application that allows business owners to submit business details, choose a website template, generate a deployable website, and publish it to Vercel. Multiple users and sites must be supported concurrently.

## Application Architecture
- Use one Next.js application with React UI pages and server-side API routes or server actions.
- Client components may collect input and display status, but must never receive database, storage, email, or Vercel credentials.
- Keep database access, file processing, ZIP creation, template rendering, storage adapters, email delivery, and Vercel integration in server-only modules.
- Use `app/` or `pages/` consistently. Do not introduce a separate `Main.js` runtime unless it is an explicit Next.js entry point.

## API Responsibilities
- `POST /api/user-data`: validate and persist business details and uploaded-file metadata.
- `POST /api/sites/:id/generate`: create an idempotent generation job and return its job/site ID.
- `POST /api/sites/:id/deploy`: create an idempotent deployment job for a site in `Ready` state.
- `GET /api/sites/:id`: return authorized site status, URL, and safe failure information.
- Return consistent HTTP error responses. Do not expose stack traces, credentials, or internal storage paths.

## Input Data
The form must validate and collect:
- Owner name, email, and phone number.
- Business name, type, description, address, and working hours.
- Logo, cover image, and gallery images.
- Social media links.
- Selected template.
- Template-specific content: services and pricing; portfolio items; testimonials; map details; and call/WhatsApp details where applicable.
- Validate authorization, required fields, URL formats, file types, file sizes, image dimensions, and gallery limits on the server. Client validation is only a usability aid.

## Server Workflow
- Save user data and metadata in a transaction before starting generation.
- Generate the site from a versioned template and store the ZIP through the storage abstraction.
- Track jobs with an ID, retry count, timestamps, and idempotency key. Do not hold an API request open during generation or deployment.
- Use these site states and only allow documented transitions: `Draft`, `Building`, `Ready`, `Deploying`, `Published`, and `Failed`.
- Mark failures with a safe user-facing message and an internal correlation ID. Clean up partial artifacts where possible.

## Configuration and Secrets
- Use environment variables or a secret manager for PostgreSQL, Vercel, email, and storage credentials. Never store secrets in `Config.json`, source code, or logs.
- Document required variable names in `.env.example` without real values.
- Vercel configuration must include the team/project strategy, authentication, deployment polling, timeout, retry, and failure behavior.

## Database Contract
`Database/CreateTables.sql` must define PostgreSQL data types, primary keys, foreign keys, `NOT NULL` rules, unique constraints, indexes, defaults, timestamp behavior, and delete/update actions.

Required tables:
- `User`: account identity, unique email, optional unique phone, status, and timestamps.
- `UserData`: business details, storage object keys, social links, working hours, template-specific content, and template foreign key.
- `Template`: name, category, version, active status, and server-side template location.
- `Website`: owner, user-data and template references, storage object key, deployment URL/provider ID, state, failure reason, and lifecycle timestamps.
- `GenerationJob` and `DeploymentJob`: idempotency key, state, attempt count, correlation ID, error details, and timestamps.

Use foreign-key constraints and indexes for owner, status, and job lookups. Define explicitly whether an owner may have multiple businesses and generated websites.

## Storage
Use a storage-provider interface with these implementations:
- Local filesystem for development only.
- Vercel Blob, AWS S3, Cloudflare R2, or Azure Blob Storage for production.

Use private, collision-resistant object keys such as `users/{userId}/sites/{siteId}/uploads/...` and `.../artifacts/{jobId}.zip`. Store object keys and metadata in PostgreSQL, not local absolute paths. Enforce upload limits and content-type checks.

## Vercel Deployment
- Deploy only a validated, successfully generated artifact.
- Reuse or create the configured Vercel project according to an explicit naming and ownership policy.
- Persist the Vercel deployment/project identifiers and final URL.
- Poll deployment status asynchronously, apply retries with backoff, and transition the site to `Published` or `Failed`.
- Send the published URL by email only after successful persistence of the published state.

## Technology Stack
- Node.js, Next.js, React, PostgreSQL, npm.
- Vercel for hosting and deployment logs.
- Use a queue or durable background-job mechanism suitable for the deployment environment.

## Coding Standards
- Use readable, maintainable, scalable code and consistent naming.
- Keep secrets and server-only imports out of client bundles.
- Prefer typed request/response contracts and shared validation schemas.

## Logging and Recovery
- Use structured application logs with timestamp, level, event, user/site/job ID, and correlation ID.
- Log application, generation, deployment, validation, database, and provider events.
- Never log passwords, tokens, full personal records, uploaded content, or private object URLs.
- Use centralized production logging with retention and rotation. A local `Application.log` is development-only.
- On failure, roll back database transactions where applicable, update the job/site state, preserve an internal diagnostic reference, return a meaningful safe error, and keep unrelated requests running.

## Common Generated Website Requirements
- Home Page
- About Us Section
- Services Section
- Gallery Section
- Contact Section
- Social Media Links
- Business Information
- Mobile Responsive Design

## Website Templates

### SalonBusinessTemplate
A premium, modern, and visually appealing salon business website template designed for beauty salons, hair salons, spas, and grooming businesses.

Requirements:
- Professional and elegant UI/UX design.
- Fully responsive design for Desktop, Tablet, and Mobile devices.
- Attractive Home Page with hero banner.
- About Us section.
- Services section with service categories and pricing support.
- Image Gallery section.
- Business Hours section.
- Contact Us section.
- Google Maps integration placeholder.
- Social Media integration.
- Call Now and WhatsApp CTA buttons.
- SEO-friendly structure.
- Fast-loading and optimized design.
- Modern styling and animations.

Expected Outcome:
The generated website should look like a professionally developed commercial salon website and be suitable for real-world business usage.

### PhotoStudioBusinessTemplate
A premium, modern, and visually appealing photography studio website template designed for photographers, photo studios, wedding photographers, and creative agencies.

Requirements:
- Professional and premium UI/UX design.
- Fully responsive design for Desktop, Tablet, and Mobile devices.
- Attractive Home Page with hero banner.
- About Us section.
- Portfolio showcase section.
- Photography Services section.
- Image Gallery section.
- Testimonials section.
- Contact Us section.
- Social Media integration.
- Call Now and WhatsApp CTA buttons.
- SEO-friendly structure.
- Fast-loading and optimized design.
- Modern styling and animations.

Expected Outcome:
The generated website should look like a professionally developed commercial photography website and be suitable for real-world business usage.


## Folder Structure
Use the actual Next.js project structure consistently. A suggested layout is:

```text
app/
	page.jsx
	api/
		user-data/route.js
		sites/[id]/route.js
		sites/[id]/generate/route.js
		sites/[id]/deploy/route.js
components/
	Form.jsx
lib/
	db/
	storage/
	templates/
	generation/
	deployment/
	email/
	validation/
Database/
	CreateTables.sql
templates/
	SalonBusinessTemplate.jsx
	PhotoStudioBusinessTemplate.jsx
.env.example
AGENTS.md
```

Do not commit generated uploads, ZIP artifacts, credentials, or production logs. Local development artifacts must be gitignored and use the storage adapter rather than hard-coded application paths.
