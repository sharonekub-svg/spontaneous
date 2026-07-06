import React from 'react';

import { TERMS } from '@/features/legal/content';
import { LegalScreen } from '@/features/legal/LegalScreen';

export default function TermsScreen() {
  return <LegalScreen doc={TERMS} />;
}
