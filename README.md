# RootIQ AI

Production-oriented manufacturing quality management, root-cause analysis, CAPA, and inspection platform.

## Architecture

- `apps/web` — Next.js, TypeScript, Tailwind CSS, shadcn-style Radix components, Recharts
- `apps/api` — NestJS REST API, JWT HttpOnly sessions, Prisma, PostgreSQL, Puppeteer reports
- `services/vision` — FastAPI/PyTorch service boundary for validated solar EL image models
- `docker-compose.yml` — local PostgreSQL 17 database

The API applies the authenticated `tenantId` to every product-data query. Dashboard metrics are calculated from persisted inspection, defect, and CAPA records; they are not hard-coded frontend values.

## Start the real product locally

Requirements: Node.js 20+, npm, Docker Desktop.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Virtual solar manufacturing machine

With the API and web app running, open a second PowerShell window and run:

```powershell
npm run simulate
```

The simulator sends a production record and EL inspection every five seconds. High rejection cycles also create a quality issue automatically. For a short test, use `npm run simulate -- --cycles=3`. Configure it with `SIM_API_URL`, `SIM_EMAIL`, `SIM_PASSWORD`, and `SIM_INTERVAL_MS` environment variables.

Seeded administrator:

- Email: `admin@rootiq.local`
- Password: `RootIQ@2026`

API health is available through authenticated endpoints at `http://localhost:4000/api`.

## Optional AI configuration

Set `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL` in `.env`. The RCA endpoint uses strict JSON-schema output and stores suggestions on the root-cause record. AI output is explicitly treated as an investigation hypothesis, never a verified finding.

## Optional EL image service

```powershell
cd services/vision
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The vision endpoint accepts real images but deliberately returns no fabricated detection results until a validated PyTorch checkpoint is integrated.

## Production notes

- Replace `JWT_SECRET` with at least 32 random characters.
- Set `COOKIE_SECURE=true` behind HTTPS.
- Host PostgreSQL on a managed service and keep it private to the API network.
- Put the NestJS API and Python service behind HTTPS.
- Configure object storage before enabling evidence and EL-image uploads.
- Run Prisma migrations during deployment before starting the API.

## Connect a cPanel PostgreSQL database

1. In **PostgreSQL Databases**, create a database such as `rootiq`. cPanel
   automatically adds the account prefix, for example `jeevame_rootiq`.
2. Under **PostgreSQL Users**, create a separate user with a strong password.
3. Add that user to the database and grant **All Privileges**.
4. In the cPanel Node.js application's environment variables, configure:

```text
DATABASE_URL=postgresql://CPANEL_DB_USER:URL_ENCODED_PASSWORD@localhost:5432/CPANEL_DB_NAME?schema=public
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
COOKIE_SECURE=true
WEB_ORIGIN=https://your-web-domain.example
NEXT_PUBLIC_API_URL=https://your-api-domain.example/api
```

Use the exact prefixed database and user names shown by cPanel. If PostgreSQL
is hosted on another server, replace `localhost`, allow the API server in
**Remote PostgreSQL**, and add `&sslmode=require` when the provider requires
TLS. Never put the database password in frontend code or in
`NEXT_PUBLIC_*` variables.

After uploading/installing the application, initialize the production schema:

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
```

Run `db:seed` only for a new database. Start the API with
`npm run start -w @rootiq/api` and the web app with
`npm run start -w @rootiq/web` (or configure these as separate cPanel Node.js
applications).
