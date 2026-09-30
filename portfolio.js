// Projekt-Portfolio: Übersicht als Patchfeld im Serverrack (echte Fotos, Higgsfield),
// nach Klick eine schematische Canvas-Animation je Projekt. Inhalte stehen als
// semantische Karten (.project-card) in #pf-list und werden hier nur gelesen.
(function () {
  'use strict';
  var root = document.getElementById('pf');
  var list = document.getElementById('pf-list');
  if (!root || !list) return;
  var stage = root.querySelector('.pf-stage');
  var canvas = stage.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var panel = root.querySelector('.pf-panel');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  document.documentElement.classList.add('pf-on');

  var C = { line: '#1e1e32', text: '#e4e4ed', dim: '#8888a0', a: '#6c63ff', b: '#00d4aa', c: '#ffb454', bad: '#ff6b6b' };
  var CLUSTERS = {
    data: { name: 'Betriebsdaten',   color: C.a, plug: 'violet' },
    web:  { name: 'Web',             color: C.b, plug: 'teal' },
    ai:   { name: 'KI & Automation', color: C.c, plug: 'amber' }
  };
  var ORDER = ['data', 'web', 'ai'];

  // ── Helfer ──
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function label(s, x, y, col, size, align) {
    ctx.fillStyle = col;
    ctx.font = '500 ' + (size || 11) + 'px Inter, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function line(x1, y1, x2, y2, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function dot(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  // Position relativ zur Bühne aus Layout-Maßen (unabhängig von CSS-Transformationen wie im Intro)
  function offsetIn(el, anc) {
    var x = 0, y = 0;
    while (el && el !== anc) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }

  // ── Patchfeld aus den Karten bauen ──
  var nodes = [], byId = {};
  var rack = mk('div', 'pf-rack');
  var face = mk('div', 'rack-panel');
  var cables = svg('svg', { 'class': 'rack-cables', 'aria-hidden': 'true' });
  var defs = svg('defs', {});
  var fade = svg('linearGradient', { id: 'rack-fade', x1: '0', y1: '0', x2: '0', y2: '1' });
  fade.appendChild(svg('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }));
  fade.appendChild(svg('stop', { offset: '.62', 'stop-color': '#fff', 'stop-opacity': '1' }));
  fade.appendChild(svg('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }));
  var mask = svg('mask', { id: 'rack-mask', maskUnits: 'userSpaceOnUse' });
  var maskRect = svg('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#rack-fade)' });
  mask.appendChild(maskRect);
  defs.appendChild(fade); defs.appendChild(mask);
  cables.appendChild(defs);
  var cableGroup = svg('g', { mask: 'url(#rack-mask)' });
  cables.appendChild(cableGroup);

  var sections = {};
  ORDER.forEach(function (k) {
    var sec = mk('div', 'rack-sec');
    sec.style.setProperty('--sec', CLUSTERS[k].color);
    var lab = mk('span', 'rack-sec-label', CLUSTERS[k].name);
    var ports = mk('div', 'rack-ports');
    sec.appendChild(lab); sec.appendChild(ports);
    face.appendChild(sec);
    sections[k] = { el: sec, ports: ports };
  });

  Array.prototype.forEach.call(list.querySelectorAll('.project-card'), function (card, i) {
    var id = card.getAttribute('data-id'), cl = card.getAttribute('data-cluster');
    if (!id || !CLUSTERS[cl]) return;
    var btn = mk('button', 'rack-port');
    btn.type = 'button';
    btn.setAttribute('aria-label', card.getAttribute('data-short') + ' – ' + CLUSTERS[cl].name + ', Animation öffnen');
    btn.style.setProperty('--blink', (1.6 + (i * 0.73) % 1.9).toFixed(2) + 's');
    btn.style.setProperty('--blink-delay', (-(i * 1.37) % 2).toFixed(2) + 's');
    // Weiche Trennstellen an Wortfugen, damit lange Namen sauber umbrechen
    var short = card.getAttribute('data-short')
      .replace('Kostenrechnung', 'Kosten\u00ADrechnung')
      .replace('Systemanbindung', 'System\u00ADanbindung')
      .replace('KuklaApartment', 'Kukla\u00ADApartment');
    var lab = mk('span', 'rack-label', short);
    var jack = mk('span', 'rack-jack');
    var led = mk('span', 'rack-led');
    var plug = mk('span', 'rack-plug rack-plug-' + CLUSTERS[cl].plug);
    jack.appendChild(led); jack.appendChild(plug);
    btn.appendChild(lab); btn.appendChild(jack);
    sections[cl].ports.appendChild(btn);
    var n = { id: id, card: card, btn: btn, plug: plug, cluster: cl, paths: null };
    btn.addEventListener('click', function () { choose(n); });
    nodes.push(n); byId[id] = n;
  });
  if (!nodes.length) return;
  rack.appendChild(face);
  rack.appendChild(cables);
  stage.appendChild(rack);

  // ── Zustand ──
  var W = 0, H = 0, dpr = 1;
  var sceneBox = { x: 0, w: 0 };
  var sel = null, lastSel = null, pending = 0;
  var mt = 0;                 // Übergang Patchfeld (0) -> Szene (1)
  var sceneT = 0, S = {};
  var running = false, raf = 0, visible = false, prev = 0;

  // Kabel: vom Kabelausgang jedes Steckers in sanftem Bogen nach unten zu einem Bündel je Thema
  function layoutCables() {
    while (cableGroup.firstChild) cableGroup.removeChild(cableGroup.firstChild);
    cables.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    cables.setAttribute('width', W); cables.setAttribute('height', H);
    maskRect.setAttribute('width', W); maskRect.setAttribute('height', H);
    ORDER.forEach(function (k) {
      var ns = nodes.filter(function (n) { return n.cluster === k; });
      var so = offsetIn(sections[k].el, stage);
      var cx = so.x + sections[k].el.offsetWidth / 2;
      ns.forEach(function (n, j) {
        var po = offsetIn(n.plug, stage);
        var pw = n.plug.offsetWidth, ph = n.plug.offsetHeight;
        var cw = pw * .44;
        var x0 = po.x + pw * .745, y0 = po.y + ph - 1;
        var bx = cx + (j - (ns.length - 1) / 2) * cw * 1.15, by = H + 30;
        var dy = by - y0;
        var d = 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) +
          ' C' + x0.toFixed(1) + ' ' + (y0 + dy * .5).toFixed(1) + ' ' + bx.toFixed(1) + ' ' + (by - dy * .42).toFixed(1) +
          ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
        var g = svg('g', {});
        g.appendChild(svg('path', { d: d, fill: 'none', stroke: '#2a2a31', 'stroke-width': (cw + 2).toFixed(1), 'stroke-linecap': 'round' }));
        g.appendChild(svg('path', { d: d, fill: 'none', stroke: '#8a8a93', 'stroke-width': cw.toFixed(1), 'stroke-linecap': 'round' }));
        g.appendChild(svg('path', { d: d, fill: 'none', stroke: 'rgba(255,255,255,.26)', 'stroke-width': (cw * .26).toFixed(1), 'stroke-linecap': 'round', transform: 'translate(' + (-cw * .2).toFixed(1) + ' 0)' }));
        var pulse = svg('path', { d: d, fill: 'none', stroke: CLUSTERS[k].color, 'stroke-width': (cw * .55).toFixed(1), 'stroke-linecap': 'round', 'class': 'rack-pulse' });
        g.appendChild(pulse);
        cableGroup.appendChild(g);
        n.paths = { pulse: pulse };
      });
    });
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    var k = r.width / (stage.clientWidth || r.width) || 1;
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var cont = stage.closest('.container');
    var cr = cont ? cont.getBoundingClientRect() : r;
    var pad = cont ? parseFloat(getComputedStyle(cont).paddingLeft) || 0 : 0;
    var colLeft = Math.max(16, (cr.left - r.left) / k + pad), colW = Math.max(240, (cont ? cont.clientWidth : W) - 2 * pad);
    root.style.setProperty('--col-left', colLeft.toFixed(1) + 'px');
    root.style.setProperty('--col-w', colW.toFixed(1) + 'px');
    sceneBox = W > 900 ? { x: colLeft, w: Math.max(320, colW - 350) } : { x: 0, w: W };
    layoutCables();
    requestDraw();
  }

  // ── Szenen ──
  function sKosten(w, h, t, dt) {
    if (!S.p) { S.p = []; S.bars = [.2, .25, .2, .3, .2, .22]; S.acc = 0; S.flag = 0; }
    var srcX = w * .10, L = [w * .30, w * .42, w * .54], bx = w * .70, bw = Math.max(5, w * .018), base = h * .74;
    var names = ['Rezept', 'Preise', 'Marge'], i;
    for (i = 0; i < 6; i++) {
      ctx.fillStyle = rgba(C.a, .35); ctx.fillRect(srcX - 9, h * .27 + i * h * .07, 18, h * .045);
    }
    label('QUELLE · NUR LESEN', srcX, h * .18, C.dim, 10);
    for (i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(C.a, .09); ctx.fillRect(L[i] - 6, h * .22, 12, h * .5);
      ctx.strokeStyle = rgba(C.a, .5); ctx.lineWidth = 1; ctx.strokeRect(L[i] - 6, h * .22, 12, h * .5);
      label(names[i].toUpperCase(), L[i], h * .18, C.dim, 10);
    }
    S.acc += dt * 9;
    while (S.acc >= 1) {
      S.acc--;
      S.p.push({ x: srcX + 12, y: h * .28 + Math.random() * h * .42, v: w * (.16 + Math.random() * .06), bad: Math.random() < .08 });
    }
    for (i = S.p.length - 1; i >= 0; i--) {
      var p = S.p[i], stopX = L[1];
      if (p.bad && p.x >= stopX) {
        p.y += h * .5 * dt;
        if (p.y >= h * .86) { S.flag = 1; S.p.splice(i, 1); continue; }
      } else {
        p.x += p.v * dt;
        if (p.x >= bx) {
          var bi = clamp(Math.floor((p.y - h * .28) / (h * .42) * 6), 0, 5);
          S.bars[bi] = Math.min(1, S.bars[bi] + .07);
          S.p.splice(i, 1); continue;
        }
      }
      var col = p.bad && p.x > L[0] ? C.bad : (p.x < L[0] ? C.a : C.b);
      dot(p.x, p.y, 2.2, col);
    }
    for (i = 0; i < 6; i++) {
      S.bars[i] = Math.max(.12, S.bars[i] - dt * .06);
      var bh = S.bars[i] * h * .46;
      ctx.fillStyle = rgba(C.b, .8); ctx.fillRect(bx + i * bw * 1.8, base - bh, bw, bh);
    }
    line(bx - 4, base + 1, bx + 6 * bw * 1.8, base + 1, rgba(C.dim, .5));
    label('WARENEINSATZ · MARGE', bx + 3 * bw * 1.8, base + 16, C.dim, 10);
    S.flag = Math.max(0, S.flag - dt * 1.4);
    dot(L[1], h * .88, 6 + S.flag * 6, rgba(C.bad, .25 + S.flag * .5));
    dot(L[1], h * .88, 3.5, C.bad);
    label('BEFUND', L[1] + 34, h * .88, C.bad, 10);
  }

  function wire(x, y, pw, ph, col, a) {
    ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, .05 * a * 2); ctx.lineWidth = 1;
    ctx.fillRect(x, y, pw, ph); ctx.strokeRect(x, y, pw, ph);
    line(x, y + ph * .13, x + pw, y + ph * .13, rgba(col, a * .8));
    ctx.strokeRect(x + pw * .04, y + ph * .04, pw * .06, ph * .05);
    for (var i = 0; i < 3; i++) line(x + pw * (.56 + i * .13), y + ph * .065, x + pw * (.62 + i * .13), y + ph * .065, rgba(col, a));
    ctx.strokeRect(x + pw * .05, y + ph * .2, pw * .9, ph * .36);
    ctx.beginPath();
    ctx.moveTo(x + pw * .47, y + ph * .3); ctx.lineTo(x + pw * .47, y + ph * .46); ctx.lineTo(x + pw * .55, y + ph * .38);
    ctx.closePath(); ctx.stroke();
    for (i = 0; i < 3; i++) ctx.strokeRect(x + pw * (.05 + i * .32), y + ph * .64, pw * .26, ph * .26);
  }
  function sWeb(w, h, t) {
    var p = ease((Math.sin(t * .75 - 1.4) + 1) / 2);
    var pw = Math.min(w * .5, 340), ph = pw * .66, cx = w / 2, cy = h / 2;
    for (var i = 3; i >= 0; i--) {
      var off = (1 - p) * (i - 1.5) * Math.min(w, h) * .12;
      wire(cx - pw / 2 + off * .9, cy - ph / 2 - off * .55, pw, ph, i === 0 ? C.b : C.a, i === 0 ? .55 + p * .45 : .5 - i * .07);
    }
    label(p > .9 ? 'RASTER · EINGERASTET' : 'ENTWURF · EBENEN', cx, h * .9, p > .9 ? C.b : C.dim, 10);
  }

  function sApi(w, h, t) {
    var ax = w * .16, bx = w * .84, y = h * .5, ph = t % 8;
    var tunnel = ph < 2.5 ? 1 : ph < 3.6 ? 1 - (ph - 2.5) / 1.1 : 0;
    var api = ph < 3 ? 0 : ph < 4 ? ph - 3 : ph > 7.3 ? clamp((8 - ph) / .7, 0, 1) : 1;
    var boxes = [[ax, 'CLIENT', C.a], [bx, 'LIEFERANT', C.b]];
    boxes.forEach(function (b) {
      ctx.fillStyle = rgba(b[2], .1); ctx.fillRect(b[0] - 26, y - 34, 52, 68);
      ctx.strokeStyle = rgba(b[2], .9); ctx.lineWidth = 1.2; ctx.strokeRect(b[0] - 26, y - 34, 52, 68);
      label(b[1], b[0], y + 54, C.dim, 10);
    });
    if (tunnel > 0) {
      var x1 = ax + 34, x2 = bx - 34, jit = (1 - tunnel) * 16;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 22;
      for (var k = -1; k <= 1; k += 2) {
        ctx.strokeStyle = rgba(C.dim, .55 * tunnel); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x1, y + k * 16 + Math.sin(t * 5 + k) * jit); ctx.lineTo(x2, y + k * 16 - Math.sin(t * 4 - k) * jit); ctx.stroke();
      }
      ctx.setLineDash([]);
      label('VPN / REMOTE', w / 2, y, rgba(C.dim, tunnel), 10);
      dot(x1 + (x2 - x1) * ((t * .12) % 1), y - 16, 2.5, rgba(C.dim, tunnel));
    }
    if (api > 0) {
      [[-1, 0], [1, .5]].forEach(function (d) {
        var cy = y + d[0] * h * .26;
        ctx.strokeStyle = rgba(C.b, .55 * api); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(ax + 30, y); ctx.quadraticCurveTo(w / 2, cy * 2 - y, bx - 30, y); ctx.stroke();
        var u = ((t * .5 + d[1]) % 1);
        if (d[0] > 0) u = 1 - u;
        var mx = (1 - u) * (1 - u) * (ax + 30) + 2 * (1 - u) * u * (w / 2) + u * u * (bx - 30);
        var my = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * (cy * 2 - y) + u * u * y;
        dot(mx, my, 3, rgba(C.b, api));
      });
      label('REST · 200', w / 2, y, rgba(C.b, api), 10);
    }
  }

  function wave(x1, x2, y, amp, col, ph, a) {
    ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.6; ctx.beginPath();
    for (var x = x1; x <= x2; x += 2) {
      var e = Math.sin((x - x1) / (x2 - x1) * Math.PI);
      var v = Math.sin(x * .09 + ph) * .6 + Math.sin(x * .21 - ph * 1.3) * .4;
      var yy = y + v * amp * e;
      if (x === x1) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  function sVoice(w, h, t) {
    var y = h * .5, cyc = t % 6, st = Math.floor(cyc / 2);
    var seg = [[w * .07, w * .29], [w * .37, w * .63], [w * .71, w * .93]];
    var names = ['STT', 'LLM', 'TTS'];
    for (var i = 0; i < 3; i++) label(names[i], (seg[i][0] + seg[i][1]) / 2, h * .26, st === i ? C.c : C.dim, 11);
    wave(seg[0][0], seg[0][1], y, st === 0 ? h * .14 : h * .04, C.c, t * 6, st === 0 ? 1 : .35);
    var chars = 'abcdefghijklmnopqrstuvwxyz';
    ctx.font = '400 13px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (var r = 0; r < 3; r++) {
      var s = '';
      for (var c = 0; c < 12; c++) s += chars[(c * 7 + r * 5 + Math.floor(t * 3)) % 26];
      ctx.fillStyle = rgba(C.c, st === 1 ? .95 : .3);
      ctx.fillText(s, seg[1][0] + 4, y + (r - 1) * 20);
    }
    wave(seg[2][0], seg[2][1], y, st === 2 ? h * .14 : h * .04, C.b, -t * 5, st === 2 ? 1 : .35);
    line(seg[0][1] + 4, y, seg[1][0] - 4, y, rgba(C.dim, .5)); line(seg[1][1] + 4, y, seg[2][0] - 4, y, rgba(C.dim, .5));
    var u = cyc / 6, px = seg[0][0] + (seg[2][1] - seg[0][0]) * u;
    dot(px, h * .74, 3, C.c); line(seg[0][0], h * .74, seg[2][1], h * .74, rgba(C.dim, .3));
    label('PUSH-TO-TALK → ANTWORT', w / 2, h * .88, C.dim, 10);
  }

  function sAgent(w, h, t) {
    var cx = w / 2, cy = h / 2, R = Math.min(w * .28, h * .34), off = w < 500 ? 22 : 44;
    var names = ['Discord', 'Telegram', 'E-Mail', 'Sprache', 'KI-Provider'];
    var pulse = (t * .7) % 1;
    ctx.strokeStyle = rgba(C.c, (1 - pulse) * .5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 18 + pulse * 30, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(C.line, 1);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    names.forEach(function (n, i) {
      var ang = i / 5 * Math.PI * 2 + t * .16 - Math.PI / 2;
      var x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
      line(cx, cy, x, y, rgba(C.c, .25));
      dot(x, y, 6, rgba(C.c, .25)); dot(x, y, 3.2, C.c);
      var u = (t * .45 + i * .31) % 1, f = u < .5 ? u * 2 : 2 - u * 2;
      dot(x + (cx - x) * f, y + (cy - y) * f, 2.4, u < .5 ? C.b : C.c);
      label(n.toUpperCase(), x + Math.cos(ang) * off, y + Math.sin(ang) * 22, C.dim, 10);
    });
    dot(cx, cy, 16, rgba(C.c, .18));
    ctx.strokeStyle = C.c; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
    dot(cx, cy, 3.4, C.c);
  }

  function sBot(w, h, t) {
    var steps = ['Telegram', 'n8n', 'PDF-API', 'Download', 'Telegram'], y = h * .34, n = steps.length;
    var u = ((t % 6) / 6) * (n - 1 + .6);
    for (var i = 0; i < n; i++) {
      var x = w * (.1 + .8 * i / (n - 1));
      if (i < n - 1) line(x, y, w * (.1 + .8 * (i + 1) / (n - 1)), y, rgba(C.c, .3));
      var lit = u >= i;
      dot(x, y, 11, rgba(C.c, lit ? .25 : .08));
      dot(x, y, 4, lit ? C.c : rgba(C.c, .4));
      label(steps[i].toUpperCase(), x, y - 26, lit ? C.text : C.dim, 10);
    }
    var tx = w * (.1 + .8 * Math.min(u, n - 1) / (n - 1));
    dot(tx, y, 3, C.b);
    var prog = clamp((u - 2) / 1.6, 0, 1), dw = Math.min(w * .18, 84), dh = dw * 1.25, dx = w / 2 - dw / 2, dy = h * .5;
    ctx.strokeStyle = rgba(C.c, .9); ctx.lineWidth = 1.2; ctx.fillStyle = rgba(C.c, .06);
    ctx.fillRect(dx, dy, dw, dh); ctx.strokeRect(dx, dy, dw, dh);
    var rows = Math.floor(prog * 6);
    for (var r = 0; r < rows; r++) line(dx + dw * .14, dy + dh * (.16 + r * .13), dx + dw * (r === 0 ? .6 : .86), dy + dh * (.16 + r * .13), rgba(C.c, .8));
    label('RECHNUNG · PDF', w / 2, dy + dh + 20, C.dim, 10);
  }

  function sKukla(w, h, t) {
    var cols = 7, rows = 5, cell = Math.min(w * .09, h * .11), gx = w / 2 - cols * cell / 2, gy = h * .2;
    var cyc = t % 7, s0 = 9, end = s0 + Math.floor(clamp(cyc / 3, 0, 1) * 5);
    var done = cyc > 3.6, fade = cyc > 6.2 ? clamp((7 - cyc) / .8, 0, 1) : 1;
    var booked = { 3: 1, 4: 1, 14: 1, 15: 1, 23: 1 };
    label('BUCHUNGSZEITRAUM', w / 2, gy - 22, C.dim, 10);
    for (var i = 0; i < cols * rows; i++) {
      var x = gx + (i % cols) * cell, y = gy + Math.floor(i / cols) * cell;
      var inSel = i >= s0 && i <= end;
      ctx.strokeStyle = rgba(C.b, .22); ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      if (booked[i]) { ctx.fillStyle = rgba(C.dim, .25); ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); }
      if (inSel) { ctx.fillStyle = rgba(C.b, (done ? .55 : .3) * fade); ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); }
    }
    if (!done) {
      var cx = gx + (end % cols) * cell + cell / 2, cy = gy + Math.floor(end / cols) * cell + cell / 2;
      dot(cx, cy, 4, C.b);
    } else {
      var mx = w / 2, my = gy + rows * cell + 24;
      ctx.strokeStyle = rgba(C.b, fade); ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(mx - 8, my); ctx.lineTo(mx - 2, my + 6); ctx.lineTo(mx + 9, my - 6); ctx.stroke();
      label('ANFRAGE BESTÄTIGT', mx, my + 24, rgba(C.dim, fade), 10);
    }
  }

  var SCENES = { kosten: sKosten, web: sWeb, api: sApi, voice: sVoice, agent: sAgent, bot: sBot, kukla: sKukla };

  // ── Zeichnen (nur Szenen; das Patchfeld ist HTML/CSS) ──
  function frame(dt) {
    var target = sel ? 1 : 0;
    if (reduced) mt = target; else mt += clamp(target - mt, -dt / .55, dt / .55);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var focus = sel || lastSel;
    if (mt > 0 && focus) {
      sceneT += dt;
      ctx.save();
      ctx.globalAlpha = ease(mt);
      var sc = .92 + .08 * ease(mt);
      ctx.translate(sceneBox.x + sceneBox.w / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-sceneBox.w / 2, -H / 2);
      SCENES[focus.id](sceneBox.w, H, sceneT, dt);
      ctx.restore();
    }
    if (mt === 0) lastSel = null;
  }

  function requestDraw() {
    if (!running && !raf) raf = requestAnimationFrame(function (now) { raf = 0; prev = now; frame(0); });
  }
  function loop(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min((now - prev) / 1000, .05);
    prev = now;
    frame(dt);
    if (!sel && mt === 0) { running = false; return; }
    raf = requestAnimationFrame(loop);
  }
  function updateRunning() {
    var want = visible && !document.hidden && !reduced && (sel || mt > 0);
    if (want && !running) { running = true; prev = performance.now(); if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  }

  // ── Panel ──
  var el = mk;
  function showOverview() { panel.textContent = ''; }
  function showProject(n) {
    var card = n.card;
    panel.textContent = '';
    var back = el('button', 'pf-back', '← Zurück zur Übersicht');
    back.type = 'button';
    back.addEventListener('click', deselect);
    panel.appendChild(back);
    panel.appendChild(el('p', 'pf-eyebrow', CLUSTERS[n.cluster].name));
    var h = el('h3', 'pf-title', card.getAttribute('data-title') || card.getAttribute('data-short'));
    h.tabIndex = -1;
    panel.appendChild(h);
    var status = card.getAttribute('data-status');
    if (status) panel.appendChild(el('p', 'pf-status', status));
    panel.appendChild(el('p', 'pf-text', card.querySelector('.desc').textContent));
    var tech = card.querySelector('.tech-stack');
    if (tech) panel.appendChild(tech.cloneNode(true));
    Array.prototype.forEach.call(card.querySelectorAll('h3 a'), function (a) {
      var l = el('a', 'pf-link', a.textContent.replace(/↗/g, '').trim() + ' ↗');
      l.href = a.href; l.target = '_blank'; l.rel = 'noopener';
      panel.appendChild(l);
    });
    return h;
  }

  // Klick: LED leuchtet, ein Impuls läuft durchs Kabel, dann öffnet die Szene
  function choose(n) {
    if (sel || pending) return;
    if (reduced) { select(n); return; }
    n.btn.classList.add('is-hot');
    var p = n.paths && n.paths.pulse;
    if (p && p.getTotalLength && p.animate) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = '46 ' + (L + 60);
      p.animate([{ strokeDashoffset: 46, opacity: 1 }, { strokeDashoffset: -L, opacity: .2 }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)' });
    }
    pending = setTimeout(function () { pending = 0; select(n); }, 430);
  }

  function select(n) {
    sel = n; lastSel = n; sceneT = 0; S = {};
    var o = offsetIn(n.btn, stage);
    rack.style.setProperty('--ox', (o.x + n.btn.offsetWidth / 2).toFixed(0) + 'px');
    rack.style.setProperty('--oy', (o.y + n.btn.offsetHeight / 2).toFixed(0) + 'px');
    root.setAttribute('data-state', 'scene');
    var h = showProject(n);
    if (reduced) {
      for (var i = 0; i < 120; i++) { sceneT += 1 / 30; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.translate(sceneBox.x, 0); SCENES[n.id](sceneBox.w, H, sceneT, 1 / 30); }
      mt = 1;
    }
    try { history.replaceState(null, '', '#projekt-' + n.id); } catch (e) {}
    h.focus({ preventScroll: true });
    updateRunning();
    requestDraw();
  }
  function deselect() {
    var n = sel;
    sel = null;
    root.setAttribute('data-state', 'map');
    showOverview();
    if (n) n.btn.classList.remove('is-hot');
    try { history.replaceState(null, '', location.pathname + location.search + '#projects'); } catch (e) {}
    if (n) n.btn.focus({ preventScroll: true });
    if (reduced) { mt = 0; frame(0); }
    updateRunning();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) deselect(); });

  // ── Start ──
  showOverview();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  window.addEventListener('load', resize);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; updateRunning(); }, { threshold: 0 }).observe(stage);
  } else { visible = true; updateRunning(); }
  document.addEventListener('visibilitychange', updateRunning);

  var m = /^#projekt-(\w+)$/.exec(location.hash);
  if (m && byId[m[1]]) select(byId[m[1]]);
})();
