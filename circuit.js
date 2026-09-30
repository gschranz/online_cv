// Platinen-Effekt: Ein Klick im Hero lässt an der Klickstelle kurz einen Schaltkreis
// sichtbar werden, der hinter der Seite liegt. Basis ist ein 4K-Standbild (scharf),
// darüber liegen die isolierten Lichtimpulse aus dem Hailuo-Video (mix-blend: screen).
(function () {
  'use strict';
  var fx = document.getElementById('circuit-fx');
  var hero = document.querySelector('header.hero');
  if (!fx || !hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fx.remove(); return; }

  var root = document.documentElement;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var img = null, video = null, loaded = false;
  var t0 = 0, raf = 0, x = 0, y = 0, R = 0, last = -Infinity;
  var GROW = 700, HOLD = 350, FADE = 950, PEAK = .55, COOLDOWN = 1100;

  function load() {
    if (loaded) return;
    loaded = true;
    var px = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1);
    img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.src = px > 2200 ? 'assets/circuit-3840.webp' : 'assets/circuit-1920.webp';
    fx.appendChild(img);
    if (!saveData && window.innerWidth >= 600) {
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-hidden', 'true');
      video.src = 'assets/circuit-pulse.mp4';
      fx.appendChild(video);
    }
  }

  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

  function frame(now) {
    var t = now - t0;
    var r, o;
    if (t < GROW) {
      var k = easeOut(t / GROW);
      r = R * k; o = PEAK * Math.min(1, t / (GROW * .4));
    } else if (t < GROW + HOLD) {
      r = R; o = PEAK;
    } else if (t < GROW + HOLD + FADE) {
      var f = (t - GROW - HOLD) / FADE;
      r = R * (1 + .18 * f); o = PEAK * (1 - f * f);
    } else {
      fx.style.opacity = '0';
      if (video) video.pause();
      raf = 0;
      return;
    }
    fx.style.setProperty('--r', r.toFixed(1) + 'px');
    fx.style.opacity = o.toFixed(3);
    raf = requestAnimationFrame(frame);
  }

  function trigger(e) {
    if (e.button > 0 || e.target.closest('a, button, input, textarea, select')) return;
    var now = performance.now();
    if (now - last < COOLDOWN) return;
    last = now;
    load();
    x = e.clientX; y = e.clientY;
    R = Math.max(360, Math.hypot(window.innerWidth, window.innerHeight) * .42);
    fx.style.setProperty('--x', x + 'px');
    fx.style.setProperty('--y', y + 'px');
    if (video && video.readyState >= 2 && video.duration) {
      try {
        video.currentTime = Math.random() * Math.max(0, video.duration - 2.2);
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } catch (err) {}
    }
    t0 = now;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  hero.addEventListener('pointerdown', trigger);

  // Vorab laden, sobald das Intro vorbei ist, damit der erste Klick sofort wirkt.
  function preload() {
    if (root.classList.contains('splash-active')) { setTimeout(preload, 500); return; }
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 800);
  }
  preload();
})();
