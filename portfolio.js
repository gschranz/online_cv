// Projekt-Portfolio: interaktive Netzkarte + abstrakte Animationen je Projekt.
// Canvas 2D in nativer Geräteauflösung, keine Abhängigkeiten. Die Inhalte stehen
// als semantische Karten (.project-card) in #pf-list und werden hier nur gelesen.
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
  document.documentElement.classList.add('pf-on');

  var C = { line: '#1e1e32', text: '#e4e4ed', dim: '#8888a0', a: '#6c63ff', b: '#00d4aa', c: '#ffb454', bad: '#ff6b6b' };
  var CLUSTERS = {
    data: { name: 'Betriebsdaten', color: C.a },
    web:  { name: 'Web',           color: C.b },
    ai:   { name: 'KI & Automation', color: C.c }
  };
  // Positionen (0..1) für Quer- und Hochformat
  var LAYOUT = {
    kosten: { l: [.17, .30], p: [.27, .09] },
    api:    { l: [.27, .70], p: [.72, .19] },
    web:    { l: [.50, .24], p: [.27, .37] },
    kukla:  { l: [.58, .66], p: [.74, .46] },
    voice:  { l: [.82, .28], p: [.26, .65] },
    agent:  { l: [.87, .62], p: [.74, .72] },
    bot:    { l: [.70, .86], p: [.46, .90] }
  };
  var LINKS = [['kosten', 'api'], ['kosten', 'web'], ['web', 'kukla'], ['voice', 'agent'], ['agent', 'bot'], ['voice', 'bot']];

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

  // ── Knoten aus den Karten ──
  var nodes = [];
  Array.prototype.forEach.call(list.querySelectorAll('.project-card'), function (card, i) {
    var id = card.getAttribute('data-id');
    if (!LAYOUT[id]) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-node';
    btn.setAttribute('aria-label', card.getAttribute('data-short') + ' – ' + CLUSTERS[card.getAttribute('data-cluster')].name + ', Animation öffnen');
    var span = document.createElement('span');
    span.textContent = card.getAttribute('data-short');
    btn.appendChild(span);
    stage.appendChild(btn);
    var n = { id: id, card: card, btn: btn, cluster: card.getAttribute('data-cluster'), ph: i * 1.7, x: 0, y: 0 };
    btn.addEventListener('click', function () { select(n); });
    btn.addEventListener('mouseenter', function () { hover = n; requestDraw(); });
    btn.addEventListener('mouseleave', function () { if (hover === n) hover = null; requestDraw(); });
    btn.addEventListener('focus', function () { hover = n; requestDraw(); });
    btn.addEventListener('blur', function () { if (hover === n) hover = null; requestDraw(); });
    nodes.push(n);
  });
  if (!nodes.length) return;
  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  // ── Zustand ──
  var W = 0, H = 0, dpr = 1, portrait = false;
  var sel = null, lastSel = null, hover = null;
  var mt = 0;                 // Übergang Karte (0) -> Szene (1)
  var clock = 0, sceneT = 0, S = {};
  var running = false, raf = 0, visible = false, prev = 0;

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    portrait = W / H < .9;
    requestDraw();
  }

  // ── Karte ──
  function place(t) {
    var amp = reduced ? 0 : 6;
    nodes.forEach(function (n) {
      var p = LAYOUT[n.id][portrait ? 'p' : 'l'];
      n.x = p[0] * W + Math.sin(t * .6 + n.ph) * amp;
      n.y = p[1] * H + Math.cos(t * .5 + n.ph * 1.3) * amp;
      n.btn.style.transform = 'translate(' + n.x.toFixed(1) + 'px,' + n.y.toFixed(1) + 'px) translate(-50%,-50%)';
    });
  }
  function drawMap(t) {
    Object.keys(CLUSTERS).forEach(function (k) {
      var ns = nodes.filter(function (n) { return n.cluster === k; });
      if (!ns.length) return;
      var cx = 0, cy = 0;
      ns.forEach(function (n) { cx += n.x; cy += n.y; });
      cx /= ns.length; cy /= ns.length;
      var r = Math.min(W, H) * .30;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba(CLUSTERS[k].color, .13));
      g.addColorStop(1, rgba(CLUSTERS[k].color, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      var top = Math.min.apply(null, ns.map(function (n) { return n.y; }));
      label(CLUSTERS[k].name.toUpperCase(), cx, Math.max(14, top - 34), rgba(CLUSTERS[k].color, .85), 10.5);
    });
    LINKS.forEach(function (l, i) {
      var a = byId[l[0]], b = byId[l[1]];
      if (!a || !b) return;
      var hot = hover && (hover === a || hover === b);
      line(a.x, a.y, b.x, b.y, rgba(C.a, hot ? .6 : .22), 1);
      var u = (t * .18 + i * .29) % 1;
      dot(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 2, rgba(C.b, hot ? 1 : .6));
    });
    nodes.forEach(function (n) {
      var col = CLUSTERS[n.cluster].color;
      var hot = hover === n;
      var pulse = reduced ? 0 : (Math.sin(t * 1.6 + n.ph) + 1) / 2;
      dot(n.x, n.y, hot ? 26 : 18 + pulse * 3, rgba(col, hot ? .22 : .10));
      ctx.strokeStyle = rgba(col, hot ? 1 : .55); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(n.x, n.y, hot ? 12 : 9, 0, Math.PI * 2); ctx.stroke();
      dot(n.x, n.y, hot ? 5 : 4, col);
    });
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

  // ── Zeichnen ──
  function frame(dt) {
    clock += dt;
    var target = sel ? 1 : 0;
    if (reduced) mt = target; else mt += clamp(target - mt, -dt / .55, dt / .55);
    place(clock);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var focus = sel || lastSel;
    if (mt < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - ease(mt);
      if (focus && mt > 0) {
        var k = 1 + ease(mt) * 1.8;
        ctx.translate(focus.x, focus.y); ctx.scale(k, k); ctx.translate(-focus.x, -focus.y);
      }
      drawMap(clock);
      ctx.restore();
    }
    if (mt > 0 && focus) {
      sceneT += dt;
      ctx.save();
      ctx.globalAlpha = ease(mt);
      var sc = .92 + .08 * ease(mt);
      ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      SCENES[focus.id](W, H, sceneT, dt);
      ctx.restore();
    }
    if (mt === 0) lastSel = null;
  }

  function requestDraw() {
    if (!running) {
      if (reduced) { frame(0); return; }
      if (!raf) raf = requestAnimationFrame(function (now) { raf = 0; prev = now; frame(0); });
    }
  }
  function loop(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min((now - prev) / 1000, .05);
    prev = now;
    frame(dt);
    raf = requestAnimationFrame(loop);
  }
  function updateRunning() {
    var want = visible && !document.hidden && !reduced;
    if (want && !running) { running = true; prev = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  }

  // ── Panel ──
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function showOverview() {
    panel.textContent = '';
    panel.appendChild(el('p', 'pf-eyebrow', 'Netzkarte'));
    panel.appendChild(el('h3', 'pf-title', nodes.length + ' Projekte'));
    panel.appendChild(el('p', 'pf-text', 'Jeder Knoten ist ein Projekt. Ein Klick zoomt hinein und zeigt den Mechanismus als Animation.'));
    var ul = el('ul', 'pf-legend');
    Object.keys(CLUSTERS).forEach(function (k) {
      var li = el('li');
      var sw = el('i'); sw.style.background = CLUSTERS[k].color;
      li.appendChild(sw);
      li.appendChild(document.createTextNode(CLUSTERS[k].name));
      ul.appendChild(li);
    });
    panel.appendChild(ul);
  }
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

  function select(n) {
    sel = n; lastSel = n; sceneT = 0; S = {};
    root.setAttribute('data-state', 'scene');
    var h = showProject(n);
    if (reduced) {
      for (var i = 0; i < 120; i++) { sceneT += 1 / 30; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); SCENES[n.id](W, H, sceneT, 1 / 30); }
      mt = 1;
    }
    try { history.replaceState(null, '', '#projekt-' + n.id); } catch (e) {}
    h.focus({ preventScroll: true });
    requestDraw();
  }
  function deselect() {
    var n = sel;
    sel = null;
    root.setAttribute('data-state', 'map');
    showOverview();
    try { history.replaceState(null, '', location.pathname + location.search + '#projects'); } catch (e) {}
    if (n) n.btn.focus({ preventScroll: true });
    requestDraw();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) deselect(); });

  // ── Start ──
  showOverview();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; updateRunning(); }, { threshold: 0 }).observe(stage);
  } else { visible = true; updateRunning(); }
  document.addEventListener('visibilitychange', updateRunning);

  var m = /^#projekt-(\w+)$/.exec(location.hash);
  if (m && byId[m[1]]) select(byId[m[1]]);
})();
