import React from 'react';
import { Composition } from 'remotion';
import { videoConfig } from './config';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3Solution } from './scenes/Scene3Solution';
import { Scene4Proof } from './scenes/Scene4Proof';
import { Scene5CTA } from './scenes/Scene5CTA';
import { Sequence } from 'remotion';

const SnowRailVideo: React.FC = () => {
  const fps = videoConfig.fps;

  // Convert seconds to frames
  const scene1Frames = Math.floor(videoConfig.scene1.duration * fps);
  const scene2Frames = Math.floor(videoConfig.scene2.duration * fps);
  const scene3Frames = Math.floor(videoConfig.scene3.duration * fps);
  const scene4Frames = Math.floor(videoConfig.scene4.duration * fps);
  const scene5Frames = Math.floor(videoConfig.scene5.duration * fps);

  return (
    <>
      <Sequence from={0} durationInFrames={scene1Frames}>
        <Scene1Hook />
      </Sequence>

      <Sequence from={scene1Frames} durationInFrames={scene2Frames}>
        <Scene2Problem />
      </Sequence>

      <Sequence
        from={scene1Frames + scene2Frames}
        durationInFrames={scene3Frames}
      >
        <Scene3Solution />
      </Sequence>

      <Sequence
        from={scene1Frames + scene2Frames + scene3Frames}
        durationInFrames={scene4Frames}
      >
        <Scene4Proof />
      </Sequence>

      <Sequence
        from={scene1Frames + scene2Frames + scene3Frames + scene4Frames}
        durationInFrames={scene5Frames}
      >
        <Scene5CTA />
      </Sequence>
    </>
  );
};

export const RemotionVideo = () => {
  const totalFrames = Math.floor(videoConfig.durationInSeconds * videoConfig.fps);

  return (
    <Composition
      id="SnowRailPromo"
      component={SnowRailVideo}
      durationInFrames={totalFrames}
      fps={videoConfig.fps}
      width={videoConfig.width}
      height={videoConfig.height}
      defaultProps={{}}
    />
  );
};
