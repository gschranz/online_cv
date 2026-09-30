// ── PDF-Download ──
// Baut den Lebenslauf direkt aus den Inhalten der Seite als eigenes,
// sauber layoutetes PDF (jsPDF, lokal eingebunden -- kein CDN, kein
// Backend). Bewusst kein window.print(): der Browser-Druckdialog liefert
// kein konsistentes Layout und würde auch das (auf der Seite versteckte)
// Impressum/Datenschutz mit ausgeben. jsPDF wird erst beim ersten Klick
// nachgeladen, damit der Erstbesuch nicht mit ~400 KB belastet wird.
let jsPdfLoadPromise = null;
function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  if (jsPdfLoadPromise) return jsPdfLoadPromise;
  jsPdfLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'vendor/jspdf.umd.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('jsPDF konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
  return jsPdfLoadPromise;
}

function downloadCvPdf() {
  const btn = document.querySelector('.pdf-download-btn');
  const label = btn && btn.querySelector('.pdf-btn-label');
  const originalLabel = label ? label.textContent : '';
  if (btn) btn.disabled = true;
  if (label) label.textContent = 'Wird erstellt …';

  loadJsPdf()
    .then(buildCvPdf)
    .catch((err) => {
      console.error('PDF-Erstellung fehlgeschlagen:', err);
      alert('Die PDF konnte leider nicht erstellt werden. Bitte versuchen Sie es erneut.');
    })
    .then(() => {
      if (btn) btn.disabled = false;
      if (label) label.textContent = originalLabel;
    });
}

