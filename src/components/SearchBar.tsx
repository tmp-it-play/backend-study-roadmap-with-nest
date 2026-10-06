'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchEntry } from '@/lib/content';
import { SearchIcon } from './Icons';

interface Result {
  entry: SearchEntry;
  score: number;
  snippet: string;
}

function search(index: SearchEntry[], query: string): Result[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const results: Result[] = [];
  for (const entry of index) {
    const heading = entry.heading.toLowerCase();
    const title = entry.docTitle.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    let ok = true;
    for (const t of terms) {
      const inHeading = heading.includes(t);
      const inTitle = title.includes(t);
      const inText = text.includes(t);
      if (!inHeading && !inTitle && !inText) {
        ok = false;
        break;
      }
      score += (inHeading ? 10 : 0) + (inTitle ? 4 : 0) + (inText ? 1 : 0);
    }
    if (!ok) continue;

    const pos = text.indexOf(terms[0]);
    const start = Math.max(0, pos - 40);
    const snippet =
      pos >= 0
        ? (start > 0 ? '…' : '') + entry.text.slice(start, start + 140) + '…'
        : entry.text.slice(0, 140);
    results.push({ entry, score, snippet });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  return <>{text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}

export default function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (index ? search(index, query) : []), [index, query]);

  const openModal = useCallback(() => {
    setOpen(true);
    if (!index) {
      fetch('/search-index.json')
        .then((r) => r.json())
        .then(setIndex)
        .catch(() => setIndex([]));
    }
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openModal();
      } else if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery('');
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active].entry.href);
    }
  };

  return (
    <>
      <button type="button" onClick={openModal} className="search-btn" aria-label="검색">
        <SearchIcon />
        <span>개념 검색</span>
        <kbd>⌘K</kbd>
      </button>

      {open && (
        <div className="modal" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="문서 검색">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-in">
              <SearchIcon size={16} />
              <input
                id="search-input"
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="예: 클로저, forwardRef, infer, 이벤트 루프"
                autoComplete="off"
              />
              <kbd>esc</kbd>
            </div>
            <ul className="results">
              {!index && <li className="empty">검색 목록을 불러오는 중입니다</li>}
              {index && !query && <li className="empty">찾을 개념을 입력하세요. 위아래 화살표로 이동, Enter로 열기</li>}
              {index && query && results.length === 0 && (
                <li className="empty">“{query}”가 들어간 내용이 없습니다. 다른 표현으로 찾아보세요.</li>
              )}
              {results.map((r, i) => (
                <li key={r.entry.href + i}>
                  <button
                    type="button"
                    className={i === active ? 'active' : ''}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.entry.href)}
                  >
                    <div className="path">
                      {r.entry.section} / {r.entry.docTitle}
                    </div>
                    <div className="h">
                      <Highlight text={r.entry.heading} query={query} />
                    </div>
                    <div className="s">
                      <Highlight text={r.snippet} query={query} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
