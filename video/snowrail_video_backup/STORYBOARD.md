# 🎬 Video Storyboard

**Visual breakdown of the 15-second SnowRail promo**

---

## Timeline Overview

```
0s                5s                10s               15s
├─────────┼─────────┼─────────┼─────────┼─────────┼─────┤
│ HOOK    │ PROBLEM │  SOLUTION        │  PROOF  │ CTA │
└─────────┴─────────┴──────────────────┴─────────┴─────┘
  2.5s      3.5s         4.5s            2.5s      2.0s
```

---

## Scene 1: Hook (0.0 - 2.5s)

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│              ❄️                  │ ← Logo (scale animation)
│           (200px)                │
│                                  │
│          SnowRail                │ ← Title (fade in)
│          (120px)                 │
│                                  │
│   Trust-before-pay for AI agents │ ← Tagline (fade in)
│          (48px)                  │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Animations:**
- Frame 0-20: Logo scales from 0 → 1
- Frame 10-30: Title fades in
- Frame 20-40: Tagline fades in

**Colors:**
- Background: `#0A0A0F` (near-black)
- Title: `#FFFFFF` (white)
- Tagline: `#9CA3AF` (gray)

---

## Scene 2: Problem (2.5 - 6.0s)

```
┌──────────────────────────────────┐
│ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ │ ← Grid background
│ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ │
│                                  │
│        THE PROBLEM               │ ← Title (red)
│          (64px)                  │
│                                  │
│   AI agents pay fraudulent       │ ← Main text (white)
│        endpoints                 │   (72px, bold)
│          (72px)                  │
│                                  │
│   No trust validation            │ ← Subtitle (gray)
│     before payment               │   (48px)
│                                  │
│ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ │
└──────────────────────────────────┘
```

**Animations:**
- Frame 0-20: Title fades in
- Frame 15-35: Description fades in
- Frame 30-50: Subtitle fades in

**Colors:**
- Title: `#E84142` (Avalanche red)
- Text: `#F9FAFB` (off-white)
- Grid: `#E8414222` (red with 13% opacity)

---

## Scene 3: Solution (6.0 - 10.5s)

```
┌──────────────────────────────────┐
│                                  │
│        HOW IT WORKS              │ ← Title
│          (72px)                  │
│                                  │
│                                  │
│  ┌────┐                          │
│  │🛡️ │ SENTINEL validates        │ ← Feature 1
│  └────┘   trust scores           │   (slides in)
│   (100px)    (52px)              │
│                                  │
│  ┌────┐                          │
│  │⚡ │ x402 protocol             │ ← Feature 2
│  └────┘   integration            │   (slides in)
│                                  │
│  ┌────┐                          │
│  │🏔️ │ Built on Avalanche        │ ← Feature 3
│  └────┘                          │   (slides in)
│                                  │
└──────────────────────────────────┘
```

**Animations:**
- Frame 0-20: Title fades in
- Frame 20-40: Feature 1 slides in from right
- Frame 50-70: Feature 2 slides in from right
- Frame 80-100: Feature 3 slides in from right

**Colors:**
- Icon boxes: `#E8414233` (red with 20% opacity)
- Text: `#F9FAFB` (off-white)

---

## Scene 4: Proof (10.5 - 13.0s)

```
┌──────────────────────────────────┐
│         ◉  Radial glow           │ ← Background effect
│                                  │
│                                  │
│              🏆                  │ ← Badge (scale bounce)
│           (240px)                │
│                                  │
│          1st Place               │ ← Title (red)
│          (140px)                 │
│                                  │
│    Avalanche Hack2Build          │ ← Subtitle (white)
│          (64px)                  │
│                                  │
│       Payments x402              │ ← Category (gray)
│          (48px)                  │
│                                  │
└──────────────────────────────────┘
```

**Animations:**
- Frame 0-30: Badge scales with bounce
- Frame 15-35: Title fades in
- Frame 25-45: Subtitle + category fade in

**Colors:**
- Background: Radial gradient (red to transparent)
- Title: `#E84142` (red)
- Subtitle: `#F9FAFB` (white)
- Category: `#9CA3AF` (gray)

---

## Scene 5: CTA (13.0 - 15.0s)

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│                                  │
│         Try the demo             │ ← CTA (white, bold)
│          (96px)                  │
│                                  │
│                                  │
│  github.com/Colombia-Blockchain  │ ← URL (red, mono)
│       /snowrail-core             │   (52px)
│                                  │
│                                  │
│              ❄️                  │ ← Logo (scale)
│           (160px)                │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Animations:**
- Frame 0-20: CTA fades in
- Frame 15-35: URL fades in
- Frame 25-45: Logo scales with bounce

**Colors:**
- CTA: `#F9FAFB` (white)
- URL: `#E84142` (red)

---

## Animation Curves

All animations use **spring physics** for natural motion:

```
Standard Spring (damping: 100, stiffness: 200)
Value
1.0 ┤     ╭─────
    │    ╱
0.8 ┤   ╱
    │  ╱
0.6 ┤ ╱
    │╱
0.4 ┤
    │
0.2 ┤
    │
0.0 ┼────────────► Frames
    0   10   20   30
```

**Characteristics:**
- No linear motion (more organic)
- Slight overshoot for bounce effect
- Smooth deceleration

---

## Safe Margins

All text respects safe zones:

```
┌──────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← 80px margin
│░░┌────────────────────────────┐░░│
│░░│                            │░░│
│░░│      Content Area          │░░│
│░░│      (Safe Zone)           │░░│
│░░│                            │░░│
│░░│                            │░░│
│░░└────────────────────────────┘░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← 80px margin
└──────────────────────────────────┘
```

**Margins:**
- Horizontal: 80px left/right
- Vertical: 200px top (title area), flexible bottom

---

## Text Hierarchy

```
Level 1: Logo          200px  (emoji)
Level 2: Titles        120-140px  (bold)
Level 3: Headings      64-96px   (bold/uppercase)
Level 4: Body          48-72px   (regular/semibold)
Level 5: Captions      48px      (regular, muted)
```

---

## Frame-by-Frame Key Moments

| Frame | Second | Event |
|-------|--------|-------|
| 0 | 0.0 | Video starts, logo begins scaling |
| 30 | 1.0 | Logo fully visible, title visible |
| 75 | 2.5 | Scene 1 ends, Scene 2 starts |
| 105 | 3.5 | Problem fully revealed |
| 180 | 6.0 | Scene 3 starts, features begin |
| 315 | 10.5 | Scene 4 starts, badge appears |
| 390 | 13.0 | Scene 5 starts, CTA appears |
| 450 | 15.0 | Video ends |

---

## Audio Cues (If Adding Later)

Suggested audio timing:

```
0.0s  - Ambient intro sound
2.5s  - Alert/warning sound (problem)
6.0s  - Tech/digital sounds (features)
10.5s - Success/fanfare (proof)
13.0s - Uplifting/call-to-action music
```

---

**Edit this storyboard** by modifying scenes in `src/scenes/` and timings in `src/config.ts`.
