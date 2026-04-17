(function () {
  'use strict';

  // --- Find our own script tag ---
  // document.currentScript works for static script tags.
  // Falls back to querySelector for dynamically injected scripts (GHL, GTM, etc.)
  var scriptTag = document.currentScript
    || document.querySelector('script[src*="cro-tracking"]');
  if (!scriptTag) return;

  var testId = scriptTag.getAttribute('data-test-id');
  var landingId = scriptTag.getAttribute('data-landing-id');
  var variantId = scriptTag.getAttribute('data-variant-id');
  var endpoint = scriptTag.getAttribute('data-endpoint') || scriptTag.src.replace(/\/ab\.js.*$/, '');
  var trackingKey = scriptTag.getAttribute('data-tracking-key') || '';
  var clickSelector = scriptTag.getAttribute('data-ab-click-selector') || '';
  var submitSelector = scriptTag.getAttribute('data-ab-submit-selector') || '';

  // Named selector maps: {"hero_cta": ".btn-hero", "footer_cta": ".btn-footer"}
  var clickMap = {};
  var submitMap = {};
  try { clickMap = JSON.parse(scriptTag.getAttribute('data-ab-clicks') || '{}'); } catch (e) {}
  try { submitMap = JSON.parse(scriptTag.getAttribute('data-ab-submits') || '{}'); } catch (e) {}

  if (!testId || !landingId || !variantId) {
    console.warn('[ab-tracker] Missing required data attributes: data-test-id, data-landing-id, data-variant-id');
    return;
  }

  // --- Session ID ---
  var SESSION_KEY = '_ab_sid';
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : ('s_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  // --- Dedup tracking (client-side) ---
  var SENT_KEY = '_ab_sent';
  function getSent() {
    try { return JSON.parse(sessionStorage.getItem(SENT_KEY) || '{}'); } catch (e) { return {}; }
  }
  function markSent(key) {
    var sent = getSent();
    sent[key] = 1;
    sessionStorage.setItem(SENT_KEY, JSON.stringify(sent));
  }
  function wasSent(key) {
    return !!getSent()[key];
  }

  // --- Send event ---
  function sendEvent(eventName, extra) {
    var payload = {
      event_name: eventName,
      test_id: testId,
      landing_id: landingId,
      variant_id: variantId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
    };
    if (extra) {
      if (extra.cta_id) payload.cta_id = extra.cta_id;
      if (extra.form_id) payload.form_id = extra.form_id;
    }

    var url = endpoint + '/events';
    var headers = { 'Content-Type': 'application/json' };
    if (trackingKey) headers['X-Tracking-Key'] = trackingKey;

    // Use fetch when tracking key is set (sendBeacon can't send custom headers).
    // Use sendBeacon otherwise for reliability on page unload.
    if (trackingKey) {
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } else if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    }
  }

  // --- Auto: variant_view (once per session+test+variant) ---
  // data-view-delay="250" delays the view event so A/B tools that redirect
  // (e.g. from variant A → B) don't log a view on the intermediate page.
  var viewDelay = parseInt(scriptTag.getAttribute('data-view-delay'), 10) || 0;
  var viewKey = 'view:' + testId + ':' + variantId;
  function fireView() {
    if (!wasSent(viewKey)) {
      sendEvent('variant_view');
      markSent(viewKey);
    }
  }
  if (viewDelay > 0) {
    setTimeout(fireView, viewDelay);
  } else {
    fireView();
  }

  // --- Auto: cta_click ---
  document.addEventListener('click', function (e) {
    // Ignore programmatic clicks (element.click(), dispatchEvent, widget auto-fires)
    if (!e.isTrusted) return;
    // Match by data-ab-click attribute
    var el = e.target.closest('[data-ab-click]');
    if (el) {
      sendEvent('cta_click', { cta_id: el.getAttribute('data-ab-click') });
      return;
    }
    // Match by named selector map: data-ab-clicks='{"hero_cta": ".btn-hero"}'
    var clickMapKeys = Object.keys(clickMap);
    for (var i = 0; i < clickMapKeys.length; i++) {
      var name = clickMapKeys[i];
      if (e.target.closest(clickMap[name])) {
        sendEvent('cta_click', { cta_id: name });
        return;
      }
    }
    // Match by single CSS selector (legacy)
    if (clickSelector) {
      var matched = e.target.closest(clickSelector);
      if (matched) {
        sendEvent('cta_click', { cta_id: matched.id || matched.className || 'cta' });
      }
    }
  });

  // --- Auto: form_submit ---
  document.addEventListener('submit', function (e) {
    // Match by data-ab-submit attribute
    var form = e.target.closest('[data-ab-submit]');
    if (form) {
      sendEvent('form_submit', { form_id: form.getAttribute('data-ab-submit') });
      return;
    }
    // Match by named selector map: data-ab-submits='{"main_form": "form.contact"}'
    var submitMapKeys = Object.keys(submitMap);
    for (var j = 0; j < submitMapKeys.length; j++) {
      var sname = submitMapKeys[j];
      if (e.target.closest(submitMap[sname])) {
        sendEvent('form_submit', { form_id: sname });
        return;
      }
    }
    // Match by single CSS selector (legacy)
    if (submitSelector) {
      var matched = e.target.closest(submitSelector);
      if (matched) {
        sendEvent('form_submit', { form_id: matched.id || 'form' });
      }
    }
  });

  // --- Public API ---
  window.abTracker = {
    sendEvent: sendEvent,
    getSessionId: function () { return sessionId; },
    getConfig: function () {
      return { testId: testId, landingId: landingId, variantId: variantId, endpoint: endpoint };
    },
  };
})();
