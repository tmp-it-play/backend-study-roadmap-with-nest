'use client';

import { useEffect } from 'react';
// 순수 JS 모듈 (Artifact 빌드와 공유)
import { mountSims } from '@/lib/sims.js';

/** 본문의 <div class="sim"> 자리에 인터랙티브 시뮬레이터를 그린다 */
export default function SimMount() {
  useEffect(() => {
    const root = document.querySelector('.prose');
    if (root) mountSims(root);
  }, []);
  return null;
}
