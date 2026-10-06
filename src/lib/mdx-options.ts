import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStudy from './rehype-study';
import rehypePrettyCode, { type Options as PrettyCodeOptions } from 'rehype-pretty-code';

export const prettyCodeOptions: PrettyCodeOptions = {
  // 코드 블록은 항상 어두운 배경이므로 단일 테마만 생성 (HTML 크기 절반 가까이 감소)
  theme: 'github-dark-dimmed',
  keepBackground: false,
  defaultLang: 'plaintext',
};

export const mdxOptions = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [
    rehypeStudy,
    rehypeSlug,
    [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['heading-anchor'] } }],
    [rehypePrettyCode, prettyCodeOptions],
  ],
} as const;
