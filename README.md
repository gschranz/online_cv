# Online-CV – schranz-it.com

Statische Website (reines HTML/CSS/JS, kein Build-Schritt), gehostet über GitHub Pages unter <https://schranz-it.com>.

## Struktur

- `index.html` – gesamte Seite inkl. Styles und Skripte
- `fonts/`, `vendor/` – lokal eingebundene Schriften (Inter, JetBrains Mono) und `jspdf` für die PDF-Erzeugung
- `avatar.jpg`, `favicon.svg` – Medien
- Intro-Animation: Canvas-2D in nativer Geräteauflösung (kein Video), läuft einmal pro Sitzung, entfällt bei `prefers-reduced-motion`
- `CNAME` – Custom Domain
- `.github/workflows/deploy.yml` – Deployment auf GitHub Pages bei Push auf `main`

## Design

- Stil: Industrial/Swiss-Print (heller Papier-Hintergrund, Tinte, eine rote Akzentfarbe, sichtbares Raster, Inter Black + JetBrains Mono, keine Gradients/Glows/Emojis).
- Aufbau: Hero → Leistungen → Projekte → Über mich (CV) → Kontakt. Der PDF-Download baut den Lebenslauf per JS aus den Klassen/IDs im Abschnitt „Über mich" und im Hero (`header h1`, `.subtitle`, `.motto`, `.timeline-item`, `.edu-card`, `.skill-group`, `.cert-item`, `.lang-item`, `.project-card`) – bei Umbauten diese Selektoren beibehalten.
- Offen: echte Kundenreferenzen (aktuell nur Eigenprojekte unter „Projekte").

## Lokal entwickeln

```bash
python3 -m http.server 8000
```

Danach <http://localhost:8000> öffnen.

## Deployment

Jeder Push auf `main` deployt automatisch über GitHub Actions nach GitHub Pages.
