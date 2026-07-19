# Billy the Hood Dog ($BILLY)

Statische Website für den Meme Coin **$BILLY** — inklusive einem clientseitigen PFP-Mask-Generator (reine Canvas-API, kein Server, kein Build-Schritt nötig).

## Struktur

```
billy-hood-dog/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js              # Nav-Toggle + Scroll-Reveal-Animationen
│   └── mask-generator.js    # PFP-Mask-Generator (Canvas)
└── assets/
    ├── logo.png              # Markenlogo (transparent)
    └── masks/
        ├── mask-1.png         # Maske "Toxic Green"
        └── mask-2.png         # Maske "Dust Tan"
```

## Deployment auf GitHub Pages (kein Python, kein Build-Schritt)

Das ganze Projekt ist reines HTML/CSS/JS — nichts davon braucht Python, Node oder einen Build-Schritt. Python wurde nur einmalig **von mir** benutzt, um die Masken-Bilder freizustellen (transparenter Hintergrund) — das Ergebnis sind fertige `.png`-Dateien in `assets/`, im Repo selbst liegt keine `.py`-Datei.

1. Neues Repo auf GitHub erstellen und alle Dateien aus diesem Ordner pushen (Struktur wie oben beibehalten).
2. Im Repo: **Settings → Pages → Build and deployment → Source: „Deploy from a branch"**.
3. Branch `main` und Ordner `/ (root)` auswählen, speichern.
4. Nach ein bis zwei Minuten ist die Seite live unter `https://<dein-username>.github.io/<repo-name>/`.

Alternativ funktioniert genauso: Repo bei [Vercel](https://vercel.com) oder [Netlify](https://netlify.com) importieren — auch dort ohne Build-Command, einfach als statische Seite deployen.

## Seiteninhalt

- **Hero** — Wanted-Poster/Mugshot-Optik mit Case-File-Nummer und Chain-Badge
- **About** — vollständige Lore ("Who Let The Dogs Out?")
- **Tokenomics** — Evidence-Karten (Tax, Supply, LP Lock, Contract, Chain, Launchpad) + Buyback-&-Burn-Erklärung
- **Meme Gallery** — Platzhalter-Corkboard für zukünftige Memes
- **Mask Generator** — der PFP-Generator (Details unten)
- **How to Buy** — 4-Schritte-Anleitung + Links zu DexScreener/Uniswap
- **Footer** — Social-Links + rechtlicher Disclaimer

Alle Platzhalter (Launchpad-Link, Contract Address, Total Supply, Telegram-Link, Twitter-Handle, Meme-Bilder) sind mit `TBA` / `#` markiert und sollten vor dem Live-Gang ersetzt werden.

## PFP Mask Generator — Funktionen

- **Foto-Upload**, komplett lokal — es wird nichts an einen Server geschickt
- **2 Masken** zur Auswahl (`mask-1.png`, `mask-2.png`), beide mit transparentem Hintergrund
- **Verschieben**: Maske direkt auf dem Canvas anfassen und ziehen
- **Skalieren**: grünen Eckpunkt ziehen *oder* den Größen-Slider benutzen
- **Rotieren**: gelben Punkt über der Maske ziehen *oder* den Dreh-Slider benutzen (−180° bis 180°)
- **Zurücksetzen** auf Standardposition/-größe/-drehung per Klick
- **Download** als PNG (600×600 px, benannt `billy-hood-dog-pfp.png`)

Alles läuft über Pointer-Events, funktioniert also gleichermaßen mit Maus, Trackpad und Touch.

### Eigene Masken ergänzen

1. Neue transparente PNG-Datei nach `assets/masks/` legen (Freistellung z. B. mit Photoshop, Photopea oder `remove.bg`).
2. In `index.html` im Block `#maskPicker` einen weiteren Eintrag ergänzen:

```html
<button type="button" class="mask-thumb" data-mask="assets/masks/mask-3.png" title="Neue Maske">
  <img src="assets/masks/mask-3.png" alt="Neue Maske">
</button>
```

Der Generator erkennt neue Masken automatisch — keine JS-Änderung nötig.

## Lokal testen (optional, kein Python nötig)

Die Seite direkt als `index.html` per Doppelklick im Browser zu öffnen funktioniert in den meisten Browsern bereits vollständig, inklusive Mask Generator. Falls ein Browser lokale Bilder per `file://` blockiert (Canvas/CORS), reicht irgendein einfacher statischer Server — z. B. die kostenlose VS-Code-Erweiterung **„Live Server"** (Rechtsklick auf `index.html` → „Open with Live Server"), oder direkt über GitHub Pages testen (siehe oben).
