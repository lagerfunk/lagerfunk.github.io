/* Website Factory client script: marks today's opening hours and makes the contact form friendlier. No tracking, no cookies, no storage. */
(function () {
  'use strict';

  // Today's weekday in the business's time zone (1 = Monday ... 7 = Sunday).
  function todayNumber() {
    try {
      var name = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(new Date());
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name) + 1;
    } catch (e) {
      return ((new Date().getDay() + 6) % 7) + 1;
    }
  }

  var today = todayNumber();
  var todayText = '';
  document.querySelectorAll('.hours tr[data-days]').forEach(function (row) {
    if (row.getAttribute('data-days').split(' ').indexOf(String(today)) === -1) return;
    row.classList.add('is-today');
    var cell = row.querySelector('td');
    if (cell) todayText = cell.textContent;
  });
  document.querySelectorAll('[data-today-line]').forEach(function (el) {
    if (!todayText) return;
    el.textContent = el.getAttribute('data-label') + ': ' + todayText;
    el.classList.add('is-ready');
  });

  var form = document.getElementById('kontaktformular');
  if (!form) return;
  form.setAttribute('novalidate', '');
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var backend = form.getAttribute('data-backend');

  function fieldError(input) {
    var id = input.getAttribute('aria-describedby');
    return id ? document.getElementById(id) : null;
  }

  function check(input) {
    var err = fieldError(input);
    var ok = input.checkValidity();
    if (input.type === 'email' && ok && input.value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    if (input.required && input.type !== 'checkbox' && !input.value.trim()) ok = false;
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) err.textContent = ok ? '' : err.getAttribute('data-msg');
    return ok;
  }

  var inputs = Array.prototype.slice.call(form.querySelectorAll('input[required], textarea[required]'));
  inputs.forEach(function (input) {
    input.addEventListener('blur', function () { if (input.value || input.getAttribute('aria-invalid')) check(input); });
    input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') check(input); });
    input.addEventListener('change', function () { if (input.type === 'checkbox') check(input); });
  });

  function payload() {
    var data = new FormData(form);
    var params = new URLSearchParams();
    data.forEach(function (value, key) { params.append(key, String(value)); });
    return params;
  }

  form.addEventListener('submit', function (event) {
    var bad = inputs.filter(function (input) { return !check(input); });
    if (bad.length) {
      event.preventDefault();
      status.className = 'form-status is-error';
      status.textContent = form.getAttribute('data-error');
      bad[0].focus();
      return;
    }
    var trap = form.querySelector('[name="firma"]');
    if (trap && trap.value) { event.preventDefault(); return; }
    status.className = 'form-status';
    status.textContent = '';

    if (backend === 'mailto') {
      event.preventDefault();
      var p = payload();
      var lines = [];
      p.forEach(function (value, key) { if (key !== 'firma' && key !== 'einwilligung') lines.push(key + ': ' + value); });
      var url = form.getAttribute('action').split('?')[0] + '?subject=' + encodeURIComponent(form.getAttribute('data-subject')) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.dispatchEvent(new CustomEvent('factory:mailto', { detail: url }));
      window.location.href = url;
      return;
    }
    if (backend === 'post' && window.fetch) {
      event.preventDefault();
      button.disabled = true;
      var label = button.textContent;
      button.textContent = form.getAttribute('data-sending');
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload().toString(),
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        window.location.href = form.getAttribute('data-thanks');
      }).catch(function () {
        button.disabled = false;
        button.textContent = label;
        status.className = 'form-status is-error';
        status.textContent = form.getAttribute('data-send-error');
      });
    }
    // netlify: the browser submits the form normally, Netlify stores it and shows the thank-you page.
  });
})();
