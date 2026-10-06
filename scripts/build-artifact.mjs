// MDX 콘텐츠 → 단일 HTML (Artifact 배포용)
// 실행: node scripts/build-artifact.mjs  →  artifact/study-notes.html
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import rehypeStudy from '../src/lib/rehype-study.ts';
import { carSVG, groundSVG, skylineSVG } from '../src/lib/scenery.ts';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'src', 'content');
const SECTIONS = [
  { id: 'nestjs', title: 'NestJS' },
  { id: 'js-ts', title: 'JS / TS' },
  { id: 'interview', title: '면접 질문' },
];
const ROADMAP = JSON.parse(fs.readFileSync(path.join(CONTENT, 'roadmap.json'), 'utf8'));

const textOf = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(textOf).join(''));

// 검색용: 헤딩 단위로 본문 평문을 모은다 (브라우저에서 HTML을 다시 파싱하지 않도록)
function collectSearch(target, doc) {
  return () => (tree) => {
    let cur = { heading: doc.title, anchor: null, text: doc.description };
    for (const n of tree.children ?? []) {
      if (n.tagName === 'h2' || n.tagName === 'h3') {
        target.push(cur);
        cur = { heading: textOf(n), anchor: n.properties.id, text: '' };
      } else if (n.type === 'element' && n.tagName !== 'pre' && n.tagName !== 'figure') {
        cur.text += ' ' + textOf(n);
      }
    }
    target.push(cur);
  };
}

function collectHeadings(target) {
  return () => (tree) => {
    const walk = (n) => {
      if (n.tagName === 'h2' || n.tagName === 'h3') {
        target.push({ depth: n.tagName === 'h2' ? 2 : 3, id: n.properties.id, text: textOf(n) });
      }
      n.children?.forEach(walk);
    };
    walk(tree);
  };
}

const docs = [];
for (const s of SECTIONS) {
  const dir = path.join(CONTENT, s.id);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    const headings = [];
    const search = [];
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStudy)
        .use(rehypeSlug)
        .use(collectHeadings(headings))
        .use(collectSearch(search, { title: String(data.title), description: String(data.description ?? '') }))
        .use(rehypePrettyCode, {
          theme: 'github-dark-dimmed',
          keepBackground: false,
          defaultLang: 'plaintext',
        })
        .use(rehypeStringify)
        .process(content),
    );
    docs.push({
      id: `${s.id}-${file.replace(/\.mdx$/, '')}`,
      section: s.id,
      title: String(data.title),
      description: String(data.description ?? ''),
      order: Number(data.order ?? 99),
      minutes: Math.max(1, Math.round(content.length / 900)),
      headings,
      search: search.map((e) => ({ ...e, text: e.text.replace(/\s+/g, ' ').trim() })),
      html,
    });
  }
}
docs.sort((a, b) => SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section) || a.order - b.order);

const template = fs.readFileSync(path.join(ROOT, 'scripts', 'artifact-template.html'), 'utf8');
const stages = ROADMAP.stages.map((st) => ({ ...st, docs: st.docs.map((d) => d.replace('/', '-')) }));
// 코드 하이라이팅의 인라인 색상(style="color:#…")을 짧은 클래스로 바꿔 크기를 줄인다
const colorClass = new Map();
for (const d of docs) {
  d.html = d.html.replace(/ style="color:(#[0-9A-Fa-f]{3,8})"/g, (_m, c) => {
    const key = c.toUpperCase();
    if (!colorClass.has(key)) colorClass.set(key, `k${colorClass.size.toString(36)}`);
    return ` class="${colorClass.get(key)}"`;
  });
}
const codeCss = [...colorClass].map(([c, k]) => `.${k}{color:${c}}`).join('');

const art = { skyline: skylineSVG(), skylineSmall: skylineSVG(19), car: carSVG(), ground: groundSVG() };
// 문서 데이터는 gzip + base64로 넣고 브라우저에서 DecompressionStream으로 푼다 (다운로드 크기 약 1/4)
const payload = zlib.gzipSync(JSON.stringify({ stages, docs, art }), { level: 9 }).toString('base64');
fs.mkdirSync(path.join(ROOT, 'artifact'), { recursive: true });
const out = path.join(ROOT, 'artifact', 'study-notes.html');
// Next.js와 같은 스타일시트를 그대로 사용 (Tailwind 지시어만 제거)
const css =
  fs.readFileSync(path.join(ROOT, 'src', 'app', 'globals.css'), 'utf8').replace(/^@tailwind .*;$/gm, '') + '\n' + codeCss;
// 자동차·시뮬레이터 스크립트도 Next.js와 같은 파일을 그대로 인라인 (export 키워드만 제거)
const lib = ['road-car.js', 'sims.js', 'doc-tools.js']
  .map((f) => fs.readFileSync(path.join(ROOT, 'src', 'lib', f), 'utf8').replace(/^export /gm, ''))
  .join('\n');
fs.writeFileSync(
  out,
  template
    .replace('/*__CSS__*/', () => css)
    .replace('/*__LIB__*/', () => lib)
    .replace('__DATA__', () => payload),
);
console.log(`wrote ${out} (${docs.length} docs, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
