'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Stage } from '@/lib/content';
import { useLearned } from '@/lib/progress';
import DoneDot from './DoneDot';

export default function Sidebar({ stages }: { stages: Stage[] }) {
  const pathname = usePathname();
  const { learned } = useLearned();
  const [open, setOpen] = useState(false);
  const all = stages.flatMap((s) => s.docs.map((d) => d.href));
  const done = all.filter((h) => learned.includes(h)).length;

  // 단계 접기: 지금 보는 문서의 단계(홈이면 다음에 공부할 단계)만 펼친다
  const currentStage =
    stages.find((s) => s.docs.some((d) => d.href === pathname))?.id ??
    stages.find((s) => s.docs.some((d) => !learned.includes(d.href)))?.id;
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (currentStage) setOpenIds((prev) => new Set(prev).add(currentStage));
  }, [currentStage]);
  const toggleStage = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    window.addEventListener('toggle-sidebar', onToggle);
    return () => window.removeEventListener('toggle-sidebar', onToggle);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
  }, [open]);

  return (
    <>
      <div className="scrim" onClick={() => setOpen(false)} aria-hidden />
      <aside className="side" aria-label="학습 단계">
        <Link href="/" className="side-home" aria-current={pathname === '/' ? 'page' : undefined}>
          <span>로드맵 전체 보기</span>
          <small>
            {done}/{all.length}
          </small>
        </Link>
        {stages.map((s, i) => {
          const open = openIds.has(s.id);
          const dn = s.docs.filter((d) => learned.includes(d.href)).length;
          return (
            <div className="stage-group" key={s.id}>
              <button type="button" className="stage-toggle" aria-expanded={open} onClick={() => toggleStage(s.id)}>
                <span className="n">{i + 1}</span>
                <span className="t">{s.title}</span>
                <span className={`c ${dn === s.docs.length ? 'all' : ''}`}>
                  {dn}/{s.docs.length}
                </span>
              </button>
              {open && (
                <ul>
                  {s.docs.map((d) => (
                    <li key={d.href}>
                      <Link href={d.href} aria-current={pathname === d.href ? 'page' : undefined}>
                        <DoneDot href={d.href} />
                        <span>{d.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </aside>
    </>
  );
}
