# Online-CV – schranz-it.com

Statische Website (reines HTML/CSS/JS, kein Build-Schritt), gehostet über GitHub Pages unter <https://schranz-it.com>.

## Struktur

- `index.html` – Startseite von **Schranz IT**: Hero mit Warp-Intro und Platinen-Effekt, Leistungen, Arbeitsweise, Projekte (Netzkarte), Kontakt
- `ueber-mich.html` – Über mich: Werdegang, Erfahrung, Ausbildung, Skills, Zertifikate, Sprachen, PDF-Download
- `style.css` – gemeinsame Styles beider Seiten
- `site.js` – Scroll-Fortschritt und Scroll-Reveal (beide Seiten)
- `cv-pdf.js` – erzeugt den Lebenslauf als PDF aus den Inhalten von `ueber-mich.html` (lädt `vendor/jspdf.umd.min.js` erst beim Klick). Die Selektoren (`header h1`, `.subtitle`, `.motto`, `.timeline-item`, `.edu-card`, `.skill-group`, `.cert-item`, `.lang-item`) bei Umbauten beibehalten.
- `services.js` – Leistungen als Probenfächer (baut den Fächer aus den `.svc-card`-Einträgen in `index.html`, blättert automatisch durch, bis man selbst wählt)
- `portfolio.js` – Projekte: Übersicht als Patchfeld im Serverrack (Ports = Projekte, echte Buttons; Kabel als SVG), nach Klick eine schematische Canvas-Animation je Projekt. Inhalte stehen als `.project-card` in `index.html`.
- `circuit.js` + `assets/circuit-*` – Platinen-Effekt beim Klick in den Seitenhintergrund (beide Seiten; Klicks auf Karten, Links, Netzkarte und Navigation lösen ihn nicht aus)
- `fonts/`, `vendor/` – lokal eingebundene Schrift (Inter) und jsPDF
- `avatar.jpg`, `favicon.svg`, `CNAME`, `.github/workflows/deploy.yml`

## Patchfeld (Assets)

- `assets/rack-panel.webp`: leeres 2U-19"-Patchfeld (graphitfarbenes gebürstetes Aluminium, Rack-Ohren), per `border-image` gestreckt (Ohren fix).
- `assets/rack-port.webp`: leere RJ45-Buchse; `assets/rack-plug-{violet,teal,amber}.webp`: Stecker mit farbiger Tülle (Türkis/Bernstein mit Violett als Referenz).
- Erzeugt mit der Higgsfield-CLI (GPT Image 2.5, `--background transparent`, `--quality high`), zugeschnitten und als WebP gespeichert. Der klare Steckerkopf wird per `clip-path` abgeschnitten, damit er in der Buchse zu stecken scheint.

## Leistungs-Fächer (Assets)

- `assets/fan-violet.webp`, `fan-teal.webp`, `fan-amber.webp`: freigestellte Fächerblätter aus eloxiertem Aluminium, erzeugt mit der Higgsfield-CLI (GPT Image 2.5, `--background transparent`, `--quality high`). Violett zuerst, Türkis und Bernstein mit Violett als Referenzbild für identische Form und Licht. Zugeschnitten und auf 240 px Breite skaliert.
- `assets/fan-pivot.webp`: Schraube als Drehpunkt (gleiches Modell, 1:1).
- Im CSS per `border-image` (9-Slice) auf Länge gezogen, damit Rundung und Bohrung nicht verzerren; Drehpunkt = Mitte der Bohrung (45 % der Blattbreite über der Unterkante).

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
