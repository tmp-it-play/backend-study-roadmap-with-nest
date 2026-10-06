'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'learned-docs';
const EVENT = 'learned-change';

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** 학습 완료한 문서 목록 (브라우저 localStorage에 저장) */
export function useLearned() {
  const [learned, setLearned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLearned(read());
      setReady(true);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((href: string) => {
    const cur = read();
    const next = cur.includes(href) ? cur.filter((h) => h !== href) : [...cur, href];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { learned, toggle, ready };
}
