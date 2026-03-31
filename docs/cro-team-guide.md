# A/B Test Tracker — CRO Team Guide

## What is this?

Our own tracking system for A/B test results. One script tag on each landing page variant, and we get unified results across all platforms (GHL, custom landings, Typeform, etc.).

It tracks three things automatically:
- **Page views** per variant (who saw what)
- **CTA clicks** (who clicked)
- **Form submits** (who converted)

---

## Quick start

Add this script to your landing page. That's it.

```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="your_test_name"
  data-landing-id="your_landing_id"
  data-variant-id="A"
></script>
```

The page view is tracked automatically as soon as the script loads. No extra code needed for that.

---

## Naming convention

| Attribute | What to put | Example |
|---|---|---|
| `data-test-id` | Name of the test. **Same across all variants.** | `headline_june_01`, `cta_color_test_02` |
| `data-landing-id` | Identifies which landing page | `mortgage_lp_01`, `solar_lp_chicago` |
| `data-variant-id` | Which variant this specific page is | `A`, `B`, `control`, `red_cta`, etc. |

**Important:** Both variants of the same test must share the same `data-test-id`. That's how we group them in the report.

---

## Tracking clicks and form submits

### Option A: You control the HTML (custom elements) 

Add `data-ab-click` to any clickable element and `data-ab-submit` to any form:

```html
<button data-ab-click="hero_cta">Get a free quote</button>

<a href="/apply" data-ab-click="nav_cta">Apply now</a>

<form data-ab-submit="main_form">
  ...
</form>
```

### Option B: You can't edit the HTML (GHL, page builders) — RECOMMENDED FOR GHL

Use named selectors to tell the tracker which elements to watch and what to call them:

```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="headline_june_01"
  data-landing-id="mortgage_lp_01"
  data-variant-id="A"
  data-ab-clicks='{"hero_cta": ".hero-btn", "footer_cta": ".ftr-btn"}'
  data-ab-submits='{"main_form": "form"}'
></script>
```

The format is JSON: `{"your_name": ".css-selector"}`. You choose the name, the CSS selector targets the GHL element.

- `hero_cta`, `footer_cta`, `main_form` — **these are your names**, they show up in the report data
- `.hero-btn` — **this is GHL's class**, you find it by inspecting the element


**You can track multiple buttons separately:**
```html
data-ab-clicks='{"hero_cta": ".button-abc123", "footer_cta": ".button-xyz789", "sidebar_cta": "#sidebar-btn"}'
```

Each one gets its own name in the data, so you know exactly which button was clicked.

**Selector syntax:**
- `.class-name` — matches a CSS class
- `#element-id` — matches an id
- `button` — matches a tag name

**Simple mode (single unnamed selector)** — still works but not recommended for GHL because you can't tell buttons apart:
```html
data-ab-click-selector=".btn-primary"
data-ab-submit-selector="form"
```

### Option C: Typeform, Calendly, or other embeds

Use the JavaScript API after the tracker loads:

```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="headline_june_01"
  data-landing-id="mortgage_lp_01"
  data-variant-id="A"
></script>

<script>
  // Call this when the user completes the Typeform/Calendly/etc.
  window.abTracker.sendEvent('form_submit', { form_id: 'typeform_main' });
</script>
```

For Typeform specifically, listen for the submit message:
```html
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'form-submit') {
      window.abTracker.sendEvent('form_submit', { form_id: 'typeform_main' });
    }
  });
</script>
```

---

## Where to put the script

| Platform | Where |
|---|---|
| **GHL** | Settings > Tracking Code > Head tracking code |
| **Custom HTML landing** | Before `</body>` or in `<head>` |
| **WordPress** | Theme header or via a plugin like Insert Headers and Footers |

---

## Full example: GHL A/B test

**Variant A page** — in GHL tracking code header:
```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="headline_june_01"
  data-landing-id="mortgage_lp_01"
  data-variant-id="A"
  data-ab-clicks='{"hero_cta": ".button-aLgelNHdkl_btn", "footer_cta": ".button-qWerty_btn"}'
  data-ab-submits='{"main_form": "form"}'
></script>
```

**Variant B page** — same but change variant-id (and selectors if GHL generates different classes per page):
```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="headline_june_01"
  data-landing-id="mortgage_lp_01"
  data-variant-id="B"
  data-ab-clicks='{"hero_cta": ".button-Zxcvbn_btn", "footer_cta": ".button-Asdfgh_btn"}'
  data-ab-submits='{"main_form": "form"}'
></script>
```

**What stays the same between variants:** `data-test-id`, `data-landing-id`, and the **names** you give each button (`hero_cta`, `footer_cta`).

**What changes:** `data-variant-id` and the **CSS selectors** (because GHL generates different classes per page).

---

## Full example: Custom landing with Typeform

```html
<script
  src="https://cro-tracking.onrender.com/ab.js"
  data-test-id="headline_june_01"
  data-landing-id="solar_lp_01"
  data-variant-id="A"
  data-ab-click-selector="#get-quote-btn"
></script>

<button id="get-quote-btn">Get a quote</button>

<div id="typeform-container"></div>
<script src="//embed.typeform.com/next/embed.js"></script>
<script>
  window.tf.createWidget('abc123', {
    container: document.getElementById('typeform-container'),
    onSubmit: function () {
      window.abTracker.sendEvent('form_submit', { form_id: 'typeform_quote' });
    }
  });
</script>
```

---

## Checking results

Ask the team or hit this URL directly:

```
https://cro-tracking.onrender.com/tests/YOUR_TEST_ID/report
```

Example:
```
https://cro-tracking.onrender.com/tests/headline_june_01/report
```

Returns:
```json
{
  "test_id": "headline_june_01",
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
  ]
}
```

- **views** = unique sessions that saw the variant
- **clicks** = unique sessions that clicked the CTA
- **submits** = unique sessions that submitted a form
- **ctr** = clicks / views
- **submit_rate** = submits / views

---

## Debugging

If tracking isn't working, open the landing page in Chrome and go to DevTools (F12):

**1. Check the tracker loaded:**
```js
window.abTracker
```
Should return an object. If `undefined`, the script didn't load.

**2. Check config:**
```js
window.abTracker.getConfig()
```
Verify testId, landingId, variantId look correct.

**3. Check Network tab:**

Filter by `events`. You should see a POST request when the page loads (variant_view) and when you click/submit.

**4. Check your CSS selector matches (for GHL):**
```js
document.querySelectorAll('.your-selector')
```
Should return the elements you want to track. If empty, the selector is wrong.

**5. Manually fire a test event:**
```js
window.abTracker.sendEvent('cta_click', { cta_id: 'debug_test' })
```

---

## Rules

- **One `data-test-id` per test** — both variants share it
- **One script tag per page** — don't add it twice
- **Don't change test IDs mid-test** — you'll split your data
- **Variant IDs should be short and clear** — `A`/`B`, `control`/`new_headline`, etc.
