---
spec: subscription
phase: requirements
created: 2026-05-06T00:00:00Z
---

# Requirements: Subscription Module

## Goal
Allow residents to subscribe to a mailing list so they receive email updates when new city council transcripts are published. The module covers the subscribe UI, subscriber storage, email delivery, and unsubscribe flow.

## Scope Summary
- Subscribe form embedded on the home page and city pages
- Subscriber storage in the existing Postgres database
- Confirmation email sent on subscribe
- One-click unsubscribe via tokenized link
- Email delivery via **Nodemailer** (SMTP) with **Resend** as a first-class alternative (both documented)

## Architecture Constraints
- Uses Next.js App Router server actions and API route handlers.
- Email credentials stored in `.env` — never committed to git.
- Unsubscribe token must be unforgeable (random UUID, not email-derived).
- No third-party marketing platform required — self-hosted list only.

## User Stories

### US-1: Subscribe to the mailing list
**As a** resident  
**I want** to enter my email and click Subscribe  
**So that** I receive updates when new transcripts are available

**Acceptance Criteria:**
- [ ] AC-1.1: A subscribe form (email input + submit button) is visible on the home page (`/`).
- [ ] AC-1.2: The form is also available on each city page so residents can subscribe to city-specific updates.
- [ ] AC-1.3: Submitting a valid email saves the subscriber to the database with `status = active`.
- [ ] AC-1.4: If the email is already subscribed, the form responds gracefully (no duplicate row; informative message returned).
- [ ] AC-1.5: An invalid or blank email shows a client-side validation error before submission.
- [ ] AC-1.6: On success, the form displays a confirmation message ("Check your inbox to confirm").
- [ ] AC-1.7: A confirmation email is sent to the subscriber immediately after signup.

### US-2: Confirm email address
**As a** new subscriber  
**I want** to click a confirmation link in my inbox  
**So that** my subscription is verified and active

**Acceptance Criteria:**
- [ ] AC-2.1: The confirmation email contains a unique tokenized link pointing to `/api/confirm?token=<uuid>`.
- [ ] AC-2.2: Visiting the confirmation link sets `confirmed = true` on the subscriber record.
- [ ] AC-2.3: The confirmation page/response indicates success or "already confirmed."
- [ ] AC-2.4: Tokens expire after 72 hours; expired tokens show an error with a re-send option (stretch).

### US-3: Unsubscribe
**As a** subscriber  
**I want** to click "Unsubscribe" in any email  
**So that** I stop receiving updates

**Acceptance Criteria:**
- [ ] AC-3.1: Every outbound email includes an unsubscribe link: `/api/unsubscribe?token=<uuid>`.
- [ ] AC-3.2: Visiting the unsubscribe link sets `status = unsubscribed` on the subscriber record.
- [ ] AC-3.3: Re-subscribing with the same email reactivates the record rather than creating a duplicate.
- [ ] AC-3.4: The unsubscribe response is a plain success page (no login required).

### US-4: Email delivery infrastructure
**As a** developer  
**I want** a well-documented email-sending layer  
**So that** I can swap providers without rewriting business logic

**Acceptance Criteria:**
- [ ] AC-4.1: A single `app/lib/email.ts` module exports `sendEmail({ to, subject, html })`.
- [ ] AC-4.2: The module supports **Nodemailer** (SMTP) configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars.
- [ ] AC-4.3: The module also supports **Resend** (HTTP API) configured via `RESEND_API_KEY`; provider is selected by which env var is set.
- [ ] AC-4.4: `.env.example` documents all required variables with placeholder values and provider notes.
- [ ] AC-4.5: Email sending failures are logged server-side and return a structured error — they never crash the subscribe flow silently.

### US-5: Subscriber data model
**As a** developer  
**I want** subscriber data stored in the existing Postgres database  
**So that** the list is durable and queryable

**Acceptance Criteria:**
- [ ] AC-5.1: A `Subscriber` model is added to `prisma/schema.prisma` with fields: `id`, `email` (unique), `cityId` (nullable FK to `City`), `status` (`active` | `unsubscribed`), `confirmed` (boolean), `confirmToken` (UUID), `unsubscribeToken` (UUID), `createdAt`, `updatedAt`.
- [ ] AC-5.2: A Prisma migration is generated and applied for the new model.
- [ ] AC-5.3: `email` is indexed for fast lookup.
- [ ] AC-5.4: Both tokens are indexed for fast token-lookup on confirm/unsubscribe routes.

### US-6: Admin visibility (stretch)
**As a** developer / admin  
**I want** a simple list of active subscribers  
**So that** I can audit the mailing list

**Acceptance Criteria:**
- [ ] AC-6.1: A server-only script `scripts/list-subscribers.mjs` prints all active, confirmed subscribers to stdout.
- [ ] AC-6.2: The script is documented in `README.md`.

## Out of Scope
- Digest scheduling / cron (hook point defined, not implemented)
- Rich HTML email templates (plain text acceptable for v1)
- Authentication-gated subscriber management UI
- Bulk import of existing lists
- Analytics / open-rate tracking

## Success Criteria
- A resident can subscribe from the home or city page and receive a confirmation email.
- The unsubscribe link in any email immediately deactivates the subscription.
- Email provider can be swapped by changing env vars only.
- All new DB fields are covered by a Prisma migration.
