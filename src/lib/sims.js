/**
 * 문서 안의 인터랙티브 시뮬레이터.
 * MDX에서 ```sim 이름``` 코드 블록을 쓰면 rehype-study가 <div class="sim" data-sim="이름">으로 바꾸고,
 * 이 파일의 mountSims(root)가 그 자리에 시뮬레이터를 그린다.
 * Next.js(SimMount 컴포넌트)와 Artifact 빌드가 같은 파일을 쓴다. (순수 JS, DOM만 사용)
 */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 단계별로 넘겨보는 시뮬레이터 공통 틀: 처음 / 이전 / 다음 / 자동 재생 */
function stepper(el, { title, sub, controls = '', steps, render }) {
  let i = 0;
  let timer = null;
  let list = typeof steps === 'function' ? steps() : steps;
  el.innerHTML = `
    <div class="sim-head"><span class="sim-kicker">직접 해보기</span><h4>${esc(title)}</h4>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    ${controls ? `<div class="sim-controls">${controls}</div>` : ''}
    <div class="sim-stage"></div>
    <div class="sim-note"></div>
    <div class="sim-nav">
      <button type="button" class="sim-btn" data-act="reset">처음</button>
      <button type="button" class="sim-btn" data-act="prev">이전</button>
      <span class="sim-count"></span>
      <button type="button" class="sim-btn" data-act="play">자동 재생</button>
      <button type="button" class="sim-btn primary" data-act="next">다음 단계</button>
    </div>`;
  const stage = el.querySelector('.sim-stage');
  const note = el.querySelector('.sim-note');
  const count = el.querySelector('.sim-count');
  const playBtn = el.querySelector('[data-act="play"]');
  const stop = () => {
    clearInterval(timer);
    timer = null;
    playBtn.textContent = '자동 재생';
  };
  const paint = () => {
    const s = list[i];
    stage.innerHTML = render(s, i, list);
    note.innerHTML = s.note || '';
    count.textContent = `${i + 1} / ${list.length}`;
    el.querySelector('[data-act="prev"]').disabled = i === 0;
    el.querySelector('[data-act="next"]').disabled = i === list.length - 1;
  };
  el.querySelector('.sim-nav').addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    if (act === 'reset') { stop(); i = 0; }
    if (act === 'prev') { stop(); i = Math.max(0, i - 1); }
    if (act === 'next') { stop(); i = Math.min(list.length - 1, i + 1); }
    if (act === 'play') {
      if (timer) stop();
      else {
        if (i === list.length - 1) i = 0;
        playBtn.textContent = '멈춤';
        timer = setInterval(() => {
          if (i >= list.length - 1) return stop();
          i++;
          paint();
        }, 1300);
      }
    }
    paint();
  });
  paint();
  return {
    reload(newSteps) {
      stop();
      list = typeof newSteps === 'function' ? newSteps() : newSteps;
      i = 0;
      paint();
    },
  };
}

