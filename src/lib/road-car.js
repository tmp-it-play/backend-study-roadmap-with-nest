/**
 * 지그재그 도로(.track > .lap) 위를 달리는 자동차.
 * 각 .lap의 실제 크기로 도로 중앙선 경로를 계산하고, CSS offset-path로 차를 그 경로 위에 올린다.
 *
 *  - 스크롤하면 차가 화면 기준선(위에서 45%)을 따라 도로 위를 달린다.
 *  - 끌어서(마우스·터치) 다른 단계로 옮길 수 있고, 가장자리로 끌면 페이지가 자동 스크롤된다.
 *  - 키보드 ↑↓ 로 단계 이동, Enter로 그 단계 열기. 차 위 표지를 눌러도 그 단계가 열린다.
 *  - "다음 학습" 깃발은 실제로 공부할 차례인 단계에 꽂혀 있다.
 * Next.js(RoadmapHome)와 Artifact 빌드가 같은 파일을 쓴다. (순수 JS, DOM만 사용)
 *
 * options: { target: 다음 학습 단계, stageTitles: string[], onPick(stageIndex) }
 */
export function mountRoadCar(track, carMarkup, options) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const laps = Array.from(track.querySelectorAll(':scope > .lap'));
  if (!laps.length) return { driveTo: (_i, done) => done && done(), destroy() {} };
  const titles = options.stageTitles || [];

  const runner = document.createElement('div');
  runner.className = 'car-runner draggable';
  runner.innerHTML = carMarkup;
  runner.tabIndex = 0;
  runner.setAttribute('role', 'slider');
  runner.setAttribute('aria-label', '자동차. 스크롤하면 따라오고, 끌거나 위아래 화살표로 단계를 옮기고 Enter로 그 단계를 엽니다');
  runner.setAttribute('aria-valuemin', '1');
  runner.setAttribute('aria-valuemax', String(laps.length));
  runner.title = '끌어서 다른 단계로 옮기기';

  const tag = document.createElement('button');
  tag.type = 'button';
  tag.className = 'car-tag action';

  const flag = document.createElement('span');
  flag.className = 'here-flag';
  flag.innerHTML = '<i></i><b>다음 학습</b>';

  track.appendChild(flag);
  track.appendChild(runner);
  track.appendChild(tag);

  const svgNS = 'http://www.w3.org/2000/svg';
  const measure = document.createElementNS(svgNS, 'svg');
  measure.setAttribute('width', '0');
  measure.setAttribute('height', '0');
  measure.style.position = 'absolute';
  const pathEl = document.createElementNS(svgNS, 'path');
  measure.appendChild(pathEl);
  track.appendChild(measure);

  let stops = []; // 단계별 정차 지점까지의 경로 길이(px)
  let samples = []; // [경로 길이, x, y, v] (v = 스크롤 대응용 누적 좌표)
  let current = 0; // 차가 가까이 있는 단계
  let pos = 0; // 차의 현재 경로 위치(px)
  let anim = null;
  let hold = false; // 프로그램이 스크롤 중일 때는 스크롤 따라가기를 잠시 멈춘다

  function build() {
    const cs = getComputedStyle(laps[0]);
    const rw = parseFloat(cs.borderTopWidth);
    const rr = parseFloat(laps[0].classList.contains('r') ? cs.borderTopRightRadius : cs.borderTopLeftRadius);
    const R = Math.max(rr - rw / 2, 1);
    const box = (el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    const half = rw / 2;
    let d = '';
    const stopPoints = [];
    laps.forEach((lap, i) => {
      const b = box(lap);
      const top = b.y + half;
      const bottom = b.y + b.h - half;
      const right = lap.classList.contains('r');
      stopPoints.push({ x: b.x + b.w * 0.5, y: top });
      if (i === 0) d += `M ${right ? b.x : b.x + b.w} ${top}`;
      if (right) {
        const ex = b.x + b.w - half;
        d += ` H ${ex - R} A ${R} ${R} 0 0 1 ${ex} ${top + R} V ${bottom - R} A ${R} ${R} 0 0 1 ${ex - R} ${bottom}`;
        if (i === laps.length - 1) d += ` H ${b.x}`;
      } else {
        const ex = b.x + half;
        d += ` H ${ex + R} A ${R} ${R} 0 0 0 ${ex} ${top + R} V ${bottom - R} A ${R} ${R} 0 0 0 ${ex + R} ${bottom}`;
        if (i === laps.length - 1) d += ` H ${b.x + b.w}`;
      }
    });
    pathEl.setAttribute('d', d);
    runner.style.offsetPath = `path('${d}')`;

    // 경로를 샘플링한다. v는 "세로 이동 + 가로 이동의 일부"를 누적한 값으로,
    // 도로가 옆으로 가는 구간에서도 스크롤에 맞춰 차가 조금씩 나아가게 해 준다.
    const total = pathEl.getTotalLength();
    samples = [];
    let prev = null;
    let v = 0;
    for (let len = 0; len <= total; len += 5) {
      const q = pathEl.getPointAtLength(len);
      if (prev) v += Math.max(0, q.y - prev.y) + Math.abs(q.x - prev.x) * 0.35;
      samples.push([len, q.x, q.y, v]);
      prev = q;
    }
    stops = stopPoints.map((p) => nearestLen(p.x, p.y));
    placeFlag();
  }

  function nearestLen(x, y) {
    let best = 0;
    let bestDist = Infinity;
    for (const [len, sx, sy] of samples) {
      const dd = (sx - x) ** 2 + (sy - y) ** 2;
      if (dd < bestDist) {
        bestDist = dd;
        best = len;
      }
    }
    return best;
  }

  const nearestStop = (len) =>
    stops.reduce((best, s, i) => (Math.abs(s - len) < Math.abs(stops[best] - len) ? i : best), 0);

  // 화면 기준선(위에서 45%)이 트랙의 어디쯤인지 → 경로 길이로 바꾼다
  function lenForScroll() {
    if (samples.length < 2) return 0;
    const line = innerHeight * 0.45 - track.getBoundingClientRect().top;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const t = Math.max(0, Math.min(1, (line - first[2]) / (last[2] - first[2] || 1)));
    const vTarget = t * last[3];
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid][3] < vTarget) lo = mid + 1;
      else hi = mid;
    }
    return samples[lo][0];
  }

  function setPos(len) {
    pos = len;
    runner.style.offsetDistance = `${len}px`;
  }

  let tagStage = -1;
  function placeTag(len, html) {
    const p = pathEl.getPointAtLength(len);
    tag.style.left = `${p.x}px`;
    tag.style.top = `${p.y}px`;
    if (html !== undefined) tag.innerHTML = html;
    tag.hidden = false;
  }
  // 차 위 표지: 지금 지나는 단계 이름 (누르면 그 단계 열기)
  function stageTag(len) {
    const i = nearestStop(len);
    current = i;
    runner.setAttribute('aria-valuenow', String(i + 1));
    runner.setAttribute('aria-valuetext', `${i + 1}단계 ${titles[i] || ''}`);
    placeTag(len, i === tagStage ? undefined : `<small>${i + 1}단계</small>${titles[i] || ''} →`);
    tagStage = i;
  }

  function placeFlag() {
    const i = Math.max(0, Math.min(options.target ?? 0, stops.length - 1));
    const p = pathEl.getPointAtLength(stops[i]);
    flag.style.left = `${p.x}px`;
    flag.style.top = `${p.y}px`;
  }

  /* ── 스크롤 따라가기 ── */
  let lerpRaf = 0;
  function followScroll() {
    cancelAnimationFrame(lerpRaf);
    const step = () => {
      if (drag || anim || hold) return;
      const target = lenForScroll();
      const diff = target - pos;
      if (Math.abs(diff) < 0.5) {
        setPos(target);
        stageTag(target);
        return;
      }
      // 진행 방향으로 머리를 돌리고, 목표 지점으로 부드럽게 다가간다
      runner.style.offsetRotate = diff < 0 ? 'auto 180deg' : 'auto';
      setPos(reduced ? target : pos + diff * 0.2);
      stageTag(pos);
      lerpRaf = requestAnimationFrame(step);
    };
    lerpRaf = requestAnimationFrame(step);
  }
  const onScroll = () => followScroll();
  // 사용자가 직접 스크롤하기 시작하면 다시 따라간다
  const release = () => {
    if (hold) {
      hold = false;
      followScroll();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  ['wheel', 'touchmove', 'keydown'].forEach((ev) => window.addEventListener(ev, release, { passive: true }));

  /* ── 화면이 차를 따라가기 (운전 애니메이션 중) ── */
  const headH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head')) || 58;
  let followRaf = 0;
  function startFollow() {
    cancelAnimationFrame(followRaf);
    const tick = () => {
      const r = runner.getBoundingClientRect();
      const carY = r.top + r.height / 2;
      const top = headH() + innerHeight * 0.2;
      const bottom = innerHeight * 0.75;
      if (carY > bottom) window.scrollBy(0, (carY - bottom) * 0.18);
      else if (carY < top) window.scrollBy(0, (carY - top) * 0.18);
      followRaf = requestAnimationFrame(tick);
    };
    followRaf = requestAnimationFrame(tick);
  }
  const stopFollow = () => cancelAnimationFrame(followRaf);

  function driveTo(i, done, follow = true) {
    i = Math.max(0, Math.min(i, stops.length - 1));
    const from = pos;
    const to = stops[i];
    hold = true; // 운전이 끝나도 사용자가 스크롤하기 전까지 그 자리에 서 있는다
    cancelAnimationFrame(lerpRaf);
    if (reduced || Math.abs(to - from) < 2) {
      setPos(to);
      stageTag(to);
      if (follow) runner.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      if (done) done();
      return;
    }
    if (anim) anim.cancel();
    tag.hidden = true;
    if (follow) startFollow();
    const duration = Math.min(2600, Math.max(500, Math.abs(to - from) * 0.9));
    runner.style.offsetRotate = to < from ? 'auto 180deg' : 'auto';
    anim = runner.animate([{ offsetDistance: `${from}px` }, { offsetDistance: `${to}px` }], {
      duration,
      easing: 'cubic-bezier(.45,.05,.35,1)',
      fill: 'forwards',
    });
    const car = runner.querySelector('.car');
    car && car.classList.add('driving');
    anim.onfinish = () => {
      stopFollow();
      car && car.classList.remove('driving');
      runner.style.offsetRotate = 'auto';
      if (anim) anim.cancel();
      anim = null;
      setPos(to);
      tagStage = -1;
      stageTag(to);
      if (done) done();
    };
  }

  /* ── 드래그 ── */
  let drag = null; // { id, startX, startY, moved, lastLen, cx, cy }
  let edgeRaf = 0;
  function moveCarTo(clientX, clientY) {
    const r = track.getBoundingClientRect();
    const len = nearestLen(clientX - r.left, clientY - r.top);
    runner.style.offsetRotate = len < drag.lastLen - 1 ? 'auto 180deg' : len > drag.lastLen + 1 ? 'auto' : runner.style.offsetRotate;
    drag.lastLen = len;
    setPos(len);
    const i = nearestStop(len);
    tagStage = -1;
    placeTag(len, `놓으면: ${i + 1}단계 ${titles[i] || ''}`);
  }
  // 화면 위·아래 가장자리 근처로 끌면 페이지를 자동 스크롤 (가까울수록 빠르게)
  function edgeScroll() {
    cancelAnimationFrame(edgeRaf);
    if (!drag || !drag.moved) return;
    const zone = 90;
    const top = headH() + zone;
    const bottom = innerHeight - zone;
    let v = 0;
    if (drag.cy > bottom) v = Math.min(1, (drag.cy - bottom) / zone) * 22;
    else if (drag.cy < top) v = -Math.min(1, (top - drag.cy) / zone) * 22;
    if (v !== 0) {
      window.scrollBy(0, v);
      moveCarTo(drag.cx, drag.cy);
    }
    edgeRaf = requestAnimationFrame(edgeScroll);
  }

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (anim) {
      anim.cancel();
      anim = null;
    }
    stopFollow();
    cancelAnimationFrame(lerpRaf);
    e.preventDefault();
    try { runner.setPointerCapture(e.pointerId); } catch {}
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, lastLen: pos, cx: e.clientX, cy: e.clientY };
    runner.classList.add('dragging');
  };
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    const first = !drag.moved;
    drag.moved = true;
    drag.cx = e.clientX;
    drag.cy = e.clientY;
    moveCarTo(e.clientX, e.clientY);
    if (first) edgeScroll();
  };
  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    cancelAnimationFrame(edgeRaf);
    runner.classList.remove('dragging');
    if (!moved) return followScroll();
    driveTo(nearestStop(pos));
  };
  runner.addEventListener('pointerdown', onDown);
  runner.addEventListener('pointermove', onMove);
  runner.addEventListener('pointerup', onUp);
  runner.addEventListener('pointercancel', onUp);

  // 키보드: ↑↓(←→)로 단계 이동, Enter로 그 단계 열기
  runner.addEventListener('keydown', (e) => {
    const delta = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (delta) {
      e.preventDefault();
      e.stopPropagation();
      driveTo(current + delta);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      options.onPick?.(current);
    }
  });
  tag.addEventListener('click', () => options.onPick?.(current));

  build();
  setPos(lenForScroll());
  stageTag(pos);

  let raf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (anim || drag) return;
      build();
      if (hold) {
        setPos(stops[current]);
        stageTag(pos);
      } else {
        setPos(lenForScroll());
        stageTag(pos);
      }
    });
  });
  ro.observe(track);

  return {
    driveTo(i, done) {
      driveTo(i, done);
    },
    destroy() {
      ro.disconnect();
      stopFollow();
      cancelAnimationFrame(edgeRaf);
      cancelAnimationFrame(lerpRaf);
      window.removeEventListener('scroll', onScroll);
      ['wheel', 'touchmove', 'keydown'].forEach((ev) => window.removeEventListener(ev, release));
      if (anim) anim.cancel();
      runner.remove();
      tag.remove();
      flag.remove();
      measure.remove();
    },
  };
}

/** 마지막으로 차를 세워 둔 단계 */
export function readCarStage(fallback) {
  try {
    const v = localStorage.getItem('car-stage');
    return v === null ? fallback : Number(v);
  } catch {
    return fallback;
  }
}

export function saveCarStage(i) {
  try {
    localStorage.setItem('car-stage', String(i));
  } catch {}
}
