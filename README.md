# Online-CV – schranz-it.com

Statische Website (reines HTML/CSS/JS, kein Build-Schritt), gehostet über GitHub Pages unter <https://schranz-it.com>.

## Struktur

- `index.html` – gesamte Seite inkl. Styles und Skripte
- `fonts/`, `vendor/` – lokal eingebundene Schrift (Inter) und `jspdf` für die PDF-Erzeugung
- `avatar.jpg`, `favicon.svg`, `hero-intro-*.mp4` – Medien
- `CNAME` – Custom Domain
- `.github/workflows/deploy.yml` – Deployment auf GitHub Pages bei Push auf `main`

## Design-Richtung

- Dunkles Neon-Design bleibt. Entfernt werden nur die Merkmale, die nach „AI-Slop" aussehen (generische Effekte, Emoji-Icons, Standard-Floskeln).
- Projekte werden als abstrakt gestaltetes, animiertes Portfolio präsentiert (Inhalte werden gemeinsam erarbeitet).
- Der PDF-Download-Link bleibt erhalten.

## Lokal entwickeln

```bash
python3 -m http.server 8000
```

Danach <http://localhost:8000> öffnen.

## Deployment

Jeder Push auf `main` deployt automatisch über GitHub Actions nach GitHub Pages.
