'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/content';

/** 오른쪽 목차 + 지금 읽는 섹션 표시 */
export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el);
    const onScroll = () => {
      let current = els[0]?.id ?? '';
      for (const el of els) {
        if (el.getBoundingClientRect().top < 130) current = el.id;
        else break;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (!headings.length) return null;

  return (
    <aside className="toc">
      <div className="toc-inner">
        <p className="toc-title">이 문서의 목차</p>
        <ul>
          {headings.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`} className={`d${h.depth} ${activeId === h.id ? 'active' : ''}`}>
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
