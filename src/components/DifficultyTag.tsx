import React from 'react';

import { colors } from '@/theme';
import { difficultyMeta } from '@/lib/format';
import type { Difficulty } from '@/types/database.types';
import { Pill } from './Pill';

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  const meta = difficultyMeta[difficulty];
  return <Pill label={meta.label} color={colors.difficulty[difficulty]} />;
}
