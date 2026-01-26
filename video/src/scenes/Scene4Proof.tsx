import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { videoConfig } from '../config';

export const Scene4Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({
    frame,
    fps,
    config: {
      damping: 80,
      stiffness: 200,
    },
  });

  const titleOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const detailsOpacity = spring({
    frame: frame - 25,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: videoConfig.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Radial gradient background */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle at center, ${videoConfig.colors.primary}22, transparent 70%)`,
        }}
      />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Badge */}
        <div
          style={{
            fontSize: 240,
            transform: `scale(${badgeScale})`,
            marginBottom: 40,
          }}
        >
          {videoConfig.scene4.badge}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 'bold',
            color: videoConfig.colors.primary,
            opacity: titleOpacity,
            marginBottom: 20,
          }}
        >
          {videoConfig.scene4.title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 64,
            color: videoConfig.colors.text,
            opacity: detailsOpacity,
            marginBottom: 10,
          }}
        >
          {videoConfig.scene4.subtitle}
        </div>

        {/* Category */}
        <div
          style={{
            fontSize: 48,
            color: videoConfig.colors.textMuted,
            opacity: detailsOpacity,
          }}
        >
          {videoConfig.scene4.category}
        </div>
      </div>
    </AbsoluteFill>
  );
};
