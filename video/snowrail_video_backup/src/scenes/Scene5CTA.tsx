import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { videoConfig } from '../config';

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const urlOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const logoScale = spring({
    frame: frame - 25,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
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
      {/* Content */}
      <div style={{ textAlign: 'center' }}>
        {/* CTA */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 'bold',
            color: videoConfig.colors.text,
            opacity: ctaOpacity,
            marginBottom: 60,
          }}
        >
          {videoConfig.scene5.cta}
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 52,
            color: videoConfig.colors.primary,
            opacity: urlOpacity,
            marginBottom: 100,
            fontFamily: 'monospace',
          }}
        >
          {videoConfig.scene5.url}
        </div>

        {/* Logo */}
        <div
          style={{
            fontSize: 160,
            transform: `scale(${logoScale})`,
          }}
        >
          {videoConfig.scene5.logo}
        </div>
      </div>
    </AbsoluteFill>
  );
};
