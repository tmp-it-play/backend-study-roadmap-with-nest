/**
 * 일러스트 요소(SVG 문자열). Next.js 컴포넌트와 Artifact 빌드가 함께 쓴다.
 * 매번 같은 그림이 나오도록 고정 시드 난수를 쓴다.
 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 도시 스카이라인: 뒷줄(옅은 색) + 앞줄(진한 색, 창문) */
export function skylineSVG(seed = 7): string {
  const r = rng(seed);
  const W = 1200;
  const H = 160;
  let back = '';
  let front = '';
  let x = -10;
  while (x < W) {
    const w = 40 + r() * 50;
    const h = 50 + r() * 70;
    back += `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="var(--city-2)"/>`;
    x += w + r() * 6;
  }
  x = -20;
  while (x < W) {
    const w = 46 + r() * 64;
    const h = 40 + r() * 105;
    const y = H - h;
    front += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="var(--city)"/>`;
    if (r() > 0.35 && h > 60) {
      // 창문
      const cols = Math.max(2, Math.floor(w / 16));
      const rows = Math.floor((h - 20) / 14);
      const cw = (w - 12) / cols;
      for (let ci = 0; ci < cols; ci++) {
        for (let ri = 0; ri < rows; ri++) {
          if (r() > 0.22) {
            front += `<rect x="${(x + 6 + ci * cw + 2).toFixed(1)}" y="${(y + 10 + ri * 14).toFixed(1)}" width="${(cw - 5).toFixed(1)}" height="6" fill="var(--window)"/>`;
          }
        }
      }
    } else if (h > 70) {
      front += `<rect x="${(x + w / 2 - 2).toFixed(1)}" y="${(y - 16).toFixed(1)}" width="4" height="16" fill="var(--city)"/>`;
    }
    x += w + 4 + r() * 20;
  }
  // 앞쪽 잔디 언덕
  const hill = `<path d="M0 ${H} Q 150 ${H - 26} 300 ${H - 10} T 600 ${H - 14} T 900 ${H - 8} T 1200 ${H - 20} V ${H} Z" fill="var(--grass)"/>`;
  return `<svg class="skyline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${back}${front}${hill}</svg>`;
}

/** 위에서 내려다본 자동차 (오른쪽을 향함) */
export function carSVG(): string {
  return `<svg class="car" viewBox="0 0 78 34" aria-hidden="true">
<rect x="7" y="0" width="10" height="5" rx="2" fill="#222"/><rect x="56" y="0" width="10" height="5" rx="2" fill="#222"/>
<rect x="7" y="29" width="10" height="5" rx="2" fill="#222"/><rect x="56" y="29" width="10" height="5" rx="2" fill="#222"/>
<rect x="1" y="3" width="76" height="28" rx="9" fill="var(--car)"/>
<rect x="1" y="3" width="76" height="28" rx="9" fill="none" stroke="#a8530d" stroke-width="1.5"/>
<path d="M50 6 h9 q6 0 6 6 v10 q0 6 -6 6 h-9 q3 -11 0 -22z" fill="#1d1d1d"/>
<path d="M18 7 h6 q-3 10 0 20 h-6 q-4 -10 0 -20z" fill="#1d1d1d"/>
<rect x="27" y="9" width="21" height="16" rx="4" fill="#f0a058"/>
<circle cx="37.5" cy="17" r="4.5" fill="#fff" opacity=".85"/><circle cx="37.5" cy="17" r="2" fill="var(--car)"/>
<rect x="73" y="7" width="4" height="5" rx="1" fill="#fff6c2"/><rect x="73" y="22" width="4" height="5" rx="1" fill="#fff6c2"/>
</svg>`;
}

/** 페이지 맨 아래 언덕과 나무 */
export function groundSVG(): string {
  const tree = (x: number, s: number) =>
    `<g transform="translate(${x} ${92 - 40 * s}) scale(${s})"><rect x="-4" y="22" width="8" height="22" fill="#6b4a2b"/><circle cx="0" cy="12" r="18" fill="var(--grass-deep)"/><circle cx="-12" cy="22" r="12" fill="var(--grass-deep)"/><circle cx="12" cy="22" r="12" fill="var(--grass-deep)"/></g>`;
  return `<svg class="ground" viewBox="0 0 1200 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<path d="M0 60 Q 200 30 420 52 T 820 46 T 1200 40 V100 H0Z" fill="var(--grass-deep)" opacity=".55"/>
<path d="M0 78 Q 260 58 520 74 T 1000 70 T 1200 66 V100 H0Z" fill="var(--grass-deep)"/>
${tree(80, 1)}${tree(130, 0.7)}${tree(1080, 1.1)}${tree(1140, 0.75)}${tree(560, 0.6)}
</svg>`;
}
