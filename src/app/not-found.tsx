import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="home">
      <h1>문서를 찾을 수 없습니다</h1>
      <p className="lead">
        주소가 바뀌었거나 없는 문서입니다. <Link href="/" style={{ color: 'var(--ink)' }}>로드맵으로 돌아가기</Link>
      </p>
    </div>
  );
}
