import type { Difficulty, Mood } from '@/types/database.types';

export const moodMeta: Record<Mood, { label: string; emoji: string; blurb: string }> = {
  not_today: { label: 'Not today', emoji: '😌', blurb: 'Keep it gentle and easy.' },
  a_little: { label: 'A little', emoji: '🙂', blurb: 'A small nudge out the door.' },
  pretty_spontaneous: {
    label: 'Pretty spontaneous',
    emoji: '😎',
    blurb: 'Bring on a real challenge.',
  },
  crazy: { label: 'Give me something crazy', emoji: '🔥', blurb: 'No limits. Let’s go big.' },
};

export const moodOrder: Mood[] = ['not_today', 'a_little', 'pretty_spontaneous', 'crazy'];

export const difficultyMeta: Record<Difficulty, { label: string; emoji: string }> = {
  easy: { label: 'Easy', emoji: '🟢' },
  medium: { label: 'Medium', emoji: '🔵' },
  hard: { label: 'Hard', emoji: '🟠' },
  extreme: { label: 'Extreme', emoji: '🔴' },
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
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th');
}
