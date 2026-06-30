---
spec: subscription
phase: design
created: 2026-05-06T00:00:00Z
---

# Design: Subscription Module

## Overview

A self-hosted mailing list built on top of the existing Postgres database. Residents subscribe via a form on the site, receive a confirmation email, and can unsubscribe via a token link in any email. Email delivery is handled by a thin `app/lib/email.ts` abstraction that supports Nodemailer (SMTP) and Resend (HTTP API).

## Data Model

Add to `prisma/schema.prisma`:

```prisma
model Subscriber {
  id               Int       @id @default(autoincrement())
  email            String    @unique @db.VarChar(254)
  cityId           Int?
  status           String    @default("active") @db.VarChar(20) // "active" | "unsubscribed"
  confirmed        Boolean   @default(false)
  confirmToken     String    @unique @db.VarChar(36)  // UUID
  unsubscribeToken String    @unique @db.VarChar(36)  // UUID
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  city             City?     @relation(fields: [cityId], references: [id], onDelete: SetNull)

  @@index([email])
  @@index([confirmToken])
  @@index([unsubscribeToken])
}
```

Also add `subscribers Subscriber[]` to the `City` model relation.

## Email Abstraction (`app/lib/email.ts`)

Single exported function with provider selected at runtime:

```ts
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void>
```

**Provider selection logic:**
1. If `RESEND_API_KEY` is set → use Resend HTTP API (`fetch` to `https://api.resend.com/emails`)
2. Else if `SMTP_HOST` is set → use Nodemailer transporter
3. Else → throw a clear config error

**Required env vars:**

| Provider | Vars |
|----------|------|
| Nodemailer | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` |
| Both | `NEXT_PUBLIC_BASE_URL` (for building token links) |

### Free provider options

| Option | Free tier | Notes |
|--------|-----------|-------|
| **Resend** | 3 000 emails/month, 100/day | Modern API, great DX, recommended |
| **Gmail SMTP via Nodemailer** | ~500/day | Needs Google App Password; personal use only |
| **Brevo (Sendinblue)** | 300/day | SMTP or API; no daily cap on contacts |
| **SendGrid** | 100/day forever | Requires domain verification |

## API Routes

### `POST /api/subscribe`

Server Action or Route Handler in `app/api/subscribe/route.ts`.

1. Validate email format (basic regex or `zod`).
2. Upsert `Subscriber`: if email exists and `status = unsubscribed`, reactivate; if `confirmed = true`, return "already subscribed."
3. Generate `confirmToken` and `unsubscribeToken` (crypto.randomUUID()).
4. Call `sendEmail` with confirmation link.
5. Return `{ ok: true }` or `{ ok: false, error: string }`.

### `GET /api/confirm`

Route Handler in `app/api/confirm/route.ts`.

1. Look up subscriber by `confirmToken`.
2. Set `confirmed = true`.
3. Redirect to `/` with `?subscribed=confirmed` or render a minimal success page.

### `GET /api/unsubscribe`

Route Handler in `app/api/unsubscribe/route.ts`.

1. Look up subscriber by `unsubscribeToken`.
2. Set `status = unsubscribed`.
3. Render a plain "You've been unsubscribed" page.

## UI Components

### `SubscribeForm` (`app/components/SubscribeForm.tsx`)

Client component (`"use client"`).

- Controlled email input with HTML5 `type="email"` validation.
- Calls `POST /api/subscribe` via `fetch` on submit.
- Three states: idle → loading → success | error.
- Success: shows "Check your inbox to confirm your subscription."
- Error: shows server error message.
- Accepts optional `cityId?: number` prop to associate subscription with a city.

**Placement:**
- Home page (`app/page.tsx`): below the city cards section, full-width.
- City page (`app/[state]/[city]/page.tsx`): below the meeting list.

## Email Templates (plain text / minimal HTML)

### Confirmation email

```
Subject: Confirm your subscription to City Council Transcripts

Hi,

Click the link below to confirm your subscription:
<NEXT_PUBLIC_BASE_URL>/api/confirm?token=<confirmToken>

If you didn't subscribe, ignore this email.

— City Council Transcripts
```

Footer of every email:
```
To unsubscribe: <NEXT_PUBLIC_BASE_URL>/api/unsubscribe?token=<unsubscribeToken>
```

## File Layout

```
app/
  api/
    subscribe/route.ts
    confirm/route.ts
    unsubscribe/route.ts
  components/
    SubscribeForm.tsx
  lib/
    email.ts
prisma/
  migrations/<timestamp>_add_subscriber/migration.sql
  schema.prisma           ← add Subscriber model
scripts/
  list-subscribers.mjs    ← admin utility (stretch)
.env.example              ← document new vars
```

## Ralph Iteration Plan

1. **DB iteration**: add `Subscriber` model, generate and apply migration.
2. **Email lib iteration**: implement `app/lib/email.ts` with both providers; verify with env var switching.
3. **API iteration**: implement three route handlers with unit-style gate scripts.
4. **UI iteration**: implement `SubscribeForm`, embed on home and city pages.
5. **Hardening**: run all gates, verify confirmation and unsubscribe flows end-to-end.

## Definition of Done

- Subscribe form renders on home and city pages.
- Valid email submission creates a `Subscriber` row and sends a confirmation email.
- Confirmation link sets `confirmed = true`.
- Unsubscribe link sets `status = unsubscribed`.
- Provider switchable via env var with no code changes.
- All gates pass.
