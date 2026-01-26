# 🎨 Advanced Customization

Go beyond `config.ts` - customize animations, transitions, and effects.

---

## Custom Animations

### Change Animation Timing

Edit the `spring` config in any scene:

```typescript
// src/scenes/Scene1Hook.tsx
const logoScale = spring({
  frame,
  fps,
  config: {
    damping: 100,  // ← Lower = more bouncy (default: 100)
    stiffness: 200, // ← Higher = faster (default: 200)
  },
});
```

**Presets:**
- **Smooth**: `{ damping: 200, stiffness: 100 }`
- **Bouncy**: `{ damping: 50, stiffness: 300 }`
- **Slow**: `{ damping: 300, stiffness: 50 }`

### Add Custom Interpolations

```typescript
import { interpolate } from 'remotion';

const rotation = interpolate(
  frame,
  [0, 30], // Input range (frames 0-30)
  [0, 360], // Output range (0-360 degrees)
  {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }
);

<div style={{ transform: `rotate(${rotation}deg)` }}>
  ❄️
</div>
```

---

## Custom Transitions

### Fade Transition Between Scenes

Create a reusable transition component:

```typescript
// src/components/FadeTransition.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const FadeTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};
```

Use it in `Video.tsx`:

```typescript
import { FadeTransition } from './components/FadeTransition';

<Sequence from={0} durationInFrames={scene1Frames}>
  <FadeTransition durationInFrames={scene1Frames}>
    <Scene1Hook />
  </FadeTransition>
</Sequence>
```

### Slide Transition

```typescript
// src/components/SlideTransition.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const SlideTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}> = ({ children, durationInFrames, direction = 'left' }) => {
  const frame = useCurrentFrame();

  const getTransform = () => {
    const offset = interpolate(
      frame,
      [0, 20],
      [100, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    switch (direction) {
      case 'left': return `translateX(-${offset}%)`;
      case 'right': return `translateX(${offset}%)`;
      case 'up': return `translateY(-${offset}%)`;
      case 'down': return `translateY(${offset}%)`;
    }
  };

  return (
    <AbsoluteFill style={{ transform: getTransform() }}>
      {children}
    </AbsoluteFill>
  );
};
```

---

## Custom Effects

### Gradient Background

```typescript
// src/scenes/Scene1Hook.tsx
<AbsoluteFill
  style={{
    background: `linear-gradient(135deg,
      ${videoConfig.colors.background} 0%,
      ${videoConfig.colors.primary}22 50%,
      ${videoConfig.colors.background} 100%
    )`,
  }}
>
```

### Animated Particles

```typescript
// src/components/Particles.tsx
import { AbsoluteFill, useCurrentFrame, random } from 'remotion';

export const Particles: React.FC<{ count: number }> = ({ count }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {Array.from({ length: count }).map((_, i) => {
        const x = random(`x-${i}`) * 1080;
        const y = (frame * (1 + random(`speed-${i}`)) + random(`offset-${i}`) * 1920) % 1920;
        const size = 2 + random(`size-${i}`) * 4;
        const opacity = 0.3 + random(`opacity-${i}`) * 0.4;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
```

Use in any scene:

```typescript
import { Particles } from '../components/Particles';

<AbsoluteFill>
  <Particles count={50} />
  {/* Rest of scene */}
</AbsoluteFill>
```

### Glow Effect

```typescript
<div
  style={{
    fontSize: 120,
    color: videoConfig.colors.primary,
    textShadow: `
      0 0 20px ${videoConfig.colors.primary}88,
      0 0 40px ${videoConfig.colors.primary}44,
      0 0 60px ${videoConfig.colors.primary}22
    `,
  }}
>
  SnowRail
</div>
```

---

## Custom Fonts

### 1. Add Google Font

```bash
# Install @remotion/google-fonts
npm install @remotion/google-fonts
```

```typescript
// src/scenes/Scene1Hook.tsx
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();

<div style={{ fontFamily }}>
  SnowRail
</div>
```

### 2. Use Local Font

```bash
# Add font files
mkdir -p video/public/fonts
cp /path/to/YourFont.woff2 video/public/fonts/
```

```typescript
// src/Video.tsx
import { continueRender, delayRender, staticFile } from 'remotion';
import { useEffect, useState } from 'react';

const SnowRailVideo: React.FC = () => {
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    const font = new FontFace(
      'CustomFont',
      `url(${staticFile('fonts/YourFont.woff2')})`
    );
    font.load().then(() => {
      document.fonts.add(font);
      continueRender(handle);
    });
  }, [handle]);

  // Rest of component
};
```

Then use:

```typescript
<div style={{ fontFamily: 'CustomFont' }}>Text</div>
```

---

## Performance Optimization

### Reduce Re-renders

Use `useMemo` for expensive calculations:

```typescript
import { useMemo } from 'react';

const heavyCalculation = useMemo(() => {
  return expensiveFunction(frame);
}, [frame]);
```

### Lazy Load Components

```typescript
import { lazy, Suspense } from 'react';

const Scene3Solution = lazy(() => import('./scenes/Scene3Solution'));

<Suspense fallback={<div>Loading...</div>}>
  <Scene3Solution />
</Suspense>
```

### Optimize Images

```typescript
import { Img, staticFile } from 'remotion';

<Img
  src={staticFile('logo.png')}
  style={{ width: 200, height: 200 }}
/>
```

---

## Export Presets

### Instagram Reels (9:16)
```bash
npx remotion render src/index.ts SnowRailPromo out/instagram.mp4 \
  --codec=h264 \
  --quality=80
```

### TikTok (9:16, shorter)
```bash
npx remotion render src/index.ts SnowRailPromo out/tiktok.mp4 \
  --frames=0-420 \
  --codec=h264
```

### YouTube Shorts (9:16)
```bash
npx remotion render src/index.ts SnowRailPromo out/youtube-shorts.mp4 \
  --codec=h264 \
  --quality=90
```

---

## Debugging

### Show Frame Number

```typescript
import { useCurrentFrame } from 'remotion';

const frame = useCurrentFrame();

<div style={{
  position: 'absolute',
  top: 20,
  left: 20,
  color: 'white',
  fontSize: 24,
}}>
  Frame: {frame}
</div>
```

### Log Animation Values

```typescript
const logoScale = spring({ frame, fps, config: {} });
console.log(`Frame ${frame}: scale = ${logoScale}`);
```

---

**More examples:** [Remotion Templates](https://remotion.dev/templates)
