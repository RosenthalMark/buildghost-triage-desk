import React, { useState } from 'react';
import { TriageDeskPage } from './TriageDeskPage';

export default function App() {
  const [isDemoMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'live') return false;
    if (params.get('mode') === 'demo') return true;
    return true; // Default to interactive sandbox for zero-friction evaluation
  });

  return (
    <div className="app-root">
      <TriageDeskPage isDemoMode={isDemoMode} />
    </div>
  );
}
