import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Do_Hyeon, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import SearchBar from '@/components/SearchBar';
import MenuButton from '@/components/MenuButton';
import { getRoadmap } from '@/lib/content';
import './globals.css';

const noto = Noto_Sans_KR({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto',
  display: 'swap',
});
const dohyeon = Do_Hyeon({ weight: '400', subsets: ['latin'], variable: '--font-dohyeon', display: 'swap' });
const mono = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: '백엔드 학습 로드맵', template: '%s · 백엔드 학습 로드맵' },
  description: 'JavaScript 기초부터 TypeScript, NestJS 설계, 면접 대비까지 순서대로 공부하는 학습 노트',
};

export const viewport: Viewport = {
  themeColor: '#094d24',
  viewportFit: 'cover',
};

// 저장된 본문 글자 크기를 첫 화면 전에 적용 (깜빡임 방지)
const scaleScript = `try{var s=JSON.parse(localStorage.getItem('prose-scale'));if(s)document.documentElement.style.setProperty('--prose-scale',s)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const stages = getRoadmap();

  return (
    <html lang="ko" className={`${noto.variable} ${dohyeon.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scaleScript }} />
      </head>
      <body>
        <header className="top">
          <div className="top-inner">
            <MenuButton />
            <Link className="brand" href="/">
              백엔드 <b>로드맵</b>
            </Link>
            <SearchBar />
            <div className="spacer" />
          </div>
        </header>
        <Sidebar stages={stages} />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
