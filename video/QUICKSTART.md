# ⚡ Quick Start - SnowRail Video

**Get your promo video in 3 steps (2 minutes)**

---

## 1️⃣ Install

```bash
cd video
npm install
```

## 2️⃣ Preview

```bash
npm run preview
```

Opens browser at `http://localhost:3000` - scrub through the timeline to preview.

## 3️⃣ Render

```bash
npm run render
```

Output: `video/out/snowrail-promo.mp4`

---

## ✏️ Edit Content

Open `src/config.ts` and change any text:

```typescript
export const videoConfig = {
  scene1: {
    tagline: 'Your custom tagline here', // ← Edit this
  },
  scene3: {
    features: [
      { icon: '🛡️', text: 'Your feature 1' }, // ← Edit these
      { icon: '⚡', text: 'Your feature 2' },
      { icon: '🏔️', text: 'Your feature 3' },
    ],
  },
  // ... etc
}
```

Save → Auto-reloads in preview.

---

## 📖 Full Docs

See [README_VIDEO.md](README_VIDEO.md) for:
- Video structure breakdown
- Advanced rendering options
- Troubleshooting
- Design system specs

---

**That's it!** 🎬
