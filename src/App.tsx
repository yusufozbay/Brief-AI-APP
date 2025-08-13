import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SEOAnalyzer from './components/SEOAnalyzer';
import SharedBriefViewer from './components/SharedBriefViewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SEOAnalyzer />} />
        <Route path="/share/:briefId" element={<SharedBriefViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
