import type { Config } from 'tailwindcss';

// 스타일 대부분은 globals.css의 디자인 토큰(CSS 변수)으로 관리한다
const config: Config = {
  darkMode: ['class', ':root:not(.light)'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        fg: 'var(--fg)',
        sub: 'var(--sub)',
        faint: 'var(--faint)',
        ink: 'var(--ink)',
        done: 'var(--done)',
      },
      fontFamily: {
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
};

export default config;
