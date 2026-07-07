# Attendance API

Attendance domain backend for the attendance product. Built with **NestJS + Prisma
+ PostgreSQL**. It does **not** manage identity — users and businesses live in the
separate `attendance-auth` service. This API only **verifies** the access tokens
that `attendance-auth` issues (shared `JWT_SECRET`, Bearer only) and owns the
attendance data: employments, punches, and revision requests.

## How it fits together

```
                 issues JWT (HS256, iss=attendance-auth)
   attendance-auth  ─────────────────────────────────────►  client (phone/app)
   (Next.js, users, businesses)                                  │
                                                                 │ Authorization: Bearer <accessToken>
                                                                 ▼
                                                          attendance-api  (this service)
                                                          verifies token · owns attendance DB
```

The client logs in against `attendance-auth`, gets an access token, and sends it as
`Authorization: Bearer <token>` to this API. This API verifies the signature and
`iss` claim with the shared secret and reads the principal (`userId`, `username`,
`role`, `businessId`) straight from the token — no call back to the auth service, no
users table here.

### The flow from the brief, mapped to endpoints

| Story | Endpoint |
| --- | --- |
| Employee gives their user id; company adds them to the employee list | `POST /api/employees` (owner) |
| Personal account effectively becomes an employee of that business | Employment row with `status=ACTIVE` |
| Employee goes to work daily and punches | `POST /api/attendance/punch` (employee) |
| Attendance data shows up on the employee's phone | `GET /api/attendance/me` (employee) |
| Wrong timing / leave — request a revision from the phone | `POST /api/revisions` (employee) |
| Company sees the request and accepts or rejects it | `GET /api/revisions` + `PATCH /api/revisions/:id` (owner) |

## Architecture

Everything is modularized — one folder per concern, no god-files.

```
src/
├─ main.ts                      # bootstrap: global prefix, validation, filter, interceptor
├─ app.module.ts               # composition root
├─ config/                     # env validation + typed config
├─ common/                     # cross-cutting: enums, decorators, guards' helpers, filter, interceptor, utils
│  ├─ decorators/              # @CurrentUser, @Roles, @Public
│  ├─ enums/                   # Role
│  ├─ filters/                 # HttpExceptionFilter -> { success:false, error:{message,code} }
│  ├─ interceptors/            # TransformInterceptor -> { success:true, data }
│  ├─ interfaces/              # AuthenticatedUser (token principal)
│  ├─ dto/                     # shared DateRangeQueryDto
│  └─ utils/                   # date helpers
├─ prisma/                     # PrismaModule + PrismaService (global)
├─ auth/                       # JWT bearer verification
│  ├─ jwt.strategy.ts          # verifies attendance-auth tokens
│  └─ guards/                  # JwtAuthGuard (global) + RolesGuard (global)
├─ health/                     # GET /health (public)
├─ employment/                 # owner manages employees; employee lists memberships
├─ attendance/                 # punch in/out; list own / business attendance
└─ revision/                   # employee requests; owner approves/rejects (applies changes)
```

### Auth & authorization model

- **Authentication** is global: `JwtAuthGuard` is registered as an `APP_GUARD`, so
  every route requires a valid Bearer token unless it is marked `@Public()`
  (only `/health`).
- **Coarse authorization** is role-based: `RolesGuard` reads `@Roles(Role.OWNER)`
  from a handler and checks the token's `role` claim. Owner-only endpoints use it.
- **Fine authorization** is data-based: an employee can punch or request a revision
  only if they have an `ACTIVE` employment. This is the source of truth for
  "who works where" and is checked in the service layer
  (`EmploymentService.resolveActiveEmployment`), independent of the token role.
  Owners are always scoped to their own `businessId` from the token.

### Response shape

