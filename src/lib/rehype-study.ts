/**
 * 공부용 rehype 플러그인
 *  1) blockquote 첫 굵은 글씨(비유 / 포인트 / 주의 / 꼬리 질문)로 callout 종류를 정하고 라벨로 분리
 *  2) **A.** 로 시작하는 답변 문단(셀프 체크, 면접 질문)을 <details>로 감싸 클릭해서 확인하게 만든다
 *  3) 질문의 "(단골)" 표시를 배지로 바꾼다
 */
type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const CALLOUTS: [string, string][] = [
  ['비유', 'callout-analogy'],
  ['포인트', 'callout-tip'],
  ['주의', 'callout-warn'],
  ['꼬리 질문', 'callout-follow'],
];

function textOf(node: Node): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function addClass(node: Node, cls: string) {
  node.properties ??= {};
  const prev = node.properties.className;
  node.properties.className = [...(Array.isArray(prev) ? prev : prev ? [prev] : []), cls];
}

const firstElement = (node: Node) =>
  node.children?.find((c) => !(c.type === 'text' && !c.value?.trim()));

function decorateCallout(node: Node) {
  addClass(node, 'callout');
  const p = firstElement(node);
  const strong = p?.tagName === 'p' ? firstElement(p) : undefined;
  const label = strong?.tagName === 'strong' ? textOf(strong).trim() : '';
  const match = CALLOUTS.find(([name]) => label.startsWith(name));
  if (!match || !p || !strong) {
    addClass(node, 'callout-note');
    return;
  }
  addClass(node, match[1]);
  addClass(strong, 'callout-label');
  // 라벨 뒤의 ":" 제거
  const idx = p.children!.indexOf(strong);
  const after = p.children![idx + 1];
  if (after?.type === 'text') after.value = after.value!.replace(/^\s*:\s*/, '');
}

function decorateTag(node: Node) {
  // **Q. (단골) ...** → Q. [단골] ...
  if (node.tagName !== 'strong') return;
  const t = node.children?.[0];
  if (t?.type !== 'text' || !/\(단골\)\s*/.test(t.value ?? '')) return;
  const [before, rest] = t.value!.split(/\(단골\)\s*/);
  node.children!.splice(
    0,
    1,
    { type: 'text', value: before },
    { type: 'element', tagName: 'span', properties: { className: ['tag'] }, children: [{ type: 'text', value: '단골' }] },
    { type: 'text', value: rest ?? '' },
  );
}

function walk(node: Node) {
  if (node.tagName === 'blockquote') decorateCallout(node);
  decorateTag(node);
  node.children?.forEach(walk);
}

function isAnswer(node: Node) {
  if (node.tagName !== 'p') return false;
  const first = firstElement(node);
  return first?.tagName === 'strong' && textOf(first).trim().startsWith('A.');
}

/** ```sim 이름``` 코드 블록 → 시뮬레이터 자리 <div class="sim" data-sim="이름"> */
function simName(node: Node): string | null {
  if (node.tagName !== 'pre') return null;
  const code = node.children?.find((c) => c.tagName === 'code');
  const cls = code?.properties?.className;
  const list = Array.isArray(cls) ? cls : cls ? [cls] : [];
  return list.includes('language-sim') ? textOf(code!).trim() : null;
}

/** **Q. …** 로 시작하는 질문 문단 */
function isQuestion(node: Node) {
  if (node.tagName !== 'p') return false;
  const first = firstElement(node);
  return first?.tagName === 'strong' && /^Q\d*\./.test(textOf(first).trim());
}

/** 답이 끝나는 지점: 다음 질문, 헤딩, 구분선 */
const endsAnswer = (n: Node) => isQuestion(n) || /^(h[1-6]|hr)$/.test(n.tagName ?? '');

function wrapAnswers(root: Node) {
  const out: Node[] = [];
  const children = root.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const sim = simName(child);
    if (sim) {
      out.push({ type: 'element', tagName: 'div', properties: { className: ['sim'], dataSim: sim }, children: [] });
    } else if (isAnswer(child)) {
      // 답 문단 + 뒤따르는 코드·꼬리 질문까지 다음 질문 전까지 한 번에 접는다
      const body: Node[] = [child];
      while (i + 1 < children.length && !endsAnswer(children[i + 1]) && !simName(children[i + 1])) {
        body.push(children[++i]);
      }
      out.push({
        type: 'element',
        tagName: 'details',
        properties: { className: ['quiz-answer'] },
        children: [
          { type: 'element', tagName: 'summary', properties: {}, children: [{ type: 'text', value: '답 확인하기' }] },
          { type: 'element', tagName: 'div', properties: { className: ['answer-body'] }, children: body },
        ],
      });
    } else {
      out.push(child);
    }
  }
  root.children = out;
}

export default function rehypeStudy() {
  return (tree: Node) => {
    walk(tree);
    wrapAnswers(tree);
  };
}
