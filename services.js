// Leistungen als Probenfächer: Blätter aus eloxiertem Aluminium, gehalten von einer Schraube
// unten links. Die Reihenfolge der Blätter ändert sich nie; ein gewähltes Blatt klappt ganz
// nach außen und liegt dort frei, erst dann erscheint der Text dazu.
// Die Inhalte stehen als .svc-card in #svc-list (ohne JS bleibt diese Liste sichtbar).
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
  var strips = [], current = -1;
  document.documentElement.classList.add('fan-on');
  stage.style.setProperty('--n', String(cards.length));
  stage.removeAttribute('role');
  stage.removeAttribute('aria-label');
  detail.removeAttribute('role');
  detail.id = uid + '-detail';
  detail.setAttribute('aria-hidden', 'true');

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
    s.setAttribute('aria-expanded', 'false');
    s.setAttribute('aria-controls', detail.id);
    s.setAttribute('aria-label', title);
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
    s.addEventListener('click', function () { select(i === current ? -1 : i); });
    s.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      strips[Math.max(0, Math.min(cards.length - 1, i + d))].focus();
    });
    stage.appendChild(s);
    strips.push(s);
  });

  var pivot = document.createElement('span');
  pivot.className = 'fan-pivot';
  pivot.setAttribute('aria-hidden', 'true');
  stage.appendChild(pivot);

  function fill(i) {
    var card = cards[i], isCta = card.classList.contains('svc-cta');
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
    if (!reduced) {
      detail.classList.remove('swap');
      void detail.offsetWidth;
      detail.classList.add('swap');
    }
  }

  function select(i) {
    current = i;
    strips.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle('is-sel', on);
      s.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    wrap.classList.toggle('has-sel', i >= 0);
    detail.setAttribute('aria-hidden', i >= 0 ? 'false' : 'true');
    if (i >= 0) fill(i);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current >= 0) {
      var s = strips[current];
      select(-1);
      s.focus();
    }
  });

  function open() {
    stage.classList.add('is-open');
    setTimeout(function () { stage.classList.add('is-ready'); }, 900 + cards.length * 70);
  }
  if (reduced || !('IntersectionObserver' in window)) {
    stage.classList.add('is-open', 'is-ready');
  } else {
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting) { obs.disconnect(); setTimeout(open, 200); }
    }, { threshold: .35 }).observe(wrap);
  }
})();
