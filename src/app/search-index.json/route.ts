import { buildSearchIndex } from '@/lib/content';

// 빌드 시 정적 JSON으로 생성됨
export const dynamic = 'force-static';

export function GET() {
  return Response.json(buildSearchIndex());
}
