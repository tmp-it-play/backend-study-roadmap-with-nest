import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

/** 사이드바에 노출되는 섹션 순서와 이름 */
export const SECTIONS = [
  { id: 'nestjs', title: 'NestJS' },
  { id: 'js-ts', title: 'JS / TS' },
  { id: 'interview', title: '면접 질문' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export interface DocMeta {
  section: SectionId;
  slug: string; // e.g. "module"
  href: string; // e.g. "/nestjs/module"
  title: string;
  description: string;
  order: number;
  minutes: number;
}

export interface Doc extends DocMeta {
  content: string;
}

export interface Heading {
  depth: 2 | 3;
  text: string;
  id: string;
}

export interface NavSection {
  id: SectionId;
  title: string;
  docs: DocMeta[];
}

function readDoc(section: SectionId, file: string): Doc {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, section, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = file.replace(/\.mdx$/, '');
  return {
    section,
    slug,
    href: `/${section}/${slug}`,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    order: Number(data.order ?? 99),
    minutes: Math.max(1, Math.round(content.length / 900)),
    content,
  };
}

export function getAllDocs(): Doc[] {
  return SECTIONS.flatMap(({ id }) => {
    const dir = path.join(CONTENT_DIR, id);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => readDoc(id, f))
      .sort((a, b) => a.order - b.order);
  });
}

export function getNavigation(): NavSection[] {
  const docs = getAllDocs();
  return SECTIONS.map((s) => ({
    ...s,
    docs: docs
      .filter((d) => d.section === s.id)
      .map(({ content: _content, ...meta }) => meta),
  }));
}

export function getDoc(section: string, slug: string): Doc | undefined {
  return getAllDocs().find((d) => d.section === section && d.slug === slug);
}

/** 코드 블록을 제외한 ##, ### 헤딩 추출 (rehype-slug와 동일한 id 규칙) */
export function getHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = stripInlineMarkdown(m[2]);
    headings.push({ depth: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }
  return headings;
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

export interface SearchEntry {
  href: string; // 문서 + #앵커
  docTitle: string;
  section: string;
  heading: string;
  text: string; // 코드 포함 평문
}

/** 헤딩 단위로 문서를 쪼갠 검색 인덱스 */
export function buildSearchIndex(): SearchEntry[] {
  const sectionTitle = Object.fromEntries(SECTIONS.map((s) => [s.id, s.title]));
  const entries: SearchEntry[] = [];

  for (const doc of getAllDocs()) {
    const slugger = new GithubSlugger();
    let current: SearchEntry = {
      href: doc.href,
      docTitle: doc.title,
      section: sectionTitle[doc.section],
      heading: doc.title,
      text: doc.description,
    };
    let inFence = false;

    for (const line of doc.content.split('\n')) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      const m = !inFence && /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) {
        entries.push(current);
        const text = stripInlineMarkdown(m[2]);
        current = {
          href: `${doc.href}#${slugger.slug(text)}`,
          docTitle: doc.title,
          section: sectionTitle[doc.section],
          heading: text,
          text: '',
        };
        continue;
      }
      current.text += ' ' + stripInlineMarkdown(line.replace(/^[>\-*|#\s]+/, ''));
    }
    entries.push(current);
  }

  return entries.map((e) => ({ ...e, text: e.text.replace(/\s+/g, ' ').trim() }));
}

/* ───────── 학습 로드맵 ───────── */
export interface Stage {
  id: string;
  title: string;
  level: string;
  goal: string;
  docs: DocMeta[];
}

export interface PathStep {
  doc: DocMeta;
  stageIndex: number;
  stage: Omit<Stage, 'docs'>;
  index: number; // 단계 안에서의 순서
  count: number; // 단계 안의 문서 수
}

export function getRoadmap(): Stage[] {
  const raw = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'roadmap.json'), 'utf8')) as {
    stages: { id: string; title: string; level: string; goal: string; docs: string[] }[];
  };
  const byKey = new Map(
    getAllDocs().map(({ content: _c, ...meta }) => [`${meta.section}/${meta.slug}`, meta as DocMeta]),
  );
  return raw.stages.map((s) => ({
    ...s,
    docs: s.docs.map((k) => byKey.get(k)).filter((d): d is DocMeta => !!d),
  }));
}

/** 로드맵 순서로 평탄화한 학습 경로 */
export function getLearningPath(): PathStep[] {
  return getRoadmap().flatMap(({ docs, ...stage }, stageIndex) =>
    docs.map((doc, index) => ({ doc, stage, stageIndex, index, count: docs.length })),
  );
}