/* ------------------------------------------------------------------ */
/* 1. 이벤트 루프                                                      */
/* ------------------------------------------------------------------ */
const EL_CODE = [
  "console.log('1: 동기 시작');",
  "setTimeout(() => console.log('5: timeout'), 0);",
  "Promise.resolve().then(() => console.log('3: then'));",
  "queueMicrotask(() => console.log('4: microtask'));",
  "console.log('2: 동기 끝');",
];
const EL_STEPS = [
  { line: -1, stack: [], api: [], micro: [], macro: [], out: [], note: '스크립트 전체가 하나의 <b>태스크</b>로 실행을 시작합니다. 콜 스택이 비어 있습니다.' },
  { line: 0, stack: ['main()', "console.log('1')"], api: [], micro: [], macro: [], out: ['1: 동기 시작'], note: '동기 코드는 콜 스택에서 <b>바로</b> 실행됩니다.' },
  { line: 1, stack: ['main()', 'setTimeout(cb, 0)'], api: ['timer 0ms → cb'], micro: [], macro: [], out: ['1: 동기 시작'], note: 'setTimeout은 타이머를 <b>Web API(Node: libuv)</b>에 맡기고 즉시 반환합니다. 0ms여도 바로 실행되지 않습니다.' },
  { line: 1, stack: ['main()'], api: [], micro: [], macro: ['timeout cb'], out: ['1: 동기 시작'], note: '타이머가 끝나면 콜백이 <b>Task Queue</b>로 들어가 차례를 기다립니다.' },
  { line: 2, stack: ['main()', 'Promise.then(cb)'], api: [], micro: ['then cb'], macro: ['timeout cb'], out: ['1: 동기 시작'], note: '이미 resolve된 Promise의 then 콜백은 <b>Microtask Queue</b>에 들어갑니다.' },
  { line: 3, stack: ['main()', 'queueMicrotask(cb)'], api: [], micro: ['then cb', 'microtask cb'], macro: ['timeout cb'], out: ['1: 동기 시작'], note: 'queueMicrotask도 Microtask Queue 뒤에 줄을 섭니다.' },
  { line: 4, stack: ['main()', "console.log('2')"], api: [], micro: ['then cb', 'microtask cb'], macro: ['timeout cb'], out: ['1: 동기 시작', '2: 동기 끝'], note: '마지막 동기 코드 실행.' },
  { line: -1, stack: [], api: [], micro: ['then cb', 'microtask cb'], macro: ['timeout cb'], out: ['1: 동기 시작', '2: 동기 끝'], note: '콜 스택이 비었습니다. 이벤트 루프는 이제 <b>Microtask Queue를 전부</b> 비웁니다. Task Queue는 그 다음입니다.' },
  { line: 2, stack: ['then cb'], api: [], micro: ['microtask cb'], macro: ['timeout cb'], out: ['1: 동기 시작', '2: 동기 끝', '3: then'], note: '마이크로태스크 1개 실행.' },
  { line: 3, stack: ['microtask cb'], api: [], micro: [], macro: ['timeout cb'], out: ['1: 동기 시작', '2: 동기 끝', '3: then', '4: microtask'], note: '마이크로태스크가 하나도 남지 않을 때까지 계속 실행합니다.' },
  { line: -1, stack: [], api: [], micro: [], macro: ['timeout cb'], out: ['1: 동기 시작', '2: 동기 끝', '3: then', '4: microtask'], note: '(브라우저라면 여기서 렌더링 기회가 생깁니다.) 이제 Task Queue에서 <b>하나</b>를 꺼냅니다.' },
  { line: 1, stack: ['timeout cb'], api: [], micro: [], macro: [], out: ['1: 동기 시작', '2: 동기 끝', '3: then', '4: microtask', '5: timeout'], note: '그래서 setTimeout(…, 0)이 Promise보다 <b>늦게</b> 찍힙니다. 최종 순서 1 → 2 → 3 → 4 → 5.' },
];
function simEventLoop(el) {
  const lane = (name, items, cls) =>
    `<div class="sim-lane ${cls}"><div class="sim-lane-name">${name}</div><div class="sim-lane-items">${
      items.length ? items.map((t) => `<span class="sim-chip">${esc(t)}</span>`).join('') : '<span class="sim-empty">비어 있음</span>'
    }</div></div>`;
  stepper(el, {
    title: '이벤트 루프 한 바퀴',
    sub: '다음 단계를 누르며 콜 스택과 두 개의 큐가 어떻게 바뀌는지 보세요.',
    steps: EL_STEPS,
    render: (s) => `
      <div class="sim-grid2">
        <pre class="sim-code">${EL_CODE.map((l, i) => `<span class="${i === s.line ? 'on' : ''}"><i>${i + 1}</i>${esc(l)}</span>`).join('')}</pre>
        <div class="sim-lanes">
          ${lane('Call Stack', [...s.stack].reverse(), 'stack')}
          ${lane('Web APIs', s.api, 'api')}
          ${lane('Microtask Queue', s.micro, 'micro')}
          ${lane('Task Queue', s.macro, 'macro')}
        </div>
      </div>
      <div class="sim-log"><b>콘솔</b>${s.out.map((o) => `<div>&gt; ${esc(o)}</div>`).join('') || '<div class="sim-empty">출력 없음</div>'}</div>`,
  });
}

