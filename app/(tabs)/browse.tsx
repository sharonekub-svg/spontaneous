import { Redirect } from 'expo-router';
import React from 'react';

// Missions browsing is temporarily disabled while the mission list is being
// re-curated (proof-first missions with explicit "what to film" instructions).
// The previous screen lives in git history — restore it from there when the
// new mission list ships, and re-enable the tab in _layout.tsx.
export default function BrowseScreen() {
  return <Redirect href="/(tabs)" />;
}
