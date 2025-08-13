'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Competitor {
  url: string;
  title: string;
  description: string;
}

export default function Home() {
  // State for the Mosanta AI-style UI
  const [query, setQuery] = useState('');
  const [subtitles, setSubtitles] = useState('');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [, setShareId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Manual fetch competitors function
  const fetchCompetitors = async () => {
    if (!query.trim()) {
      console.log('❌ Query is empty');
      alert('Lütfen önce bir konu/sorgu girin.');
      return;
    }

    console.log('🔍 Fetching competitors for query:', query);
    setIsLoadingCompetitors(true);
    setCompetitors([]);
    setSelectedCompetitors([]);

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Competitors data received:', data);
      
      if (data.competitors && Array.isArray(data.competitors)) {
        // Limit to 10 competitors as requested
        const limitedCompetitors = data.competitors.slice(0, 10);
        setCompetitors(limitedCompetitors);
        console.log('✅ Competitors loaded:', limitedCompetitors.length);
      } else {
        console.log('❌ No competitors found in response');
        alert('Bu sorgu için rakip bulunamadı.');
      }
    } catch (error) {
      console.error('❌ Error fetching competitors:', error);
      alert('Rakipler yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoadingCompetitors(false);
    }
  };



  // Toggle competitor selection (allow multiple selections)
  const toggleCompetitorSelection = (url: string) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  };

  // Generate brief function with auto-scroll
  const generateBrief = async () => {
    if (!query.trim()) {
      console.log('❌ Query is empty');
      return;
    }

    console.log('🚀 Generating brief for query:', query);
    console.log('📝 Subtitles:', subtitles);
    console.log('🏆 Selected competitors:', selectedCompetitors.length);
    
    setIsGeneratingBrief(true);
    setGeneratedBrief('');
    setShareId(null);

    // Auto-scroll to results section
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const selectedCompetitorData = competitors.filter(comp => selectedCompetitors.includes(comp.url));
      
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          konu_sorgusu: query,
          subtitles: subtitles,
          competitors: selectedCompetitorData,
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📝 Brief data received:', data);
      
      // Handle both 'brief' and 'outline' response properties for compatibility
      const briefContent = data.brief || data.outline;
      if (briefContent) {
        setGeneratedBrief(briefContent);
        console.log('✅ Brief generated successfully');
      } else {
        console.log('❌ No brief content received');
        setGeneratedBrief('Brief oluşturulamadı. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('❌ Error generating brief:', error);
      setGeneratedBrief('Brief oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // Share analysis function
  const shareAnalysis = async () => {
    if (!generatedBrief) {
      console.log('❌ No brief to share');
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          subtitles,
          competitors: selectedCompetitors,
          brief: generatedBrief,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.shareId) {
        setShareId(data.shareId);
        // Copy to clipboard
        const shareUrl = `${window.location.origin}/share/${data.shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        console.log('✅ Share URL copied to clipboard:', shareUrl);
        alert('Paylaşım linki panoya kopyalandı!');
      }
    } catch (error) {
      console.error('❌ Error sharing analysis:', error);
      alert('Paylaşım linki oluşturulurken hata oluştu.');
    } finally {
      setIsSharing(false);
    }
  };

  // Prevent hydration mismatch by showing loading state until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        <div className="border-b border-gray-200 bg-white flex-shrink-0">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Brief AI</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header - Mosanta AI Style */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-900 font-bold text-lg">✨</span>
                </div>
                <h1 className="text-3xl font-bold">Brief AI</h1>
              </div>
              <p className="text-blue-100 text-lg">SEO Content Analyzer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">🌐</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Content Analysis</h2>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-white text-sm font-bold">i</span>
              </div>
              <div>
                <h3 className="text-blue-900 font-medium mb-1">Gelişmiş Rakip Analizi</h3>
                <p className="text-blue-700 text-sm">
                  Bu analiz ilk 10 organik rakibinizi tespit eder ve rakip içeriklerini analiz ederek size kapsamlı öneriler sunar.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Konu/Sorgu Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konu/Sorgu
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Örn: iPhone 15 inceleme, kedi maması karşılaştırması"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white text-gray-900 placeholder-gray-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400">🌐</span>
                </div>
              </div>
            </div>

            {/* Rakipleri Çek Button */}
            <div>
              <button
                onClick={fetchCompetitors}
                disabled={!query.trim() || isLoadingCompetitors}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
                  !query.trim() || isLoadingCompetitors
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoadingCompetitors ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rakipler Yükleniyor...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔍</span>
                    Rakipleri Çek
                  </>
                )}
              </button>
            </div>

            {/* Subtitles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitles (İsteğe Bağlı)
              </label>
              <textarea
                value={subtitles}
                onChange={(e) => setSubtitles(e.target.value)}
                placeholder="Örn: Kedi maması markaları karşılaştırması, En iyi yaş kedi maması, Kedi maması fiyat analizi"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white text-gray-900 placeholder-gray-500 resize-none"
              />
            </div>

            {/* Competitors Section */}
            {competitors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rakip İçerikler
                </label>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    {competitors.length} rakip bulundu. Analiz için istediğiniz kadarını seçin:
                  </p>
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                    {competitors.map((competitor, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          selectedCompetitors.includes(competitor.url)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => toggleCompetitorSelection(competitor.url)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            selectedCompetitors.includes(competitor.url)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {selectedCompetitors.includes(competitor.url) ? '✓' : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                              {competitor.title}
                            </h4>
                            <p className="text-xs text-blue-600 truncate mt-1">{competitor.url}</p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{competitor.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Seçilen: {selectedCompetitors.length} rakip
                  </p>
                </div>
              </div>
            )}

            {/* Generate Brief Button */}
            <button
              onClick={generateBrief}
              disabled={!query.trim() || isGeneratingBrief}
              className={`w-full py-4 px-6 rounded-lg font-medium text-base transition-all flex items-center justify-center ${
                !query.trim() || isGeneratingBrief
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isGeneratingBrief ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Brief Oluşturuluyor... (1-2 dakika)
                </>
              ) : (
                <>
                  <span className="mr-2">⚡</span>
                  Brief Oluştur
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {(isGeneratingBrief || generatedBrief) && (
          <div ref={resultsRef} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Share Button */}
            {generatedBrief && !isGeneratingBrief && (
              <div className="flex justify-end mb-6">
                <button
                  onClick={shareAnalysis}
                  disabled={isSharing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center"
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Paylaşılıyor...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📤</span>
                      Analizi Paylaş
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">📊</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">İçerik Stratejisi ve SEO Geliştirme Raporu</h2>
            </div>

            {isGeneratingBrief ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-lg mb-2">Brief oluşturuluyor...</p>
                  <p className="text-gray-500 text-sm">Bu işlem 1-2 dakika sürebilir</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-lg max-w-none">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>Analiz Edilen İçerik:</strong>
                  </p>
                  <p className="text-blue-700 font-mono text-sm bg-blue-100 px-3 py-2 rounded">
                    {query}
                  </p>
                </div>
                
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-gray-200 pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">{children}</h3>,
                      p: ({children}) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-gray-700">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-4">{children}</blockquote>,
                    }}
                  >
                    {generatedBrief}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
