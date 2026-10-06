'use client';

import { useLearned } from '@/lib/progress';
import DoneDot from './DoneDot';

export default function DocFinish({ href }: { href: string }) {
  const { learned, toggle } = useLearned();
  const done = learned.includes(href);
  return (
    <div className="finish">
      <p>{done ? '완료한 문서입니다.' : '셀프 체크까지 답해봤다면 완료로 표시하세요.'}</p>
      <button type="button" className={`learn-btn ${done ? 'on' : ''}`} onClick={() => toggle(href)}>
        <DoneDot href={href} />
        {done ? '학습 완료' : '완료로 표시'}
      </button>
    </div>
  );
}
