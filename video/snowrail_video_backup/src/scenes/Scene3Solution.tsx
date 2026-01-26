import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { videoConfig } from '../config';

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const featureDelays = [20, 50, 80]; // Stagger animation for each feature

  return (
    <AbsoluteFill
      style={{
        backgroundColor: videoConfig.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          fontSize: 72,
          fontWeight: 'bold',
          color: videoConfig.colors.text,
          opacity: titleOpacity,
          textTransform: 'uppercase',
          letterSpacing: '3px',
        }}
      >
        {videoConfig.scene3.title}
      </div>

      {/* Features */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 60,
          marginTop: 100,
        }}
      >
        {videoConfig.scene3.features.map((feature, index) => {
          const featureOpacity = spring({
            frame: frame - featureDelays[index],
            fps,
            config: { damping: 200 },
          });

          const featureSlide = interpolate(
            frame - featureDelays[index],
            [0, 20],
            [100, 0],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 40,
                opacity: featureOpacity,
                transform: `translateX(${featureSlide}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 100,
                  width: 140,
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: videoConfig.colors.primary + '33',
                  borderRadius: 20,
                }}
              >
                {feature.icon}
              </div>
              <div
                style={{
                  fontSize: 52,
                  color: videoConfig.colors.text,
                  fontWeight: '600',
                  maxWidth: 700,
                }}
              >
                {feature.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
