import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { videoConfig } from '../config';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const titleOpacity = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 200,
    },
  });

  const taglineOpacity = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 200,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: videoConfig.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 200,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        {videoConfig.scene1.logo}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 120,
          fontWeight: 'bold',
          color: videoConfig.colors.secondary,
          opacity: titleOpacity,
          marginBottom: 20,
        }}
      >
        {videoConfig.scene1.title}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 48,
          color: videoConfig.colors.textMuted,
          opacity: taglineOpacity,
          textAlign: 'center',
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        {videoConfig.scene1.tagline}
      </div>
    </AbsoluteFill>
  );
};
