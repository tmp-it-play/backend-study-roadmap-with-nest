'use client';

export default function MenuButton() {
  return (
    <button
      type="button"
      className="icon-btn menu-btn"
      aria-label="메뉴 열기"
      onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
