# 🔧 Technical Specifications

**Complete technical reference for the SnowRail promo video**

---

## Video Output Specs

| Property | Value |
|----------|-------|
| **Duration** | 15.0 seconds (450 frames) |
| **Framerate** | 30 fps |
| **Resolution** | 1080 x 1920 (9:16 vertical) |
| **Codec** | H.264 (default) |
| **Pixel Format** | yuv420p |
| **Color Space** | sRGB |
| **Audio** | None (silent by default) |

---

## Scene Breakdown

### Scene 1: Hook
- **Timing**: 0.0s - 2.5s (frames 0-75)
- **Duration**: 2.5 seconds
- **Components**:
  - Logo animation (spring scale)
  - Title fade-in (delayed spring)
  - Tagline fade-in (delayed spring)
- **Performance**: Low complexity, renders fast

### Scene 2: Problem
- **Timing**: 2.5s - 6.0s (frames 75-180)
- **Duration**: 3.5 seconds
- **Components**:
  - Background grid (CSS gradient)
  - Title animation
  - Description animation
  - Subtitle animation
- **Performance**: Medium complexity (grid rendering)

### Scene 3: Solution
- **Timing**: 6.0s - 10.5s (frames 180-315)
- **Duration**: 4.5 seconds
- **Components**:
  - 3 feature cards (staggered animations)
  - Icon boxes with background
  - Slide + fade animations
- **Performance**: Medium complexity (multiple elements)

### Scene 4: Proof
- **Timing**: 10.5s - 13.0s (frames 315-390)
- **Duration**: 2.5 seconds
- **Components**:
  - Badge scale animation
  - Radial gradient background
  - Text fade-ins
- **Performance**: Low complexity

### Scene 5: CTA
- **Timing**: 13.0s - 15.0s (frames 390-450)
- **Duration**: 2.0 seconds
- **Components**:
  - CTA text animation
  - URL display
  - Logo scale animation
- **Performance**: Low complexity

**Total frames**: 450 (15s × 30fps)

---

## Dependencies

### Production
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "remotion": "^4.0.0"
}
```

### Development
```json
{
  "@remotion/cli": "^4.0.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "typescript": "^5.3.0"
}
```

**Total package size**: ~50MB (node_modules)

---

## File Structure

```
video/
├── src/
│   ├── index.ts              # Entry point (registerRoot)
│   ├── Video.tsx             # Main composition (scene sequencing)
│   ├── config.ts             # Editable content & styling
│   └── scenes/
│       ├── index.ts          # Scene exports
│       ├── Scene1Hook.tsx    # 2.5s - Logo + tagline
│       ├── Scene2Problem.tsx # 3.5s - Problem statement
│       ├── Scene3Solution.tsx# 4.5s - Features
│       ├── Scene4Proof.tsx   # 2.5s - Credibility
│       └── Scene5CTA.tsx     # 2.0s - Call to action
│
├── out/                      # Rendered videos (gitignored)
│   └── snowrail-promo.mp4
│
├── public/                   # Static assets (optional)
│   ├── audio/                # Audio files
│   └── fonts/                # Custom fonts
│
├── package.json
├── tsconfig.json
├── .gitignore
│
└── docs/
    ├── README_VIDEO.md       # Main documentation
    ├── QUICKSTART.md         # 3-step guide
    ├── ADDING_AUDIO.md       # Audio integration guide
    ├── ADVANCED_CUSTOMIZATION.md
    └── TECHNICAL_SPECS.md    # This file
```

---

## Render Performance

### Local Development
- **Preview**: Real-time (~30fps in browser)
- **Render time**: ~30-60 seconds (450 frames)
- **CPU usage**: Medium (single-threaded by default)
- **RAM usage**: ~500MB-1GB

### Production Render
```bash
# Default (balanced)
npm run render
# Time: ~45s on M1 Mac, ~90s on Intel i5

# High quality (slower)
npx remotion render src/index.ts SnowRailPromo out/hq.mp4 --quality=100
# Time: ~120s on M1 Mac