/* ------------------------------------------------------------------ */
/* 2. NestJS 요청 파이프라인                                           */
/* ------------------------------------------------------------------ */
const PIPE_NODES = [
  ['mw', 'Middleware', 'LoggerMiddleware'],
  ['guard', 'Guard', 'JwtAuthGuard'],
  ['icBefore', 'Interceptor (전)', 'LoggingInterceptor'],
  ['pipe', 'Pipe', 'ParseIntPipe'],
  ['handler', 'Handler', 'UsersController.findOne'],
  ['icAfter', 'Interceptor (후)', 'map → { data }'],
  ['filter', 'Exception Filter', 'HttpExceptionFilter'],
];
const PIPE_SCENARIOS = {
  ok: { label: '정상 요청', req: 'GET /users/42\nAuthorization: Bearer eyJ…' },
  noToken: { label: '토큰 없음', req: 'GET /users/42' },
  badId: { label: 'id가 숫자가 아님', req: 'GET /users/abc\nAuthorization: Bearer eyJ…' },
  notFound: { label: '없는 유저', req: 'GET /users/999\nAuthorization: Bearer eyJ…' },
};
function pipeSteps(key) {
  const S = [];
  const st = {};
  const push = (id, state, log, note, res) => {
    if (id) st[id] = state;
    S.push({ st: { ...st }, log: [...(S.at(-1)?.log || []), ...(log ? [log] : [])], note, res });
  };
  const id = key === 'badId' ? "'abc'" : key === 'notFound' ? '999' : '42';
  push(null, null, null, `요청이 들어왔습니다. 위에서 아래로 차례대로 통과해야 핸들러에 닿습니다.`);
  push('mw', 'pass', `[LoggerMiddleware] ${key === 'badId' ? 'GET /users/abc' : `GET /users/${id}`}`, 'Middleware는 라우트 매칭 직후 가장 먼저 실행됩니다. 아직 어떤 핸들러가 실행될지는 모릅니다(ExecutionContext 없음).');
  if (key === 'noToken') {
    push('guard', 'fail', '[JwtAuthGuard] Authorization 헤더 없음 → false', 'Guard가 false를 반환하면 Nest가 <b>ForbiddenException</b>을 던집니다. (AuthGuard("jwt")라면 UnauthorizedException) 인터셉터, 파이프, 핸들러는 <b>실행되지 않습니다</b>.');
    push('filter', 'catch', '[HttpExceptionFilter] 401 Unauthorized', '예외는 Exception Filter가 잡아 응답 형태로 바꿉니다.', { code: 401, body: { statusCode: 401, message: 'Unauthorized' } });
    return S;
  }
  push('guard', 'pass', '[JwtAuthGuard] 토큰 검증 OK → request.user = { id: 7 }', 'Guard는 ExecutionContext를 받기 때문에 핸들러의 메타데이터(@Roles 등)를 읽을 수 있습니다.');
  push('icBefore', 'pass', '[LoggingInterceptor] before… (start=Date.now())', 'Interceptor는 next.handle() 앞뒤로 코드를 감쌉니다. 지금은 "앞" 부분입니다.');
  if (key === 'badId') {
    push('pipe', 'fail', "[ParseIntPipe] 'abc' → BadRequestException", 'Pipe는 핸들러 인자를 변환·검증합니다. 숫자로 바꿀 수 없으니 <b>400</b>을 던지고 핸들러는 호출되지 않습니다.');
    push('icAfter', 'skip', '[LoggingInterceptor] 에러가 스트림으로 전파 (catchError로 가로챌 수 있음)', '인터셉터의 "뒤" 부분에는 정상 값 대신 에러가 흘러갑니다.');
    push('filter', 'catch', '[HttpExceptionFilter] 400 Bad Request', '', { code: 400, body: { statusCode: 400, message: 'Validation failed (numeric string is expected)', error: 'Bad Request' } });
    return S;
  }
  push('pipe', 'pass', `[ParseIntPipe] '${id}' → ${id}`, '문자열 파라미터가 number로 변환되어 핸들러에 들어갑니다.');
  if (key === 'notFound') {
    push('handler', 'fail', '[UsersService] findOne(999) → null → NotFoundException', '핸들러(또는 서비스)에서 던진 예외도 똑같이 필터로 갑니다.');
    push('icAfter', 'skip', '[LoggingInterceptor] 에러 전파', '');
    push('filter', 'catch', '[HttpExceptionFilter] 404 Not Found', '', { code: 404, body: { statusCode: 404, message: 'User #999 not found', error: 'Not Found' } });
    return S;
  }
  push('handler', 'pass', '[UsersController] findOne(42) → { id: 42, name: "민지" }', '드디어 핸들러 실행. 반환값은 Observable 스트림으로 감싸져 인터셉터에게 돌아갑니다.');
  push('icAfter', 'pass', '[LoggingInterceptor] after… 12ms, map(data → { data })', '인터셉터의 "뒤" 부분. 응답을 변환하거나 시간을 잴 수 있습니다. 순서는 등록의 <b>역순</b>입니다.');
  push('filter', 'skip', '', '예외가 없으니 Exception Filter는 건너뜁니다.', { code: 200, body: { data: { id: 42, name: '민지' } } });
  return S;
}
function simRequestPipeline(el) {
  let key = 'ok';
  const controls = Object.entries(PIPE_SCENARIOS)
    .map(([k, v]) => `<button type="button" class="sim-btn ${k === key ? 'on' : ''}" data-scn="${k}">${v.label}</button>`)
    .join('');
  const label = { pass: '통과', fail: '중단', skip: '건너뜀', catch: '처리' };
  const api = stepper(el, {
    title: 'GET /users/42 가 핸들러에 닿기까지',
    sub: '시나리오를 고르고 단계를 넘겨 보세요. 어디서 멈추는지가 핵심입니다.',
    controls,
    steps: () => pipeSteps(key),
    render: (s) => `
      <div class="sim-grid2">
        <div>
          <pre class="sim-req">${esc(PIPE_SCENARIOS[key].req)}</pre>
          <ol class="sim-pipe">${PIPE_NODES.map(([id, kind, name]) => {
            const state = s.st[id] || '';
            return `<li class="${state}"><span class="k">${kind}</span><span class="n">${esc(name)}</span><span class="s">${label[state] || ''}</span></li>`;
          }).join('')}</ol>
        </div>
        <div>
          <div class="sim-log"><b>서버 로그</b>${s.log.map((l) => `<div>${esc(l)}</div>`).join('') || '<div class="sim-empty">아직 없음</div>'}</div>
          ${s.res ? `<div class="sim-res c${String(s.res.code)[0]}"><b>HTTP ${s.res.code}</b><pre>${esc(JSON.stringify(s.res.body, null, 2))}</pre></div>` : ''}
        </div>
      </div>`,
  });
  el.querySelector('.sim-controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-scn]');
    if (!b) return;
    key = b.dataset.scn;
    el.querySelectorAll('[data-scn]').forEach((x) => x.classList.toggle('on', x === b));
    api.reload(() => pipeSteps(key));
  });
}

