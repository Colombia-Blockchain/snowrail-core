/**
 * SnowRail Video Configuration
 * Edit this file to customize video content
 */

export const videoConfig = {
  // Video settings
  fps: 30,
  width: 1080,
  height: 1920,
  durationInSeconds: 15,

  // Brand colors
  colors: {
    primary: '#E84142', // Avalanche red
    secondary: '#FFFFFF',
    background: '#0A0A0F',
    accent: '#4F46E5', // Indigo
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
  },

  // Scene 1: Hook (0.0 - 2.5s)
  scene1: {
    logo: '❄️',
    title: 'SnowRail',
    tagline: 'Trust-before-pay for AI agents',
    duration: 2.5,
  },

  // Scene 2: Problem (2.5 - 6.0s)
  scene2: {
    title: 'The Problem',
    description: 'AI agents pay fraudulent endpoints',
    subtitle: 'No trust validation before payment',
    duration: 3.5,
  },

  // Scene 3: Solution (6.0 - 10.5s)
  scene3: {
    title: 'How it works',
    features: [
      {
        icon: '🛡️',
        text: 'SENTINEL validates trust scores',
      },
      {
        icon: '⚡',
        text: 'x402 protocol integration',
      },
      {
        icon: '🏔️',
        text: 'Built on Avalanche',
      },
    ],
    duration: 4.5,
  },

  // Scene 4: Proof (10.5 - 13.0s)
  scene4: {
    badge: '🏆',
    title: '1st Place',
    subtitle: 'Avalanche Hack2Build',
    category: 'Payments x402',
    duration: 2.5,
  },

  // Scene 5: CTA (13.0 - 15.0s)
  scene5: {
    cta: 'Try the demo',
    url: 'github.com/Colombia-Blockchain/snowrail-core',
    logo: '❄️',
    duration: 2.0,
  },
};

export type VideoConfig = typeof videoConfig;
