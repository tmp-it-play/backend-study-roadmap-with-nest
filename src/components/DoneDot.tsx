'use client';

import { useLearned } from '@/lib/progress';
import { CheckIcon } from './Icons';

export default function DoneDot({ href }: { href: string }) {
  const { learned } = useLearned();
  const on = learned.includes(href);
  return <span className={`dot ${on ? 'on' : ''}`}>{on && <CheckIcon />}</span>;
}
