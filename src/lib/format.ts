import type { Difficulty, Mood } from '@/types/database.types';

export const moodMeta: Record<Mood, { label: string; emoji: string; blurb: string }> = {
  not_today: { label: 'לא היום', emoji: '', blurb: 'נשמור על קליל ועדין — משימה קלה (2 נק׳).' },
  a_little: { label: 'קצת', emoji: '', blurb: 'דחיפה קטנה החוצה — משימה בינונית (5 נק׳).' },
  pretty_spontaneous: {
    label: 'די ספונטני',
    emoji: '',
    blurb: 'אתגר אמיתי — משימה קשה (10 נק׳).',
  },
  crazy: {
    label: 'תנו לי משהו מטורף',
    emoji: '',
    blurb: 'בלי גבולות — משימה קיצונית (20 נק׳).',
  },
};

export const moodOrder: Mood[] = ['not_today', 'a_little', 'pretty_spontaneous', 'crazy'];

export const difficultyMeta: Record<Difficulty, { label: string; emoji: string }> = {
  easy: { label: 'קל', emoji: '' },
  medium: { label: 'בינוני', emoji: '' },
  hard: { label: 'קשה', emoji: '' },
  extreme: { label: 'קיצוני', emoji: '' },
};

export function compactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'הרגע';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע׳`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(iso).toLocaleDateString();
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th');
}
