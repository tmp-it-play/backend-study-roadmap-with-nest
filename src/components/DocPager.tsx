'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { carSVG } from '@/lib/scenery';

const CAR = carSVG();

type Stop = { href: string; title: string };

/** 이전/다음 정류장 버튼 + 미니 도로. 누르면 차가 출발한 뒤 이동한다 */
export default function DocPager({ prev, next, nextLabel }: { prev?: Stop; next?: Stop; nextLabel: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'' | 'go' | 'back go'>('');
  const busy = useRef(false);

  const drive = (href: string, back: boolean) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || busy.current) return;
    e.preventDefault();
    busy.current = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMode(back ? 'back go' : 'go');
    setTimeout(() => router.push(href), reduced ? 0 : 850);
  };

  return (
    <>
      <div className={`mini-road ${mode}`} aria-hidden>
        <div className="car-runner" dangerouslySetInnerHTML={{ __html: CAR }} />
      </div>
      <nav className="pager" aria-label="이전, 다음 문서">
        {prev && (
          <Link href={prev.href} onClick={drive(prev.href, true)}>
            <small>이전 정류장</small>
            <span>← {prev.title}</span>
          </Link>
        )}
        {next && (
          <Link href={next.href} className="next" onClick={drive(next.href, false)}>
            <small>{nextLabel}</small>
            <span>{next.title} →</span>
          </Link>
        )}
      </nav>
    </>
  );
}
