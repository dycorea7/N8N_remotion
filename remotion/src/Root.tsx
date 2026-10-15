import React from 'react';
import { Composition } from 'remotion';
import { Short } from './Short';
import { ShortProps } from './types';

const defaults: ShortProps = {
  fps: 30, durationInFrames: 150, lang: 'ko', category: 'wealth',
  scenes: [{ start: 0, end: 5, narration: '미리보기', words: [], visual: { type: 'headline', text: '미리보기 장면', highlight: ['미리보기'] } }],
  captions: [],
};

export const Root: React.FC = () => (
  <Composition
    id="Short"
    component={Short as any}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    defaultProps={defaults as any}
    calculateMetadata={({ props }: any) => ({ durationInFrames: props.durationInFrames || 150, fps: props.fps || 30 })}
  />
);
