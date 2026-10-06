'use client';

import { useEffect, useRef } from 'react';
import { useLearned } from '@/lib/progress';
// 순수 JS 모듈 (Artifact 빌드와 공유)
import { mountDocTools } from '@/lib/doc-tools.js';

/** 문서 상단 학습 도구 바, 이어 읽기, 완료 제안, ← → 이동, 맨 위로 */
export default function DocTools({ href }: { href: string }) {
  const { learned, toggle } = useLearned();
  const doneRef = useRef(false);
  doneRef.current = learned.includes(href);
  const tools = useRef<{ refresh: () => void; destroy: () => void } | null>(null);

  useEffect(() => {
    const article = document.querySelector('.article');
    if (!article) return;
    tools.current = mountDocTools({
      article,
      key: href,
      isDone: () => doneRef.current,
      toggleDone: () => toggle(href),
      skipResume: !!location.hash,
    });
    return () => tools.current?.destroy();
  }, [href, toggle]);

  useEffect(() => {
    tools.current?.refresh();
  }, [learned]);

  return null;
}
