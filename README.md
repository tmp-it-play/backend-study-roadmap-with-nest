# 백엔드 학습 로드맵

JavaScript 기초부터 TypeScript, NestJS 설계, 면접 대비까지 8단계로 공부하는 개인 학습 사이트입니다.

배포 주소: https://backend-study-roadma.vercel.app

## 특징

- **로드맵 홈**: 하늘·도시 아래 지그재그 도로를 따라 단계(고속도로 표지판)를 지나갑니다. 자동차는 스크롤을 따라 달리고, 끌어서 다른 단계로 옮길 수도 있습니다.
- **공부하기 좋은 문서**: 한눈에 보기 → 비유 → 개념 → 코드 → 셀프 체크 순서. 비유·포인트·주의는 도로 표지 색으로 구분합니다.
- **인터랙티브 시뮬레이터**: 이벤트 루프, NestJS 요청 파이프라인, DI 컨테이너, Promise 조합 메서드, Provider Scope를 단계별로 직접 실행해 봅니다.
- **면접 대비**: 단골 질문과 "직접 구현해 보세요" 꼬리 질문. 답은 접혀 있어 먼저 스스로 답해 볼 수 있습니다.
- **학습 도구**: 검색(⌘K), 목차, 읽은 비율, 이어 읽기, 학습 완료 체크와 진도율, ← → 문서 이동, 글자 크기 조절.

## 기술 스택

Next.js 14 (App Router) · TypeScript · Tailwind CSS · MDX (next-mdx-remote) · rehype-pretty-code (Shiki)

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 열립니다. 프로덕션 빌드는 `npm run build && npm start`.

## 콘텐츠 수정

- 문서: `src/content/{nestjs,js-ts,interview}/*.mdx`
- 로드맵 단계 구성: `src/content/roadmap.json`
- MDX 작성 규칙
  - 콜아웃: `> **비유**: …`, `> **포인트**: …`, `> **주의**: …`, `> **꼬리 질문**: …`
  - 질문과 답: `**Q. 질문**` 다음 문단을 `**A.** 답`으로 시작하면 다음 질문 전까지 "답 확인하기"로 접힙니다. `(단골)`을 붙이면 배지가 달립니다.
  - 시뮬레이터: 코드 블록 언어를 `sim`으로 하고 이름을 적습니다. (예: event-loop, request-pipeline, di-resolve, promise-combinators, provider-scope)

## 단일 HTML 빌드 (선택)

같은 콘텐츠와 스타일로 서버 없이 열리는 HTML 한 파일을 만듭니다.

```bash
node scripts/build-artifact.mjs   # → artifact/study-notes.html
```

## 배포

Vercel에 연결되어 있습니다. `npx vercel deploy --prod`로 배포하거나, 이 저장소를 Vercel 프로젝트에 연결하면 push할 때마다 자동 배포됩니다.
