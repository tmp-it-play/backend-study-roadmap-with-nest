/**
 * 문서 페이지 학습 도구 (Next.js DocTools 컴포넌트와 Artifact가 함께 쓰는 순수 JS)
 *  - 상단 도구 바: 목차 펼치기 / 글자 크기 / 읽은 비율 / 답 모두 펼치기 / 완료 체크
 *  - 이어 읽기 제안, 끝까지 읽으면 완료 제안, ← → 키로 이전·다음 문서, 맨 위로 버튼
 *
 * options: { article, key, isDone(): boolean, toggleDone(): void, skipResume?: boolean }
 * 반환: { refresh(), destroy() }  — 완료 상태가 바뀌면 refresh()를 부른다
 */
const SCALE_KEY = 'prose-scale';
const SCALES = [0.9, 1, 1.1, 1.2];

const store = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

export function applyProseScale() {
  document.documentElement.style.setProperty('--prose-scale', String(store.get(SCALE_KEY, 1)));
}

export function mountDocTools({ article, key, isDone, toggleDone, skipResume = false }) {
  const prose = article.querySelector('.prose');
  const cleanups = [];
  const on = (target, ev, fn, opt) => {
    target.addEventListener(ev, fn, opt);
    cleanups.push(() => target.removeEventListener(ev, fn, opt));
  };
  applyProseScale();

  /* ── 도구 바 ── */
  const headings = [...prose.querySelectorAll('h2[id], h3[id]')];
  const answers = [...prose.querySelectorAll('details.quiz-answer')];
  const bar = document.createElement('div');
  bar.className = 'doc-tools';
  bar.innerHTML = `
    <div class="dt-group">
      <button type="button" class="dt-btn" data-t="toc" aria-expanded="false">목차</button>
      ${answers.length ? `<button type="button" class="dt-btn" data-t="answers">답 모두 펼치기</button>` : ''}
    </div>
    <div class="dt-group">
      <span class="dt-read" aria-label="읽은 비율"><span class="trk"><i></i></span><b>0%</b></span>
      <span class="dt-size" role="group" aria-label="글자 크기">
        <button type="button" class="dt-btn" data-t="smaller" aria-label="글자 작게">가-</button>
        <button type="button" class="dt-btn" data-t="bigger" aria-label="글자 크게">가+</button>
      </span>
      <button type="button" class="dt-btn dt-done" data-t="done"></button>
    </div>
    <div class="dt-pop" hidden>
      ${headings.map((h) => `<a href="#${h.id}" data-id="${h.id}" class="d${h.tagName === 'H3' ? 3 : 2}">${h.textContent.replace(/[<>&]/g, '')}</a>`).join('')}
    </div>`;
  article.insertBefore(bar, prose);
  const pop = bar.querySelector('.dt-pop');
  const tocBtn = bar.querySelector('[data-t="toc"]');
  const doneBtn = bar.querySelector('[data-t="done"]');
  const readBar = bar.querySelector('.dt-read i');
  const readTxt = bar.querySelector('.dt-read b');

  const scrollToEl = (el) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 130, behavior: 'smooth' });
  const paintDone = () => {
    const d = isDone();
    doneBtn.classList.toggle('on', d);
    doneBtn.textContent = d ? '완료함' : '완료로 표시';
  };
  paintDone();

  on(bar, 'click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    const link = e.target.closest('.dt-pop a');
    if (link) {
      e.preventDefault();
      pop.hidden = true;
      tocBtn.setAttribute('aria-expanded', 'false');
      const el = document.getElementById(link.dataset.id);
      if (el) scrollToEl(el);
      return;
    }
    if (t === 'toc') {
      pop.hidden = !pop.hidden;
      tocBtn.setAttribute('aria-expanded', String(!pop.hidden));
    }
    if (t === 'answers') {
      const open = !answers.every((d) => d.open);
      answers.forEach((d) => (d.open = open));
      e.target.textContent = open ? '답 모두 접기' : '답 모두 펼치기';
    }
    if (t === 'smaller' || t === 'bigger') {
      const cur = store.get(SCALE_KEY, 1);
      const at = SCALES.indexOf(cur) === -1 ? 1 : SCALES.indexOf(cur);
      const idx = Math.max(0, Math.min(SCALES.length - 1, at + (t === 'bigger' ? 1 : -1)));
      store.set(SCALE_KEY, SCALES[idx]);
      applyProseScale();
    }
    if (t === 'done') toggleDone();
  });
  on(document, 'click', (e) => {
    if (!pop.hidden && !bar.contains(e.target)) {
      pop.hidden = true;
      tocBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── 토스트 ── */
  let toastEl = null;
  let toastTimer = 0;
  const toast = (html, actions, ms = 9000) => {
    closeToast();
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = `<span>${html}</span>${actions.map((a, i) => `<button type="button" class="${i === 0 ? 'primary' : ''}" data-i="${i}">${a.label}</button>`).join('')}`;
    toastEl.addEventListener('click', (e) => {
      const i = e.target.closest('button')?.dataset.i;
      if (i === undefined) return;
      actions[Number(i)].run?.();
      closeToast();
    });
    document.body.appendChild(toastEl);
    toastTimer = setTimeout(closeToast, ms);
  };
  function closeToast() {
    clearTimeout(toastTimer);
    toastEl?.remove();
    toastEl = null;
  }
  cleanups.push(closeToast);

  /* ── 읽은 비율 · 이어 읽기 저장 · 맨 위로 ── */
  const topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'to-top';
  topBtn.setAttribute('aria-label', '맨 위로');
  topBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 14 6-6 6 6"/></svg>';
  topBtn.hidden = true;
  topBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(topBtn);
  cleanups.push(() => topBtn.remove());

  const ratio = () => {
    const top = article.getBoundingClientRect().top + scrollY;
    const span = article.offsetHeight - innerHeight * 0.6;
    return span > 0 ? Math.max(0, Math.min(1, (scrollY - top + innerHeight * 0.3) / span)) : 1;
  };
  const posKey = 'read-pos';
  let saveTimer = 0;
  const paintRead = () => {
    const r = ratio();
    readBar.style.width = `${Math.round(r * 100)}%`;
    readTxt.textContent = `${Math.round(r * 100)}%`;
    topBtn.hidden = scrollY < 900;
    return r;
  };
  // 위치 저장은 사용자가 직접 스크롤했을 때만 (페이지 이동 때의 스크롤 초기화가 덮어쓰지 않도록)
  const onScroll = () => {
    const r = paintRead();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!article.isConnected) return;
      const all = store.get(posKey, {});
      all[key] = r;
      store.set(posKey, all);
    }, 400);
  };
  let armed = false;
  const arm = () => {
    if (armed) return;
    armed = true;
    on(window, 'scroll', onScroll, { passive: true });
  };
  on(window, 'scroll', paintRead, { passive: true });
  ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) => on(window, ev, arm, { passive: true }));
  cleanups.push(() => clearTimeout(saveTimer));
  paintRead();

  // 이어 읽기 제안 (특정 섹션으로 바로 들어온 경우는 제외)
  const saved = store.get(posKey, {})[key];
  if (!skipResume && saved > 0.08 && saved < 0.95) {
    setTimeout(() => {
      toast(`지난번에 ${Math.round(saved * 100)}%까지 읽었어요.`, [
        {
          label: '이어 읽기',
          run: () => {
            const top = article.getBoundingClientRect().top + scrollY;
            const span = article.offsetHeight - innerHeight * 0.6;
            window.scrollTo({ top: top + saved * span - innerHeight * 0.3, behavior: 'smooth' });
          },
        },
        { label: '처음부터' },
      ]);
    }, 500);
  }

  // 끝까지 읽으면 완료 제안 (한 번만)
  const finish = article.querySelector('.finish');
  if (finish && 'IntersectionObserver' in window) {
    let asked = false;
    const io = new IntersectionObserver((entries) => {
      if (asked || !entries.some((en) => en.isIntersecting) || isDone()) return;
      asked = true;
      toast('끝까지 읽었어요. 이 문서를 완료로 표시할까요?', [{ label: '완료로 표시', run: toggleDone }, { label: '나중에' }]);
    });
    io.observe(finish);
    cleanups.push(() => io.disconnect());
  }

  // ← → 로 이전·다음 문서 (입력 중이거나 조합키를 누르면 무시)
  on(document, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (document.querySelector('.modal:not([hidden])')) return;
    const link =
      e.key === 'ArrowRight' ? article.querySelector('.pager a.next') : e.key === 'ArrowLeft' ? article.querySelector('.pager a:not(.next)') : null;
    if (link) {
      e.preventDefault();
      link.click();
    }
  });

  return {
    refresh: paintDone,
    destroy() {
      cleanups.forEach((fn) => fn());
      bar.remove();
    },
  };
}
