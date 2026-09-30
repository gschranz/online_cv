// Leistungen als Probenfächer: Jede Leistung ist ein Streifen, der sich beim Sichtbarwerden
// aus einem Stapel auffächert. Die Inhalte stehen als .svc-card in #svc-list und werden
// hier nur gelesen (ohne JS bleibt die normale Kartenliste sichtbar).
(function () {
  'use strict';
  var wrap = document.getElementById('fan');
  var list = document.getElementById('svc-list');
  if (!wrap || !list) return;
  var stage = wrap.querySelector('.fan-stage');
  var detail = wrap.querySelector('.fan-detail');
  var cards = Array.prototype.slice.call(list.querySelectorAll('.svc-card'));
  if (!cards.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 'fan-' + Math.random().toString(36).slice(2, 7);
  var strips = [], current = -1, timer = 0, userTouched = false, visible = false;
  document.documentElement.classList.add('fan-on');
  stage.style.setProperty('--c', ((cards.length - 1) / 2).toString());

  function textOf(card, sel) {
    var e = card.querySelector(sel);
    return e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  cards.forEach(function (card, i) {
    var isCta = card.classList.contains('svc-cta');
    var title = isCta ? 'Ihr Thema?' : textOf(card, 'h3');
    var label = isCta ? title : (card.getAttribute('data-short') || title);
    var s = document.createElement('button');
    s.type = 'button';
    s.className = 'fan-strip';
    s.id = uid + '-t' + i;
    s.setAttribute('role', 'tab');
    s.setAttribute('aria-selected', 'false');
    s.setAttribute('aria-label', title);
    s.tabIndex = -1;
    s.style.setProperty('--i', i);
    var cap = document.createElement('span');
    cap.className = 'fan-cap';
    var icon = card.querySelector('svg');
    if (icon) cap.appendChild(icon.cloneNode(true));
    else cap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var name = document.createElement('span');
    name.className = 'fan-name';
    name.textContent = label;
    s.appendChild(cap);
    s.appendChild(name);
    s.addEventListener('click', function () { userTouched = true; select(i, true); });
    s.addEventListener('mouseenter', function () { userTouched = true; });
    s.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (e.key === 'Home') d = -cards.length;
      if (e.key === 'End') d = cards.length;
      if (!d) return;
      e.preventDefault();
      userTouched = true;
      var n = Math.max(0, Math.min(cards.length - 1, i + d));
      select(n, true);
      strips[n].focus();
    });
    stage.appendChild(s);
    strips.push(s);
  });
  detail.id = uid + '-panel';

  function select(i, animate) {
    if (i === current) return;
    current = i;
    strips.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle('is-sel', on);
      s.setAttribute('aria-selected', on ? 'true' : 'false');
      s.tabIndex = on ? 0 : -1;
    });
    var card = cards[i], isCta = card.classList.contains('svc-cta');
    detail.setAttribute('aria-labelledby', strips[i].id);
    detail.textContent = '';
    var num = document.createElement('span');
    num.className = 'fan-num';
    num.textContent = isCta ? 'Sonstiges' : 'L-' + ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + (cards.length - 1)).slice(-2);
    var h = document.createElement('h3');
    h.textContent = textOf(card, 'h3');
    var p = document.createElement('p');
    p.textContent = textOf(card, 'p');
    detail.appendChild(num); detail.appendChild(h); detail.appendChild(p);
    if (isCta) {
      var a = document.createElement('a');
      a.className = 'btn btn-primary';
      a.href = '#contact';
      a.textContent = 'Kontakt aufnehmen';
      detail.appendChild(a);
    }
    if (animate && !reduced) {
      detail.classList.remove('swap');
      void detail.offsetWidth;
      detail.classList.add('swap');
    }
  }

  // Automatisch durchblättern, bis die Besucherin oder der Besucher selbst wählt
  function tick() {
    timer = 0;
    if (userTouched || !visible || document.hidden) return schedule(1500);
    select((current + 1) % cards.length, true);
    schedule(4200);
  }
  function schedule(ms) { if (!timer) timer = setTimeout(tick, ms); }

  select(Math.floor(cards.length / 2), false);

  function open() {
    stage.classList.add('is-open');
    if (!reduced) schedule(3800);
  }
  if (reduced || !('IntersectionObserver' in window)) {
    stage.classList.add('is-open');
  } else {
    new IntersectionObserver(function (es, obs) {
      visible = es[0].isIntersecting;
      if (visible && !stage.classList.contains('is-open')) { setTimeout(open, 250); }
    }, { threshold: .35 }).observe(wrap);
  }
})();
