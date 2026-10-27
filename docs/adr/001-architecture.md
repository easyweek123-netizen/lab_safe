# ADR 001: Architecture and core domain model

Status: accepted (feature 000)

## Decision
- **Monorepo** (pnpm workspaces): `apps/api` (NestJS + TypeORM), `apps/web` (React + Vite + Tailwind + shadcn/ui), `packages/shared` (zod schemas = API contract), `e2e` (Playwright).
- **Contract-first**: every request/response shape is a zod schema in `packages/shared`. The API validates with it (`ZodValidationPipe`); the web uses it for forms (react-hook-form) and for MSW mock handlers. Changing the contract is a deliberate, reviewed step.
- **PostgreSQL 16** via docker compose (dev on 5442, tests on 5443 with tmpfs). TypeORM with `synchronize: false`: **schema changes only through migration files**.
- **Revision model** for safety pages:
  - `instruments` holds identity (`slug`), `published_revision_id` (nullable) and `deleted_at`.
  - `instrument_revisions` holds all page content plus `status` (PENDING/APPROVED/REJECTED), `review_note`, `submitted_by`, `reviewed_by`, `approved_at`.
  - Public reads go **only** through `published_revision_id` on non-deleted instruments. This one invariant enforces R1 and US8: a pending update never affects what students see.
  - A partial unique index allows at most one PENDING revision per instrument.
- **Auth**: email + password (argon2), JWT in an httpOnly cookie. Users have `role` (CONTRIBUTOR/ADMIN) and `status` (PENDING/APPROVED/REJECTED).
- **AI assistant** (feature 009): an `LlmProvider` interface with a deterministic `FakeLlmProvider` for tests. The site-wide hourly limit is an atomic upsert on `ai_usage(hour_bucket)`.
- **Photos**: a `StorageService` interface; local disk volume for now.

## Why
The revision model keeps "nothing goes live without approval" a data invariant rather than a UI convention, which a reviewer agent can check mechanically. Contract-first lets backend and frontend agents work in parallel without coordinating.