/* ------------------------------------------------------------------ */
/* 3. DI 컨테이너가 OrdersService를 만드는 과정                         */
/* ------------------------------------------------------------------ */
const DI_SCENARIOS = { ok: '정상', noExport: 'PaymentsService를 exports에서 빠뜨림', circular: 'PaymentsService가 OrdersService를 주입받음' };
function diSteps(key) {
  const S = [];
  const st = {};
  const push = (id, state, log, note, err) => {
    if (id) st[id] = state;
    S.push({ st: { ...st }, log: [...(S.at(-1)?.log || []), ...(log ? [log] : [])], note, err });
  };
  push('orders', 'resolving', 'OrdersService 인스턴스 요청', 'Injector가 OrdersService의 <b>design:paramtypes</b> 메타데이터를 읽습니다 → [OrdersRepository, PaymentsService].');
  push('repo', 'resolving', '  ├ [0] OrdersRepository: 같은 OrdersModule의 providers에서 찾음', '먼저 <b>자기 모듈</b>의 providers를 찾습니다.');
  push('ds', 'resolving', '  │   └ DataSource: OrdersModule에 없음 → imports 탐색 → TypeOrmModule(global)에서 찾음', '자기 모듈에 없으면 import한 모듈의 <b>exports</b>, 그리고 global 모듈을 찾습니다.');
  push('ds', 'done', '  │   └ DataSource 준비 완료 (이미 생성된 싱글톤 재사용)', '');
  push('repo', 'done', '  ├ new OrdersRepository(dataSource)', '의존성이 모두 준비되면 그때 생성자가 호출됩니다. <b>깊이 우선</b>으로 아래부터 만들어집니다.');
  if (key === 'noExport') {
    push('pay', 'error', '  └ [1] PaymentsService: OrdersModule에 없음 → PaymentsModule은 import했지만 exports에 없음', '모듈은 <b>캡슐화</b>되어 있어서 exports하지 않은 provider는 밖에서 볼 수 없습니다.');
    push('orders', 'error', 'UnknownDependenciesException', '', "Nest can't resolve dependencies of the OrdersService (OrdersRepository, ?). Please make sure that the argument PaymentsService at index [1] is available in the OrdersModule context.");
    return S;
  }
  if (key === 'circular') {
    push('pay', 'resolving', '  └ [1] PaymentsService: PaymentsModule exports에서 찾음 → 의존성 [OrdersService]', 'PaymentsService를 만들려면 OrdersService가 필요한데…');
    push('orders', 'error', '      └ OrdersService: 아직 생성 중 (자기 자신을 기다림)', '서로가 서로를 기다리는 <b>순환 의존</b>입니다. 파일 import 순환이 겹치면 데코레이터 평가 시점에 클래스가 <b>undefined</b>로 잡히기도 합니다.');
    push('pay', 'error', 'forwardRef(() => OrdersService)로 지연시키거나 구조를 바꿔야 함', '해결: 양쪽에 <code>@Inject(forwardRef(() => …))</code>, 또는 공통 로직을 제3의 provider로 분리(권장).', "Nest can't resolve dependencies of the PaymentsService (?). Please make sure that the argument dependency at index [0] is available in the PaymentsModule context. … A circular dependency between modules. Use forwardRef() to avoid it.");
    return S;
  }
  push('pay', 'resolving', '  └ [1] PaymentsService: imports한 PaymentsModule의 exports에서 찾음', '');
  push('http', 'done', '      └ HttpService 준비 완료', '');
  push('pay', 'done', '  └ new PaymentsService(httpService)', '');
  push('orders', 'done', 'new OrdersService(ordersRepository, paymentsService)', '완성. 기본 스코프(DEFAULT)라 이 인스턴스는 앱 전체에서 <b>하나만</b> 쓰입니다.');
  return S;
}
function simDI(el) {
  let key = 'ok';
  const controls = Object.entries(DI_SCENARIOS)
    .map(([k, v]) => `<button type="button" class="sim-btn ${k === key ? 'on' : ''}" data-scn="${k}">${v}</button>`)
    .join('');
  const node = (s, id, name, where) => `<div class="sim-node ${s.st[id] || ''}"><b>${name}</b><small>${where}</small></div>`;
  const api = stepper(el, {
    title: 'OrdersService 하나 만들기',
    sub: 'DI 컨테이너가 의존성 트리를 거꾸로 타고 내려가며 인스턴스를 만드는 순서입니다.',
    controls,
    steps: () => diSteps(key),
    render: (s) => `
      <div class="sim-tree">
        ${node(s, 'orders', 'OrdersService', 'OrdersModule')}
        <div class="sim-branch">
          <div>${node(s, 'repo', 'OrdersRepository', 'OrdersModule')}<div class="sim-branch">${node(s, 'ds', 'DataSource', 'TypeOrmModule (global)')}</div></div>
          <div>${node(s, 'pay', 'PaymentsService', 'PaymentsModule')}<div class="sim-branch">${key === 'circular' ? node(s, 'orders', 'OrdersService ↺', '순환!') : node(s, 'http', 'HttpService', 'HttpModule')}</div></div>
        </div>
      </div>
      <div class="sim-log"><b>Injector 로그</b>${s.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      ${s.err ? `<div class="sim-res c4"><b>에러</b><pre>${esc(s.err)}</pre></div>` : ''}`,
  });
  el.querySelector('.sim-controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-scn]');
    if (!b) return;
    key = b.dataset.scn;
    el.querySelectorAll('[data-scn]').forEach((x) => x.classList.toggle('on', x === b));
    api.reload(() => diSteps(key));
  });
}

