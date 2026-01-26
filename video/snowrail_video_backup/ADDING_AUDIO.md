# 🎵 Adding Audio to the Video

The video is silent by default. Here's how to add background music or sound effects.

---

## Method 1: Add Background Music

### 1. Add audio file to project

```bash
# Create audio folder
mkdir -p video/public/audio

# Copy your audio file (MP3/WAV)
cp /path/to/your-music.mp3 video/public/audio/background.mp3
```

### 2. Edit `src/Video.tsx`

Add the `<Audio>` component from Remotion:

```typescript
import { Audio, Sequence } from 'remotion';

const SnowRailVideo: React.FC = () => {
  // ... existing code

  return (
    <>
      {/* Background music */}
      <Audio
        src="/audio/background.mp3"
        volume={0.3} // 30% volume
        startFrom={0}
      />

      {/* Existing scenes */}
      <Sequence from={0} durationInFrames={scene1Frames}>
        <Scene1Hook />
      </Sequence>
      {/* ... rest of scenes */}
    </>
  );
};
```

### 3. Preview and render

```bash
npm run preview  # Audio plays in browser
npm run render   # Audio baked into MP4
```

---

## Method 2: Add Sound Effects per Scene

### Example: Add "whoosh" sound to Scene 3

```typescript
// src/scenes/Scene3Solution.tsx
import { Audio } from 'remotion';

export const Scene3Solution: React.FC = () => {
  // ... existing code

  return (
    <AbsoluteFill>
      {/* Sound effect */}
      <Audio src="/audio/whoosh.mp3" volume={0.5} />

      {/* Rest of scene */}
      {/* ... */}
    </AbsoluteFill>
  );
};
```

---

## Audio Best Practices

### Volume Levels
- **Background music**: 0.2 - 0.4 (20-40%)
- **Sound effects**: 0.4 - 0.6 (40-60%)
- **Voiceover**: 0.8 - 1.0 (80-100%)

### Formats
- **Best compatibility**: MP3
- **High quality**: WAV (but larger file size)
- **Web-optimized**: OGG

### Timing
- Use `startFrom` prop to delay audio:
  ```typescript
  <Audio src="/audio/sound.mp3" startFrom={30} /> // Starts at frame 30
  ```

- Trim audio duration:
  ```typescript
  <Audio
    src="/audio/sound.mp3"
    endAt={60} // Stops at frame 60
  />
  ```

---

## Sync Audio with Animations

Match audio timing to scene transitions:

```typescript
const fps = 30;
const scene3StartFrame = 180; // 6 seconds * 30fps

<Audio
  src="/audio/feature-reveal.mp3"
  startFrom={scene3StartFrame}
  volume={0.5}
/>
```

---

## Royalty-Free Music Sources

- [Pixabay Music](https://pixabay.com/music/)
- [Free Music Archive](https://freemusicarchive.org/)
- [YouTube Audio Library](https://studio.youtube.com/channel/UCuDyYGr7UZQjSX06K0Pw5yw/music)
- [Incompetech](https://incompetech.com/music/)

**⚠️ Always check the license** before using in commercial projects.

---

## Troubleshooting

### Audio doesn't play in preview
- Check file path is correct (relative to `public/`)
- Verify audio file format (MP3 recommended)
- Check browser console for errors

### Audio is out of sync
- Adjust `startFrom` prop to match scene timing
- Use `useCurrentFrame()` for precise timing

### Audio too loud/quiet
- Adjust `volume` prop (0.0 to 1.0)
- Use audio editing software to normalize levels before adding

---

**Need help?** Check [Remotion Audio docs](https://remotion.dev/docs/using-audio)