# Fast preview (lower quality)
npx remotion render src/index.ts SnowRailPromo out/preview.mp4 --quality=50
# Time: ~25s on M1 Mac
```

### Optimization Tips
1. Use `--concurrency=2` for dual-core machines
2. Reduce `--quality` for faster test renders
3. Use `--frames=0-90` to render only first 3 seconds
4. Cache `node_modules` in CI/CD pipelines

---

## Animation System

### Spring Animations
All animations use Remotion's `spring()` function:

```typescript
spring({
  frame,              // Current frame number
  fps,                // Framerate (30)
  config: {
    damping: 100,     // Higher = less bouncy
    stiffness: 200,   // Higher = faster
  },
})
```

**Output**: 0.0 to 1.0 (easing curve)

### Interpolation
Linear interpolation for precise timing:

```typescript
interpolate(
  frame,              // Input value
  [0, 30],            // Input range
  [0, 1],             // Output range
  {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }
)
```

---

## Color System

### Brand Colors (from config.ts)
```typescript
colors: {
  primary: '#E84142',    // Avalanche red (RGBA: 232, 65, 66)
  secondary: '#FFFFFF',  // White
  background: '#0A0A0F', // Near-black (RGBA: 10, 10, 15)
  accent: '#4F46E5',     // Indigo (unused in default)
  text: '#F9FAFB',       // Off-white
  textMuted: '#9CA3AF',  // Gray
}
```

### Transparency
- Append alpha hex: `#E8414233` (20% opacity)
- Or use rgba: `rgba(232, 65, 66, 0.2)`

---

## Typography

### Font Stack
- **Default**: System font (no external fonts loaded)
- **Fallback**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Sizes
```typescript
{
  logo: 200,           // Emoji logo
  title: 120,          // Main title
  heading: 72-96,      // Section headings
  body: 48-64,         // Body text
  caption: 48,         // Captions/URLs
}
```

### Font Weights
- **Bold**: 700 (headings, titles)
- **SemiBold**: 600 (features)
- **Regular**: 400 (body text)

---

## Browser Compatibility

### Preview (Development)
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Render (Node.js)
- Requires Node.js 18+ (LTS recommended)
- Uses headless Chromium (bundled with Remotion)

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Render Video
on: [push]
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run render
      - uses: actions/upload-artifact@v3
        with:
          name: video
          path: out/snowrail-promo.mp4
```

---

## Memory Footprint

| Stage | RAM Usage |
|-------|-----------|
| **Install** | 50MB (packages) |
| **Preview** | 500MB (browser) |
| **Render** | 1GB (Chromium + video encoding) |

---

## Extending the Video

### Add a New Scene

1. Create scene component:
```typescript
// src/scenes/Scene6NewScene.tsx
export const Scene6NewScene: React.FC = () => {
  return <AbsoluteFill>{/* ... */}</AbsoluteFill>;
};
```

2. Add to config:
```typescript
// src/config.ts
export const videoConfig = {
  // ...
  scene6: {
    title: 'New Scene',
    duration: 2.0,
  },
};
```

3. Sequence in Video.tsx:
```typescript
// src/Video.tsx
import { Scene6NewScene } from './scenes/Scene6NewScene';

const scene6Frames = Math.floor(videoConfig.scene6.duration * fps);

<Sequence from={previousSceneEnd} durationInFrames={scene6Frames}>
  <Scene6NewScene />
</Sequence>
```

4. Update total duration:
```typescript
// src/config.ts
durationInSeconds: 17, // 15 + 2
```

---

## Known Limitations

- No audio by default (add manually)
- Emoji rendering may vary by OS
- Preview performance depends on browser
- Render requires 1GB+ RAM
- No built-in subtitle support (add custom component)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Initial release |

---

**Questions?** Check [Remotion docs](https://remotion.dev/docs) or [open an issue](https://github.com/Colombia-Blockchain/snowrail-core/issues).
