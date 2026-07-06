import React from 'react';

import { PRIVACY } from '@/features/legal/content';
import { LegalScreen } from '@/features/legal/LegalScreen';

export default function PrivacyScreen() {
  return <LegalScreen doc={PRIVACY} />;
}
