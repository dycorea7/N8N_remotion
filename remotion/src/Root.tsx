import React from 'react';
import { Composition, Still } from 'remotion';
import { Short } from './Short';
import { Thumb } from './Thumb';
import { ShortProps, ThumbProps } from './types';

const defaults: ShortProps = {
  fps: 30, durationInFrames: 150, lang: 'ko', category: 'wealth',
  scenes: [{ start: 0, end: 5, narration: '미리보기', words: [], visual: { type: 'headline', text: '미리보기 장면', highlight: ['미리보기'] } }],
  captions: [],
};
const thumbDefaults: ThumbProps = { category: 'wealth', lang: 'ko', text: '월급이 올라도 돈이 안 모이는 이유', highlight: ['돈이'], badge: '10분 정리' };
const meta = ({ props }: any) => ({ durationInFrames: props.durationInFrames || 150, fps: props.fps || 30 });

export const Root: React.FC = () => (
  <>
    {/* 쇼츠 9:16 */}
    <Composition id="Short" component={Short as any} width={1080} height={1920} fps={30} durationInFrames={150} defaultProps={defaults as any} calculateMetadata={meta} />
    {/* 롱폼 16:9 — 같은 장면 템플릿을 가로 배치로 그린다 */}
    <Composition id="Long" component={Short as any} width={1920} height={1080} fps={24} durationInFrames={150} defaultProps={{ ...defaults, fps: 24 } as any} calculateMetadata={meta} />
    {/* 롱폼 썸네일 */}
    <Still id="Thumb" component={Thumb as any} width={1280} height={720} defaultProps={thumbDefaults as any} />
  </>
);
