(function () {
  'use strict';

  // --- Find our own script tag ---
  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var testId = scriptTag.getAttribute('data-test-id');
  var landingId = scriptTag.getAttribute('data-landing-id');
  var variantId = scriptTag.getAttribute('data-variant-id');
  var endpoint = scriptTag.getAttribute('data-endpoint') || scriptTag.src.replace(/\/ab\.js.*$/, '');
  var trackingKey = scriptTag.getAttribute('data-tracking-key') || '';

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
  var viewKey = 'view:' + testId + ':' + variantId;
  if (!wasSent(viewKey)) {
    sendEvent('variant_view');
    markSent(viewKey);
  }

  // --- Auto: cta_click ---
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ab-click]');
    if (!el) return;
    var ctaId = el.getAttribute('data-ab-click');
    sendEvent('cta_click', { cta_id: ctaId });
  });

  // --- Auto: form_submit ---
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-ab-submit]');
    if (!form) return;
    var formId = form.getAttribute('data-ab-submit');
    sendEvent('form_submit', { form_id: formId });
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