function loadAvatarDataUrl() {
  return new Promise((resolve) => {
    const img = document.querySelector('header .avatar img');
    if (!img) { resolve(null); return; }
    function draw() {
      try {
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const side = Math.min(iw, ih);
        const pos = getComputedStyle(img).objectPosition.split(' ');
        const px = parseFloat(pos[0]) || 50;
        const py = parseFloat(pos[1]) || 50;
        const sx = Math.max(0, Math.min(iw - side, (iw - side) * (px / 100)));
        const sy = Math.max(0, Math.min(ih - side, (ih - side) * (py / 100)));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { resolve(null); }
    }
    if (img.complete && img.naturalWidth) draw();
    else {
      img.addEventListener('load', draw, { once: true });
      img.addEventListener('error', () => resolve(null), { once: true });
    }
  });
}

function buildCvPdf() {
  return loadAvatarDataUrl().then((avatarDataUrl) => {
    const txt = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 18, marginTop = 20, marginBottom = 20;
    const contentW = pageW - marginX * 2;
    let y = marginTop;

    const TEXT = [26, 26, 31], DIM = [100, 100, 115],
          ACCENT = [108, 99, 255], ACCENT2 = [0, 130, 110], LINE = [222, 222, 232];

    function ensureSpace(h) {
      if (y + h > pageH - marginBottom) { doc.addPage(); y = marginTop; }
    }
    function setFont(weight, size, color) {
      doc.setFont('helvetica', weight || 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    }
    function wrapped(str, size, weight, color, lineH, x, width) {
      x = x || marginX; width = width || contentW;
      setFont(weight, size, color);
      doc.splitTextToSize(str, width).forEach((line) => {
        ensureSpace(lineH);
        doc.text(line, x, y);
        y += lineH;
      });
    }
    function ruleLine(color, w) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(w || .3);
      doc.line(marginX, y, pageW - marginX, y);
    }
    function sectionHeading(title) {
      ensureSpace(16);
      y += 3;
      setFont('bold', 13.5, ACCENT);
      doc.text(title, marginX, y);
      y += 2.5;
      ruleLine(LINE);
      y += 7;
    }
    function bulletLine(str) {
      const indent = 4.5;
      setFont('normal', 9.3, TEXT);
      doc.splitTextToSize(str, contentW - indent).forEach((line, i) => {
        ensureSpace(4.6);
        if (i === 0) doc.text('•', marginX, y);
        doc.text(line, marginX + indent, y);
        y += 4.6;
      });
    }

    // ── Kopf ──
    if (avatarDataUrl) {
      const d = 30;
      doc.addImage(avatarDataUrl, 'PNG', pageW / 2 - d / 2, y, d, d);
      doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.setLineWidth(.5);
      doc.circle(pageW / 2, y + d / 2, d / 2, 'S');
      y += d + 6;
    }
    setFont('bold', 21, TEXT);
    doc.text(txt(document.querySelector('header h1')), pageW / 2, y, { align: 'center' });
    y += 8;
    const subtitle = txt(document.querySelector('header .subtitle'));
    if (subtitle) {
      setFont('normal', 11, DIM);
      doc.splitTextToSize(subtitle, contentW).forEach((line) => {
        doc.text(line, pageW / 2, y, { align: 'center' });
        y += 5.6;
      });
    }
    const motto = txt(document.querySelector('header .motto'));
    if (motto) {
      setFont('italic', 10, DIM);
      doc.text(motto, pageW / 2, y, { align: 'center' });
      y += 7.5;
    }
    // Kontaktzeile, jedes Segment einzeln klickbar
    const links = Array.from(document.querySelectorAll('.header-links a'))
      .map((a) => ({ label: txt(a), href: a.getAttribute('href') }));
    if (links.length) {
      setFont('normal', 9.5, ACCENT2);
      const sep = '   ·   ';
      const totalW = links.reduce((w, l) => w + doc.getTextWidth(l.label), 0) +
        doc.getTextWidth(sep) * (links.length - 1);
      let x = pageW / 2 - totalW / 2;
      links.forEach((l, i) => {
        doc.setTextColor(ACCENT2[0], ACCENT2[1], ACCENT2[2]);
        doc.textWithLink(l.label, x, y, { url: l.href });
        x += doc.getTextWidth(l.label);
        if (i < links.length - 1) {
          doc.setTextColor(DIM[0], DIM[1], DIM[2]);
          doc.text(sep, x, y);
          x += doc.getTextWidth(sep);
        }
      });
      y += 9;
    }
    ruleLine(ACCENT, .6);
    y += 9;

    // ── Über mich ──
    const aboutParas = document.querySelectorAll('#about .about-text p');
    if (aboutParas.length) {
      sectionHeading('Über mich');
      aboutParas.forEach((p) => { wrapped(txt(p), 10, 'normal', TEXT, 5); y += 2; });
      y += 3;
    }

    // ── Berufserfahrung ──
    const expItems = document.querySelectorAll('#experience .timeline-item');
    if (expItems.length) {
      sectionHeading('Berufserfahrung');
      expItems.forEach((item) => {
        ensureSpace(20);
        const date = txt(item.querySelector('.date'));
        const role = txt(item.querySelector('h3'));
        const company = txt(item.querySelector('.company'));
        const desc = item.querySelector('p');
        const bullets = item.querySelectorAll('ul li');

        if (date) { setFont('bold', 9.5, ACCENT); doc.text(date, marginX, y); y += 5; }
        setFont('bold', 11.5, TEXT);
        doc.splitTextToSize(role, contentW).forEach((line) => { ensureSpace(5.2); doc.text(line, marginX, y); y += 5.2; });
        if (company) { setFont('italic', 9.5, DIM); doc.text(company, marginX, y); y += 5.5; }
        if (desc) { wrapped(txt(desc), 9.5, 'normal', TEXT, 4.6); y += 1; }
        bullets.forEach((li) => bulletLine(txt(li)));
        y += 6;
      });
    }

    // ── Ausbildung ──
    const eduCards = document.querySelectorAll('#education .edu-card');
    if (eduCards.length) {
      sectionHeading('Ausbildung');
      eduCards.forEach((card) => {
        ensureSpace(18);
        const date = txt(card.querySelector('.date'));
        const degree = txt(card.querySelector('h3'));
        const school = txt(card.querySelector('.school'));
        const details = txt(card.querySelector('.details'));

        if (date) { setFont('bold', 9.5, ACCENT); doc.text(date, marginX, y); y += 5; }
        setFont('bold', 11, TEXT);
        doc.splitTextToSize(degree, contentW).forEach((line) => { ensureSpace(5.2); doc.text(line, marginX, y); y += 5.2; });
        if (school) { setFont('italic', 9.5, DIM); doc.text(school, marginX, y); y += 5.5; }
        if (details) wrapped(details, 9, 'normal', DIM, 4.4);
        y += 6;
      });
    }

    // ── Skills ──
    const skillGroups = document.querySelectorAll('#skills .skill-group');
    if (skillGroups.length) {
      sectionHeading('Skills');
      skillGroups.forEach((group) => {
        ensureSpace(12);
        const cat = txt(group.querySelector('h4'));
        const tags = Array.from(group.querySelectorAll('.skill-tag')).map(txt).join('  ·  ');
        setFont('bold', 10, ACCENT);
        doc.text(cat, marginX, y);
        y += 5;
        wrapped(tags, 9.3, 'normal', TEXT, 4.6);
        y += 4;
      });
    }

    // ── Zertifizierungen ──
    const certItems = document.querySelectorAll('#certifications .cert-item');
    if (certItems.length) {
      sectionHeading('Zertifizierungen');
      certItems.forEach((item) => {
        const title = txt(item.querySelector('strong'));
        const desc = txt(item.querySelector('span'));
        ensureSpace(5.5);
        setFont('bold', 9.5, TEXT);
        doc.text('•', marginX, y);
        doc.text(title, marginX + 4.5, y);
        const titleW = doc.getTextWidth(title);
        if (desc) {
          setFont('normal', 9, DIM);
          doc.text('  —  ' + desc, marginX + 4.5 + titleW, y);
        }
        y += 5.3;
      });
      y += 3;
    }

    // ── Sprachen ──
    const langItems = document.querySelectorAll('#languages .lang-item');
    if (langItems.length) {
      sectionHeading('Sprachen');
      langItems.forEach((item) => {
        // Flaggen-Emoji entfernen -- PDF-Standardfonts stellen sie nicht dar
        const name = txt(item.querySelector('.lang-name')).replace(/^[^\p{L}]*/u, '').trim();
        const level = txt(item.querySelector('.lang-level'));
        const desc = txt(item.querySelector('.lang-desc'));
        ensureSpace(5.6);
        setFont('bold', 9.8, TEXT);
        doc.text(name, marginX, y);
        let x = marginX + doc.getTextWidth(name);
        if (level) {
          setFont('bold', 9.8, ACCENT);
          doc.text('  ' + level, x, y);
          x += doc.getTextWidth('  ' + level);
        }
        if (desc) {
          setFont('normal', 9, DIM);
          doc.text('  —  ' + desc, x, y);
        }
        y += 5.6;
      });
      y += 3;
    }

    // ── Seitenfuß ──
    const name = txt(document.querySelector('header h1'));
    const footerContact = [
      { label: 'Moosgasse 8, 2700 Wiener Neustadt' },
      { label: '+43 699/1507 51 51', href: 'tel:+4369915075151' },
      { label: 'g.schranz@hotmail.com', href: 'mailto:g.schranz@hotmail.com' },
    ];
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Kontaktzeile, zentriert, klickbare Segmente
      setFont('normal', 7.8, DIM);
      const fSep = '   ·   ';
      const totalW = footerContact.reduce((w, c) => w + doc.getTextWidth(c.label), 0) +
        doc.getTextWidth(fSep) * (footerContact.length - 1);
      let fx = pageW / 2 - totalW / 2;
      footerContact.forEach((c, idx) => {
        doc.setTextColor(DIM[0], DIM[1], DIM[2]);
        if (c.href) doc.textWithLink(c.label, fx, pageH - 14, { url: c.href });
        else doc.text(c.label, fx, pageH - 14);
        fx += doc.getTextWidth(c.label);
        if (idx < footerContact.length - 1) {
          doc.text(fSep, fx, pageH - 14);
          fx += doc.getTextWidth(fSep);
        }
      });

      setFont('normal', 8, DIM);
      doc.text(name + ' — Lebenslauf', marginX, pageH - 8);
      doc.text('Seite ' + i + ' / ' + pageCount, pageW - marginX, pageH - 8, { align: 'right' });
    }

    doc.save((name || 'Lebenslauf').replace(/[^\p{L}\p{N}]+/gu, '-') + '.pdf');
  });
}