/* ------------------------------------------------------------------ */
/* 4. Promise 조합기 비교 (실제 시간으로 실행)                           */
/* ------------------------------------------------------------------ */
function simPromise(el) {
  const tasks = [
    { id: 'A', ms: 600, label: 'fetchUser()' },
    { id: 'B', ms: 1500, label: 'fetchOrders()' },
    { id: 'C', ms: 1000, label: 'fetchPoints()' },
  ];
  el.innerHTML = `
    <div class="sim-head"><span class="sim-kicker">직접 해보기</span><h4>Promise.all · allSettled · race · any</h4><p>세 요청을 동시에 보내고, 조합 방식에 따라 언제 무엇을 돌려받는지 비교합니다. 실패를 켜고 다시 돌려 보세요.</p></div>
    <div class="sim-controls">
      ${tasks.map((t) => `<label class="sim-check"><input type="checkbox" data-fail="${t.id}" ${t.id === 'C' ? 'checked' : ''}> ${t.id} 실패</label>`).join('')}
    </div>
    <div class="sim-controls">
      ${['all', 'allSettled', 'race', 'any'].map((m) => `<button type="button" class="sim-btn primary" data-run="${m}">Promise.${m}</button>`).join('')}
    </div>
    <div class="sim-bars">${tasks.map((t) => `<div class="sim-bar" data-bar="${t.id}"><span class="lbl">${t.id} ${t.label} · ${t.ms}ms</span><span class="track"><i></i></span><span class="st"></span></div>`).join('')}</div>
    <div class="sim-res" data-out><b>결과</b><pre>버튼을 눌러 실행하세요</pre></div>`;
  let run = 0;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-run]');
    if (!b) return;
    const method = b.dataset.run;
    const id = ++run;
    const fail = Object.fromEntries([...el.querySelectorAll('[data-fail]')].map((c) => [c.dataset.fail, c.checked]));
    const out = el.querySelector('[data-out]');
    out.className = 'sim-res';
    out.innerHTML = `<b>Promise.${method} 대기 중…</b><pre>pending</pre>`;
    const t0 = performance.now();
    const ps = tasks.map((t) => {
      const bar = el.querySelector(`[data-bar="${t.id}"]`);
      bar.className = 'sim-bar running';
      bar.querySelector('i').style.transition = 'none';
      bar.querySelector('i').style.width = '0';
      bar.querySelector('.st').textContent = '';
      requestAnimationFrame(() => {
        bar.querySelector('i').style.transition = `width ${t.ms}ms linear`;
        bar.querySelector('i').style.width = `${(t.ms / 1500) * 100}%`;
      });
      return new Promise((res, rej) =>
        setTimeout(() => {
          if (id !== run) return;
          bar.className = `sim-bar ${fail[t.id] ? 'rejected' : 'fulfilled'}`;
          bar.querySelector('.st').textContent = fail[t.id] ? 'rejected' : 'fulfilled';
          fail[t.id] ? rej(new Error(`${t.id} 실패`)) : res(`${t.id} 결과`);
        }, t.ms),
      );
    });
    ps.forEach((p) => p.catch(() => {}));
    const show = (ok, value) => {
      if (id !== run) return;
      const ms = Math.round(performance.now() - t0);
      out.className = `sim-res ${ok ? 'c2' : 'c4'}`;
      out.innerHTML = `<b>${ok ? 'fulfilled' : 'rejected'} · ${ms}ms 후 결정</b><pre>${esc(value)}</pre>`;
    };
    const fmt = (v) => JSON.stringify(v, (_k, x) => (x instanceof Error ? `Error: ${x.message}` : x), 2);
    Promise[method](ps).then(
      (v) => show(true, fmt(v)),
      (err) => show(false, err instanceof AggregateError ? `AggregateError: ${err.errors.map((x) => x.message).join(', ')}` : `Error: ${err.message}`),
    );
  });
}

