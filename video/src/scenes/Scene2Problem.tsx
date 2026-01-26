import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { videoConfig } from '../config';

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const descOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const subtitleOpacity = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: videoConfig.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundImage: `linear-gradient(${videoConfig.colors.primary}22 1px, transparent 1px), linear-gradient(90deg, ${videoConfig.colors.primary}22 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div style={{ zIndex: 1, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: videoConfig.colors.primary,
            opacity: titleOpacity,
            marginBottom: 60,
            textTransform: 'uppercase',
            letterSpacing: '4px',
          }}
        >
          {videoConfig.scene2.title}
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: videoConfig.colors.text,
            opacity: descOpacity,
            marginBottom: 40,
            lineHeight: 1.2,
          }}
        >
          {videoConfig.scene2.description}
        </div>

        <div
          style={{
            fontSize: 48,
            color: videoConfig.colors.textMuted,
            opacity: subtitleOpacity,
          }}
        >
          {videoConfig.scene2.subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
