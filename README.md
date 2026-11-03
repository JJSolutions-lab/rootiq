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