/* ------------------------------------------------------------------ */
/* 5. Provider Scope 실험                                               */
/* ------------------------------------------------------------------ */
function simScope(el) {
  let scope = 'DEFAULT';
  let reqs = [];
  let created = 0;
  let singleton = null;
  const desc = {
    DEFAULT: '앱이 뜰 때 <b>한 번</b> 만들고 모든 요청·모든 주입처가 같은 인스턴스를 공유합니다.',
    REQUEST: '요청마다 <b>새로</b> 만들고, 그 요청 안에서는 공유합니다. 이 provider에 의존하는 쪽도 함께 요청 스코프가 됩니다(전파).',
    TRANSIENT: '주입받는 곳마다 <b>각자</b> 새 인스턴스를 받습니다. 요청과는 상관없습니다.',
  };
  el.innerHTML = `
    <div class="sim-head"><span class="sim-kicker">직접 해보기</span><h4>Provider Scope에 따라 인스턴스는 몇 개?</h4><p>CartService를 OrdersController와 CouponService가 함께 주입받습니다. 스코프를 고르고 요청을 보내 보세요.</p></div>
    <div class="sim-controls">${['DEFAULT', 'REQUEST', 'TRANSIENT'].map((s) => `<button type="button" class="sim-btn ${s === scope ? 'on' : ''}" data-scope="${s}">Scope.${s}</button>`).join('')}</div>
    <div class="sim-note" data-desc></div>
    <div class="sim-controls"><button type="button" class="sim-btn primary" data-send>요청 보내기</button><button type="button" class="sim-btn" data-clear>초기화</button><span class="sim-count" data-made></span></div>
    <div class="table-wrap"><table class="sim-table"><thead><tr><th>요청</th><th>OrdersController가 받은 CartService</th><th>CouponService가 받은 CartService</th></tr></thead><tbody data-rows></tbody></table></div>`;
  const nextId = () => `#${++created}`;
  const reset = () => {
    reqs = [];
    created = 0;
    singleton = null;
    if (scope === 'DEFAULT') singleton = nextId();
    if (scope === 'TRANSIENT') singleton = [nextId(), nextId()];
    paint();
  };
  const paint = () => {
    el.querySelector('[data-desc]').innerHTML = desc[scope];
    el.querySelector('[data-made]').textContent = `지금까지 만든 CartService: ${created}개`;
    el.querySelector('[data-rows]').innerHTML = reqs.length
      ? reqs.map((r, i) => `<tr><td>요청 ${i + 1}</td><td><span class="sim-chip">${r[0]}</span></td><td><span class="sim-chip">${r[1]}</span></td></tr>`).join('')
      : '<tr><td colspan="3" class="sim-empty">아직 요청이 없습니다</td></tr>';
  };
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-scope]');
    if (s) {
      scope = s.dataset.scope;
      el.querySelectorAll('[data-scope]').forEach((x) => x.classList.toggle('on', x === s));
      reset();
    }
    if (e.target.closest('[data-send]')) {
      if (scope === 'DEFAULT') reqs.push([singleton, singleton]);
      if (scope === 'TRANSIENT') reqs.push(singleton);
      if (scope === 'REQUEST') {
        const id = nextId();
        reqs.push([id, id]);
      }
      paint();
    }
    if (e.target.closest('[data-clear]')) reset();
  });
  reset();
}

const SIMS = {
  'event-loop': simEventLoop,
  'request-pipeline': simRequestPipeline,
  'di-resolve': simDI,
  'promise-combinators': simPromise,
  'provider-scope': simScope,
};

export function mountSims(root) {
  root.querySelectorAll('.sim[data-sim]').forEach((el) => {
    if (el.dataset.mounted) return;
    const fn = SIMS[el.dataset.sim];
    if (!fn) return;
    el.dataset.mounted = '1';
    fn(el);
  });
}
