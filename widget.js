/* SiftAI Human Verification Widget
 * Usage:
 *   <script src="https://YOUR-SIFTAI-DOMAIN/widget.js" async></script>
 *   <div class="siftai-widget" data-sitekey="site_xxx" data-callback="onVerified"></div>
 * On success a hidden input named "siftai-token" is added to the enclosing <form>.
 * Verify that token server-side via POST /functions/widgetApi { action: "siteverify", secret, token }.
 */
(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var endpoint = origin + '/functions/widgetApi';

  function post(body) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function el(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.setAttribute('style', style);
    if (text) e.textContent = text;
    return e;
  }

  function render(container) {
    if (container.getAttribute('data-siftai-ready')) return;
    container.setAttribute('data-siftai-ready', '1');
    var siteKey = container.getAttribute('data-sitekey');
    var callbackName = container.getAttribute('data-callback');

    var box = el('div', 'font-family:system-ui,sans-serif;border:1px solid #d0d5dd;border-radius:8px;padding:12px 14px;max-width:320px;background:#fff;color:#111;font-size:14px;');
    var title = el('div', 'font-weight:600;margin-bottom:6px;', 'Verify you are human');
    var question = el('div', 'margin-bottom:8px;color:#444;', 'Loading challenge…');
    var row = el('div', 'display:flex;gap:8px;');
    var input = el('input', 'flex:1;padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:14px;');
    input.type = 'number';
    input.placeholder = 'Answer';
    var button = el('button', 'padding:6px 12px;border:0;border-radius:6px;background:#0ea5e9;color:#fff;font-weight:600;cursor:pointer;', 'Verify');
    button.type = 'button';
    var status = el('div', 'margin-top:8px;font-size:12px;color:#666;min-height:16px;');
    var brand = el('div', 'margin-top:6px;font-size:11px;color:#999;text-align:right;', 'Protected by SiftAI');

    row.appendChild(input); row.appendChild(button);
    box.appendChild(title); box.appendChild(question); box.appendChild(row); box.appendChild(status); box.appendChild(brand);
    container.appendChild(box);

    var challengeToken = null;

    function loadChallenge() {
      status.textContent = '';
      input.value = '';
      post({ action: 'challenge', site_key: siteKey }).then(function (res) {
        if (res.error) { question.textContent = res.error; button.disabled = true; return; }
        challengeToken = res.challenge_token;
        question.textContent = res.instruction;
      }).catch(function () { question.textContent = 'Could not load challenge.'; });
    }

    function onSuccess(token) {
      container.setAttribute('data-siftai-token', token);
      var form = container.closest('form');
      if (form) {
        var hidden = form.querySelector('input[name="siftai-token"]');
        if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'siftai-token'; form.appendChild(hidden); }
        hidden.value = token;
      }
      row.style.display = 'none';
      question.textContent = 'Verified';
      question.style.color = '#16a34a';
      status.textContent = '';
      if (callbackName && typeof window[callbackName] === 'function') window[callbackName](token);
    }

    button.addEventListener('click', function () {
      if (!challengeToken) return;
      button.disabled = true;
      status.textContent = 'Checking…';
      post({ action: 'verify', site_key: siteKey, challenge_token: challengeToken, answer: input.value }).then(function (res) {
        button.disabled = false;
        if (res.success) return onSuccess(res.token);
        status.textContent = res.error || 'Incorrect. Try again.';
        status.style.color = '#dc2626';
        loadChallenge();
      }).catch(function () { button.disabled = false; status.textContent = 'Network error.'; });
    });

    loadChallenge();
  }

  function init() {
    var nodes = document.querySelectorAll('.siftai-widget[data-sitekey]');
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }

  window.SiftAI = {
    render: render,
    getResponse: function (container) { return container.getAttribute('data-siftai-token') || null; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
