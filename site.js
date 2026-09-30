// Scroll Progress Bar
const bar = document.getElementById('progress-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
}, { passive: true });

// Scroll Reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
// Lazy init for lang bars
document.querySelectorAll('.lang-item.reveal').forEach(el => observer.observe(el));

// ── Navigation: aktiver Abschnitt, mobiles Menü, Ein-/Ausblenden beim Scrollen ──
(function () {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav-toggle');
  const links = Array.from(nav.querySelectorAll('.nav-links a'));

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (open) nav.classList.remove('is-hidden');
  }
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
  });

  // Beim Runterscrollen ausblenden, beim Hochscrollen zeigen
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 8);
    const busy = nav.classList.contains('is-open') || nav.contains(document.activeElement);
    if (busy || y < 80 || y < lastY - 4) nav.classList.remove('is-hidden');
    else if (y > lastY + 4) nav.classList.add('is-hidden');
    if (Math.abs(y - lastY) > 4) lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  onScroll();

  // Aktiven Abschnitt markieren (nur Anker auf dieser Seite)
  const targets = links
    .map(a => ({ a, id: a.hash && a.pathname === location.pathname ? a.hash.slice(1) : '' }))
    .map(o => ({ a: o.a, el: o.id && document.getElementById(o.id) }))
    .filter(o => o.el);
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const visible = new Map();
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => visible.set(en.target, en.isIntersecting));
    let current = null;
    targets.forEach(t => { if (visible.get(t.el)) current = current || t; });
    targets.forEach(t => t.a.classList.toggle('is-active', t === current));
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(t => spy.observe(t.el));
})();