Matches `attendance-auth` for a consistent client contract:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "error": { "message": "…", "code": "UNAUTHORIZED" } }
```

## Data model (this service's DB only)

- **Employment** — `(businessId, userId)` unique. Created by an owner, `ACTIVE` or
  `REMOVED`. Links an auth user to a business.
- **AttendanceRecord** — one row per `(userId, businessId, date)`. Holds `checkInAt`,
  `checkOutAt`, and `status` (`PRESENT` / `ON_LEAVE`).
- **RevisionRequest** — a `TIME_CORRECTION` or `LEAVE` request for a date; `PENDING`
  until an owner sets `APPROVED`/`REJECTED`. Approval is applied transactionally onto
  the matching `AttendanceRecord`.

## Interactive docs (Swagger)

Once the server is running, open **`http://127.0.0.1:4000/api/docs`** for the Swagger
UI. Click **Authorize**, paste an access token from `attendance-auth`, and every
endpoint is callable from the browser. The raw OpenAPI JSON is at
`http://127.0.0.1:4000/api/docs-json`.

## API reference

All routes are prefixed with `/api`. All require `Authorization: Bearer <token>`
except `GET /api/health`.

### Health
- `GET /api/health` — liveness + DB check. Public.

### Employees (owner)
- `POST /api/employees` — body `{ userId, username? }`. Add/re-activate an employee.
- `GET /api/employees?status=ACTIVE|REMOVED` — list the business's employees.
- `DELETE /api/employees/:userId` — deactivate an employment.

### Memberships (employee)
- `GET /api/me/employments` — businesses the caller actively belongs to.

### Attendance
- `POST /api/attendance/punch` — body `{ businessId? }`. First punch of the day is
  check-in, the next is check-out. `businessId` required only if the caller belongs
  to more than one business. Returns `{ action: "CHECK_IN" | "CHECK_OUT", record }`.
- `GET /api/attendance/me?from&to&businessId` — caller's own records.
- `GET /api/attendance?from&to&userId` — business records (owner).

### Revisions
- `POST /api/revisions` — body `{ businessId?, date, type, requestedCheckInAt?,
  requestedCheckOutAt?, reason }`. `type` is `TIME_CORRECTION` or `LEAVE`.
  A `TIME_CORRECTION` must supply at least one requested time.
- `GET /api/revisions/me?status` — caller's own requests.
- `GET /api/revisions?status&userId` — business requests (owner).
- `PATCH /api/revisions/:id` — body `{ decision: APPROVED|REJECTED, decisionNote? }`
  (owner). Approving applies the change to the attendance record.

`from`/`to` are `YYYY-MM-DD` (or ISO). Dates are tracked per calendar day in UTC.

## Configuration

Copy `.env.example` to `.env`. Key variables:

| Var | Meaning |
| --- | --- |
| `DATABASE_URL` | This API's own Postgres (separate DB from auth). |
| `JWT_SECRET` | **Must equal** `attendance-auth`'s `JWT_SECRET`. Verify-only here. |
| `JWT_ISSUER` | Expected `iss` claim. Default `attendance-auth`. |
| `PORT` | HTTP port (default `4000`). |

Env is validated at startup (`src/config/env.validation.ts`); the app refuses to
boot on a missing/short secret or bad config.

## Running

### Docker (recommended)

Brings up Postgres + the API, runs migrations on start:

```bash
cp .env.example .env    # set JWT_SECRET to match attendance-auth, set a DB password
docker compose up --build
```

API on `http://127.0.0.1:4000`. The DB is not published to the host.

### Local dev

```bash
npm install
cp .env.example .env                 # point DATABASE_URL at your Postgres
npm run prisma:migrate:dev           # create/apply migrations
npm run start:dev                    # watch mode on PORT
```

## Build & migrations

- `npm run build` — `prisma generate` + `nest build` → `dist/`.
- `npm run prisma:migrate` — `prisma migrate deploy` (used by the Docker entrypoint).
- `npm run start:prod` — run the compiled server.

## Notes on token compatibility

`attendance-auth` signs access tokens with `HS256`, `iss=attendance-auth`, and claims
`sub` (userId), `username`, `role`, `businessId`. This API's `JwtStrategy` mirrors
exactly that: same algorithm, same issuer, same secret. Access tokens are short-lived
(15m in auth); refresh/rotation stays entirely in `attendance-auth`.
