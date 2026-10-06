'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Stage } from '@/lib/content';
import { useLearned } from '@/lib/progress';
import { carSVG, groundSVG, skylineSVG } from '@/lib/scenery';
import { CheckIcon } from './Icons';
// 순수 JS 모듈 (Artifact 빌드와 공유)
import { mountRoadCar, saveCarStage } from '@/lib/road-car.js';

const SKYLINE = skylineSVG();
const CAR = carSVG();
const GROUND = groundSVG();

/** 단계 신호등: 빨강 = 시작 전, 노랑 = 진행 중, 초록 = 완료 */
function TrafficLight({ done, total }: { done: number; total: number }) {
  const state = total > 0 && done === total ? 'green' : done > 0 ? 'yellow' : 'red';
  const label = { red: '시작 전', yellow: `진행 중 (${done}/${total})`, green: '완료' }[state];
  return (
    <span className={`tlight ${state}`} role="img" aria-label={`신호: ${label}`} title={label}>
      <i className="l-red" />
      <i className="l-yellow" />
      <i className="l-green" />
    </span>
  );
}

export default function RoadmapHome({ stages }: { stages: Stage[] }) {
  const { learned, ready } = useLearned();
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const learnedRef = useRef<string[]>([]);
  learnedRef.current = learned;
  const carRef = useRef<{ driveTo: (i: number, done?: () => void) => void; destroy: () => void } | null>(null);
  const path = stages.flatMap((stage, si) => stage.docs.map((doc, i) => ({ doc, stage, si, i, n: stage.docs.length })));
  const isDone = (href: string) => learned.includes(href);
  const done = path.filter((p) => isDone(p.doc.href)).length;
  const pct = path.length ? Math.round((done / path.length) * 100) : 0;
  const next = path.find((p) => !isDone(p.doc.href));
  const last = path[path.length - 1];
  const carStage = next ? next.si : stages.length - 1;

  // 자동차: 스크롤을 따라 도로를 달리고, 다음 학습 단계에는 깃발을 꽂는다
  useEffect(() => {
    if (!ready || !trackRef.current) return;
    const car = mountRoadCar(trackRef.current, CAR, {
      target: carStage,
      stageTitles: stages.map((s) => s.title),
      // 차를 끌어다 놓은 단계에서 아직 안 끝낸 첫 문서(없으면 첫 문서)를 연다
      onPick: (i: number) => {
        const docs = stages[i]?.docs ?? [];
        const doc = docs.find((d) => !learnedRef.current.includes(d.href)) ?? docs[0];
        if (!doc) return;
        saveCarStage(i);
        router.push(doc.href);
      },
    });
    carRef.current = car;
    return () => car.destroy();
  }, [ready, carStage]);

  // 링크를 누르면 차가 그 단계까지 운전해 간 뒤 이동
  const driveThen = (stageIndex: number, href: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !carRef.current) return;
    e.preventDefault();
    carRef.current.driveTo(stageIndex, () => {
      saveCarStage(stageIndex);
      router.push(href);
    });
  };

  return (
    <div className="home">
      <section className="hero">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="sun" />
        <h1 className="hero-title">백엔드 개발자 학습</h1>
        <div className="board">
          <span>로드맵</span>
        </div>
        <p className="hero-lead">
          JavaScript 기초에서 출발해 TypeScript와 NestJS를 지나 면접장까지 가는 길입니다. 표지판마다 들러서 비유로 감을
          잡고, 코드로 확인하고, 셀프 체크로 마무리하세요.
        </p>
        <div dangerouslySetInnerHTML={{ __html: SKYLINE }} />
      </section>

      <div className="dash">
        <div className="dash-inner">
          {next ? (
            <>
              <div>
                <p className="label">다음 목적지</p>
                <p className="next-title">{next.doc.title}</p>
                <p className="next-meta">
                  {next.si + 1}단계 {next.stage.title} · {next.i + 1}/{next.n} · 약 {next.doc.minutes}분
                </p>
              </div>
              <Link className="go-btn" href={next.doc.href} onClick={driveThen(next.si, next.doc.href)}>
                출발하기
              </Link>
            </>
          ) : (
            <>
              <div>
                <p className="label">완주</p>
                <p className="next-title">모든 구간을 달렸습니다</p>
                <p className="next-meta">면접 질문으로 마지막 점검을 해 보세요.</p>
              </div>
              {last && (
                <Link className="go-btn" href={last.doc.href}>
                  면접 질문
                </Link>
              )}
            </>
          )}
          <p className="light-legend">
            <span><i className="l-red" />시작 전</span>
            <span><i className="l-yellow" />진행 중</span>
            <span><i className="l-green" />완료</span>
          </p>
          <div className="overall">
            <span>
              주행 {done}/{path.length}
            </span>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        </div>
      </div>

      <div className="track" ref={trackRef}>
        {stages.map((s, si) => {
          const dn = s.docs.filter((d) => isDone(d.href)).length;
          const mins = s.docs.reduce((m, d) => m + d.minutes, 0);
          return (
            <section key={s.id} id={`stage-${s.id}`} className={`lap ${si % 2 === 0 ? 'r' : 'l'}`}>
              <div className="lap-body">
                <div className="lap-head">
                  <div className="sign-row">
                    <div className="sign">
                      <small>
                        {si + 1}단계 · {s.level}
                      </small>
                      <strong>{s.title}</strong>
                    </div>
                    <TrafficLight done={dn} total={s.docs.length} />
                  </div>
                  <p className="goal">
                    <b>이 구간의 목표</b>
                    {s.goal}
                  </p>
                  <p className="lap-meta">
                    문서 {s.docs.length}개 · 약 {mins}분 · {dn}/{s.docs.length} 완료
                  </p>
                </div>
                <ul className="stops">
                  {s.docs.map((d, di) => {
                    const on = isDone(d.href);
                    return (
                      <li key={d.href}>
                        <Link href={d.href} onClick={driveThen(si, d.href)}>
                          <span className={`badge ${on ? 'on' : ''}`}>{on ? <CheckIcon size={16} /> : di + 1}</span>
                          <span className="stop-text">
                            <strong>
                              {d.title}
                              {next?.doc.href === d.href && <span className="here">다음</span>}
                            </strong>
                            <span>{d.description}</span>
                          </span>
                          <span className="stop-min">{d.minutes}분</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <div className="finish-line">
        <div className="sign">
          <small>도착</small>
          <strong>면접장</strong>
        </div>
        <p>{next ? `완주까지 문서 ${path.length - done}개 남았습니다` : '완주했습니다. 수고했어요!'}</p>
      </div>
      <div dangerouslySetInnerHTML={{ __html: GROUND }} />
    </div>
  );
}
