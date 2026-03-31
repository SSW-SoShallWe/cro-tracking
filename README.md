# CRO Tracker

A self-hosted, minimal A/B test tracker. One source of truth for test results across all landing pages regardless of what platform they live on. No analytics suite, no CRM, no attribution engine — just clean event tracking and reporting.

---

## Quick Start

1. Clone the repo
2. `cd server && npm install`
3. Create a Supabase project (free tier works)
4. Run the SQL schema in Supabase SQL Editor (paste contents of `sql/001_schema.sql`)
5. Copy `.env.example` to `.env` and fill in `DATABASE_URL` from Supabase (Settings > Database > Connection string > URI)
6. `npm run dev`
7. Open `http://localhost:3000/demo/variant-a.html`

---

## How to Instrument a Landing Page

Drop the script tag onto any page you want to track. No build step, no npm install.

```html
<script
  src="https://your-domain.com/ab.js"
  data-test-id="your_test_id"
  data-landing-id="your_landing_id"
  data-variant-id="A"
></script>

<button data-ab-click="hero_cta">Get a free quote</button>

<form data-ab-submit="main_form">
  ...
</form>
```

**Script tag attributes:**

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-test-id` | Yes | Identifies the A/B test (e.g. `headline_april_01`) |
| `data-landing-id` | Yes | Identifies the specific landing page (e.g. `lp_homepage`) |
| `data-variant-id` | Yes | The variant this page serves (e.g. `A` or `B`) |
| `data-endpoint` | No | Override the event ingestion URL (defaults to the script's own origin) |
| `data-tracking-key` | No | Optional auth key sent as `X-Tracking-Key` header on fetch requests |

**Element attributes:**

- `data-ab-click="<cta_id>"` — placed on any button or link; fires a `cta_click` event when clicked, using the attribute value as `cta_id`
- `data-ab-submit="<form_id>"` — placed on a `<form>` element; fires a `form_submit` event on submission, using the attribute value as `form_id`

A `variant_view` event is sent automatically on page load (once per session per test+variant combination).

**Manual tracking via the public API:**

```js
window.abTracker.sendEvent('cta_click', { cta_id: 'custom' })
```

Use this for interactions that cannot be captured with data attributes alone.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Supabase PostgreSQL connection string |
| `PORT` | No | `3000` | Server port |
| `CORS_ORIGINS` | No | `*` | Comma-separated list of allowed origins |
| `TRACKING_KEY` | No | — | Optional key for event ingestion auth |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window per IP |

---

## API Reference

### POST /events

Ingest a tracking event.

**Request body:**

```json
{
  "event_name": "variant_view",
  "test_id": "headline_april_01",
  "landing_id": "lp_homepage",
  "variant_id": "A",
  "session_id": "abc123",
  "timestamp": "2026-03-31T18:00:00.000Z",
  "cta_id": "hero_cta",
  "form_id": "main_form",
  "page_url": "https://example.com/lp"
}
```

`event_name` must be one of: `variant_view`, `cta_click`, or `form_submit`.

`cta_id`, `form_id`, and `page_url` are optional.

**Optional header:** `X-Tracking-Key: <your_key>`

**Responses:**

- `201 { "ok": true }` — event accepted
- `400 { "error": "Validation failed", "details": [...] }` — invalid payload

---

### GET /tests/:testId/report

Retrieve aggregated results for a test.

**Example response:**

```json
{
  "test_id": "headline_april_01",
  "variants": [
    {
      "variant_id": "A",
      "views": 834,
      "clicks": 122,
      "submits": 45,
      "ctr": 0.1463,
      "submit_rate": 0.0539
    },
    {
      "variant_id": "B",
      "views": 841,
      "clicks": 157,
      "submits": 62,
      "ctr": 0.1867,
      "submit_rate": 0.0737
    }
  ],
  "generated_at": "2026-03-31T18:00:00.000Z"
}
```

- `views` — unique sessions that saw this variant
- `clicks` — unique sessions that clicked a tracked CTA
- `submits` — unique sessions that submitted a tracked form
- `ctr` — clicks / views
- `submit_rate` — submits / views

---

### GET /health

Returns `{ "status": "ok" }`. Use this for uptime checks.

---

## Deduplication Strategy

| Event | Client-side | Server-side |
|-------|-------------|-------------|
| `variant_view` | `sessionStorage` flag (fires once per session + test + variant) | `UNIQUE` partial index + `ON CONFLICT DO NOTHING` |
| `cta_click` | None (all clicks recorded) | Reporting uses `COUNT(DISTINCT session_id)` |
| `form_submit` | None (all submits recorded) | Reporting uses `COUNT(DISTINCT session_id)` |

Views are deduplicated at both layers. Clicks and submits are stored raw; uniqueness is enforced at query time so that multiple form interactions within a session are still visible in the raw data.

---

## Security Notes

- **CORS** is configurable via `CORS_ORIGINS`. Set this to your domain(s) in production.
- **Tracking key** — set `TRACKING_KEY` in the environment and pass `X-Tracking-Key` from instrumented pages to require a shared secret on event ingestion.
- **Rate limiting** — `/events` is rate-limited by IP using `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- **No PII stored** — session IDs are anonymous random strings generated client-side and expire when the browser tab closes.
- **Honest note:** frontend tracking can always be spoofed; this provides reasonable barriers, not bulletproof security. For high-stakes decisions, cross-reference with server-side logs.

---

## Deploy to Render

1. Create a new **Web Service** in Render pointing to this repo
2. Set the **Build command:** `cd server && npm install && npm run build`
3. Set the **Start command:** `cd server && npm start`
4. Add environment variables: `DATABASE_URL`, `CORS_ORIGINS`, and optionally `TRACKING_KEY`

---

## Decisions Made

- **Express + Zod over Fastify** — simpler, more widely known, easier to onboard contributors
- **Single `ab_events` table** — sufficient for MVP event volume; avoids premature normalization
- **`sendBeacon` primary, `fetch` fallback** — `sendBeacon` survives page navigation and unload events; `fetch` is used when the Beacon API is unavailable
- **Session ID in `sessionStorage` (not `localStorage`)** — expires with tab close, which is the right scope for a session; does not persist across tabs or restarts
- **`ON CONFLICT DO NOTHING` for view dedup** — simple and correct; avoids the overhead of upsert logic for events we want to discard
- **No auth on report endpoint** — MVP is for internal use; protecting reports is left to network-level access controls or a future auth layer

---

## Simplified on Purpose

The following are known limitations, not oversights:

- No event batching — one HTTP request per event
- No retry logic in the tracker script
- No dashboard UI — JSON API only
- No statistical significance calculation
- No date range filtering on reports
- `sendBeacon` does not support custom headers, so the tracking key is skipped when `sendBeacon` is used (it is only sent on `fetch` fallback requests)

---

## v2 Ideas

- Event batching with queue flush on `visibilitychange`
- Simple dashboard UI
- Date range filters on the report endpoint
- Chi-squared or Z-test for statistical significance
- Event export to CSV
- Tracking key passed in the request payload (compatible with `sendBeacon`)
- Multiple simultaneous tests per page
