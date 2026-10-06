import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import CodeBlock from '@/components/CodeBlock';
import TableOfContents from '@/components/TableOfContents';
import ReadingProgress from '@/components/ReadingProgress';
import DocFinish from '@/components/DocFinish';
import SimMount from '@/components/SimMount';
import DocTools from '@/components/DocTools';
import DocPager from '@/components/DocPager';
import { getAllDocs, getDoc, getHeadings, getLearningPath } from '@/lib/content';
import { mdxOptions } from '@/lib/mdx-options';
import { skylineSVG } from '@/lib/scenery';

const SKYLINE = skylineSVG(19);

type Props = { params: { slug: string[] } };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: [d.section, d.slug] }));
}

export function generateMetadata({ params }: Props): Metadata {
  const doc = getDoc(params.slug[0], params.slug[1]);
  return doc ? { title: doc.title, description: doc.description } : {};
}

const components = {
  pre: CodeBlock,
  table: (props: React.ComponentProps<'table'>) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

export default function DocPage({ params }: Props) {
  if (params.slug.length !== 2) notFound();
  const doc = getDoc(params.slug[0], params.slug[1]);
  if (!doc) notFound();

  const path = getLearningPath();
  const k = path.findIndex((p) => p.doc.href === doc.href);
  const step = path[k];
  const prev = k > 0 ? path[k - 1] : undefined;
  const next = k >= 0 ? path[k + 1] : undefined;
  const headings = getHeadings(doc.content);
  const sections = headings.filter((h) => h.depth === 2).length;

  return (
    <>
      <ReadingProgress />
      <section className="doc-hero">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <div className="doc-hero-inner">
          <p className="crumb">
            <Link href="/">로드맵</Link>
            {step && (
              <>
                <span className="sep">/</span>
                <span>
                  {step.stageIndex + 1}단계 {step.stage.title}
                </span>
                <span className="sep">/</span>
                <span>
                  {step.index + 1}/{step.count}
                </span>
              </>
            )}
          </p>
          <div className="sign doc-sign">
            {step && (
              <small>
                {step.stageIndex + 1}단계 · {step.stage.level}
              </small>
            )}
            <h1>{doc.title}</h1>
          </div>
          {doc.description && <p className="desc">{doc.description}</p>}
          <p className="meta">
            읽는 데 약 {doc.minutes}분 · 섹션 {sections}개
          </p>
        </div>
        <div dangerouslySetInnerHTML={{ __html: SKYLINE }} />
      </section>
      <div className="wrap">
        <article className="article">
          <div className="prose">
            <MDXRemote source={doc.content} components={components} options={{ mdxOptions: mdxOptions as never }} />
          </div>
          <SimMount />
          <DocTools href={doc.href} />

          <DocFinish href={doc.href} />

          <DocPager
            prev={prev && { href: prev.doc.href, title: prev.doc.title }}
            next={next && { href: next.doc.href, title: next.doc.title }}
            nextLabel={
              step && next && next.stage.id !== step.stage.id
                ? `다음 구간 · ${next.stageIndex + 1}단계 ${next.stage.title}`
                : '다음 정류장'
            }
          />
        </article>
        <TableOfContents headings={headings} />
      </div>
    </>
  );
}
