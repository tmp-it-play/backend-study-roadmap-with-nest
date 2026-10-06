'use client';

import { useRef, useState, type ComponentPropsWithoutRef } from 'react';

type PreProps = ComponentPropsWithoutRef<'pre'> & { 'data-language'?: string };

/** rehype-pretty-code가 만든 <pre>에 언어 표시와 복사 버튼을 붙인다 */
export default function CodeBlock({ children, ...props }: PreProps) {
  const ref = useRef<HTMLPreElement>(null);
  const [label, setLabel] = useState('복사');
  const lang = props['data-language'];

  const copy = async () => {
    const pre = ref.current;
    if (!pre) return;
    try {
      await navigator.clipboard.writeText(pre.innerText);
      setLabel('복사됨');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      setLabel('선택됨');
    }
    setTimeout(() => setLabel('복사'), 1500);
  };

  return (
    <div className="code">
      <div className="code-bar">
        <span>{lang && lang !== 'plaintext' ? lang : 'text'}</span>
        <button type="button" onClick={copy}>
          {label}
        </button>
      </div>
      <pre ref={ref} {...props}>
        {children}
      </pre>
    </div>
  );
}
