import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import SEOAnalyzer from './components/SEOAnalyzer';
import SharedBriefViewer from './components/SharedBriefViewer';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <Router>
      <button
        type="button"
        onClick={() => setIsDarkMode(currentMode => !currentMode)}
        className="theme-toggle fixed right-5 top-5 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
        aria-label={isDarkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
        title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <Routes>
        <Route path="/" element={<SEOAnalyzer />} />
        <Route path="/share/:briefId" element={<SharedBriefViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
