# qs1ber.com — Portfolio

Liquid-glass 3D portfolio for Wasyl Szamborski (qs1ber).

## Stack

- Vanilla JS + Three.js (CDN import map)
- FBX smiley, cloner-style path, cursor tracking

## Dev

Double-click `start-server.bat` or:

```bash
python -m http.server 8080
```

Then open http://localhost:8080

Optional: `npm install && npm run dev` if Node.js is installed (Vite).

## Features (v0.1)

- Preloader → white reveal → shapes animate along path (Flow easing)
- Pink smiley follows cursor; 360° spin + sad/search when cursor leaves viewport
- Eye stretch on click (scale Y toward click point)
- Camera parallax on mouse move
- Snap scroll between sections (no visible gap)
- Liquid glass UI, off-white `#f2f0ef` background
- Project panels with role / description / tags

## Assets

3D model and textures live in `public/assets/models/` (from `cube4.fbx`).

## TODO

- [ ] Replace project video placeholders with real reels
- [ ] Fine-tune path curve to match Cinema 4D composition
- [ ] Sad face texture / mouth morph
- [ ] Adobe Fonts kit for Proxima Nova (or license)
- [ ] Deploy to qs1ber.com
