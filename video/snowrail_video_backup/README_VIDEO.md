# SnowRail Promo Video

**15-second vertical video (9:16) for social media promotion**

Built with [Remotion](https://remotion.dev) - Create videos programmatically using React.

---

## 📹 Video Specifications

- **Duration**: 15 seconds (450 frames @ 30fps)
- **Format**: Vertical 9:16 (1080x1920)
- **Framerate**: 30 fps
- **Style**: Premium tech, clean transitions
- **Audio**: No audio by default (add later if needed)

---

## 🎬 Video Structure

### Scene 1: Hook (0.0 - 2.5s)
- ❄️ Logo + "SnowRail" title
- Tagline: "Trust-before-pay for AI agents"
- Smooth fade-in animation

### Scene 2: Problem (2.5 - 6.0s)
- Problem statement: "AI agents pay fraudulent endpoints"
- Grid background effect
- Text animations

### Scene 3: Solution (6.0 - 10.5s)
- 3 key features with icons:
  - 🛡️ SENTINEL validates trust scores
  - ⚡ x402 protocol integration
  - 🏔️ Built on Avalanche
- Staggered slide-in animations

### Scene 4: Proof (10.5 - 13.0s)
- 🏆 1st Place badge
- "Avalanche Hack2Build"
- "Payments x402" category
- Radial gradient background

### Scene 5: CTA (13.0 - 15.0s)
- Call to action: "Try the demo"
- GitHub URL
- Final logo punch

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd video
npm install
# or
pnpm install
```

### 2. Preview the Video

```bash
npm run preview
```

This opens a browser window at `http://localhost:3000` where you can:
- Scrub through the timeline
- Preview each frame
- Check timing and animations
- Test different resolutions

### 3. Render to MP4

```bash
npm run render
```

Output: `video/out/snowrail-promo.mp4`

**Advanced render options:**
```bash
# High quality (slower)
npx remotion render src/index.ts SnowRailPromo out/snowrail-hq.mp4 --quality=100

# Specific frame range
npx remotion render src/index.ts SnowRailPromo out/test.mp4 --frames=0-90

# Different codec
npx remotion render src/index.ts SnowRailPromo out/snowrail.webm --codec=vp8
```

---

## ✏️ Customizing Content

**All text and styling is editable in one file:**

[`src/config.ts`](src/config.ts)

### Example: Change the tagline

```typescript
// src/config.ts
export const videoConfig = {
  scene1: {
    logo: '❄️',
    title: 'SnowRail',
    tagline: 'Your custom tagline here', // ← Edit this
    duration: 2.5,
  },
  // ...
}
```

### Example: Change colors

```typescript
// src/config.ts
export const videoConfig = {
  colors: {
    primary: '#E84142',      // ← Avalanche red
    secondary: '#FFFFFF',
    background: '#0A0A0F',   // ← Dark background
    accent: '#4F46E5',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
  },
  // ...
}
```

### Example: Adjust scene duration

```typescript
// src/config.ts
export const videoConfig = {
  scene3: {
    title: 'How it works',
    features: [...],
    duration: 5.0, // ← Changed from 4.5s to 5.0s
  },
  // ...
}
```

**After editing `config.ts`:**
- Preview updates automatically (hot reload)
- Re-render to generate new MP4

---

## 📁 Project Structure

```
video/
├── src/
│   ├── index.ts              # Remotion entry point
│   ├── Video.tsx             # Main composition with scene sequencing
│   ├── config.ts             # ⭐ EDIT THIS FILE for content changes
│   └── scenes/
│       ├── Scene1Hook.tsx    # Hook (logo + tagline)
│       ├── Scene2Problem.tsx # Problem statement
│       ├── Scene3Solution.tsx# Solution (3 features)
│       ├── Scene4Proof.tsx   # Credibility (1st Place)
│       └── Scene5CTA.tsx     # Call to action
│
├── out/                      # Rendered videos (gitignored)
├── package.json
├── tsconfig.json
└── README_VIDEO.md           # This file
```

---

## 🎨 Design System

### Typography
- **Headings**: Bold, 72-140px
- **Body**: Regular/SemiBold, 48-64px
- **Captions**: 48px, muted color

### Colors (from config.ts)
- **Primary**: `#E84142` (Avalanche red)
- **Background**: `#0A0A0F` (near-black)
- **Text**: `#F9FAFB` (off-white)
- **Muted**: `#9CA3AF` (gray)

### Spacing
- **Safe margins**: 80px horizontal padding
- **Vertical gaps**: 40-60px between elements
- **Icon boxes**: 140x140px with 20px border-radius

---

## 🛠️ Troubleshooting

### Video won't preview
```bash
# Clear Remotion cache
rm -rf .remotion/
npm run preview
```

### Render fails
```bash
# Check Node.js version (requires 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Performance issues
- Use `--concurrency=1` flag for slower machines
- Reduce quality during testing: `--quality=50`
- Preview only specific scenes by adjusting frame range

---

## 📚 Learn More

- [Remotion Documentation](https://remotion.dev/docs)
- [Remotion API Reference](https://remotion.dev/docs/api)
- [Animation Timing](https://remotion.dev/docs/spring)
- [Rendering Options](https://remotion.dev/docs/render)

---

## 📋 TODOs

- [ ] Add custom font (if brand guidelines require specific typeface)
- [ ] Add audio/music (currently silent)
- [ ] Add SnowRail logo asset (currently using ❄️ emoji)
- [ ] Optimize for Instagram/TikTok export presets
- [ ] Create horizontal 16:9 version for YouTube

---

## 🎯 Next Steps

1. **Preview** the video to verify timing and animations
2. **Customize** content in `src/config.ts` to match your branding
3. **Render** the final MP4 for distribution
4. **Share** on social media (optimized for vertical feeds)

---

**Questions?** Check [Remotion Discord](https://remotion.dev/discord) or file an issue.

Built for **SnowRail** - Trust-before-pay for AI agents 🏔️
