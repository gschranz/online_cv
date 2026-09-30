# Online-CV – schranz-it.com

Statische Website (reines HTML/CSS/JS, kein Build-Schritt), gehostet über GitHub Pages unter <https://schranz-it.com>.

## Struktur

- `index.html` – Startseite von **Schranz IT**: Hero mit Warp-Intro und Platinen-Effekt, Leistungen, Arbeitsweise, Projekte (Netzkarte), Kontakt
- `ueber-mich.html` – Über mich: Werdegang, Erfahrung, Ausbildung, Skills, Zertifikate, Sprachen, PDF-Download
- `style.css` – gemeinsame Styles beider Seiten
- `site.js` – Scroll-Fortschritt und Scroll-Reveal (beide Seiten)
- `cv-pdf.js` – erzeugt den Lebenslauf als PDF aus den Inhalten von `ueber-mich.html` (lädt `vendor/jspdf.umd.min.js` erst beim Klick). Die Selektoren (`header h1`, `.subtitle`, `.motto`, `.timeline-item`, `.edu-card`, `.skill-group`, `.cert-item`, `.lang-item`) bei Umbauten beibehalten.
- `portfolio.js` – Projekt-Netzkarte: Knoten anklicken (Szene mit abstrakter Animation) oder ziehen (Feder-Physik). Inhalte stehen als `.project-card` in `index.html`.
- `circuit.js` + `assets/circuit-*` – Platinen-Effekt beim Klick im Hero
- `fonts/`, `vendor/` – lokal eingebundene Schrift (Inter) und jsPDF
- `avatar.jpg`, `favicon.svg`, `CNAME`, `.github/workflows/deploy.yml`

## Platinen-Effekt (Assets)

- `assets/circuit-3840.webp` / `circuit-1920.webp`: Standbild, erzeugt mit Higgsfield (Nano Banana, 4K, 16:9, dunkle Leiterplatte mit violetten/türkisen Leiterbahnen). Scharfe Basis des Effekts.
- `assets/circuit-pulse.mp4`: Lichtimpulse, erzeugt mit MiniMax Hailuo 2.3 (1080p, 6 s, Standbild als Startbild, statische Kamera). Nur die Bewegung ist enthalten: per ffmpeg wurde das erste Frame abgezogen (`blend=all_mode=subtract`), das Video liegt mit `mix-blend-mode: screen` über dem Standbild.
- Neu erzeugen: Standbild und Video mit gleichem Bildausschnitt erzeugen, dann Differenz wie oben bilden. Kein Laden bei `prefers-reduced-motion`; bei `saveData` oder unter 600 px Breite nur das Standbild.

## Lokal entwickeln

```bash
python3 -m http.server 8000
```

Danach <http://localhost:8000> öffnen.

## Deployment

Jeder Push auf `main` deployt automatisch über GitHub Actions nach GitHub Pages.
