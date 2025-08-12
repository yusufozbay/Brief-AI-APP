'use client';

import React, { useState } from 'react';
import Editor from '@/components/Editor';
import Settings from '@/components/Settings';

interface ModelSettings {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  language: string;
}

interface Competitor {
  url: string;
  title: string;
  description: string;
}

export default function Home() {
  const [outline, setOutline] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Competitor[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  const [settings, setSettings] = useState<ModelSettings>({
    temperature: 0.4,
    topP: 0.9,
    topK: 40,
    maxTokens: 6000,
    language: 'tr'
  });

  const [formData, setFormData] = useState({
    konu_sorgusu: '',
    google_query_fan_out_entities: '',
    extra_subtitles: '',
    extra_faq: '',
    language: 'tr'
  });

  const handleFetchCompetitors = async () => {
    console.log('🎯 User Action: Fetch Competitors button clicked');
    
    if (!formData.konu_sorgusu.trim()) {
      console.warn('⚠️ User Error: Empty query provided');
      alert('Lütfen bir konu girin');
      return;
    }

    console.log('🔄 Starting competitor fetch for query:', formData.konu_sorgusu);
    setIsLoadingCompetitors(true);
    
    try {
      console.log('📡 API Call: Sending request to /api/competitors');
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          konu_sorgusu: formData.konu_sorgusu,
          language: formData.language || 'tr'
        }),
      });

      console.log('📥 API Response received, status:', response.status);
      const data = await response.json();
      console.log('📊 API Response data:', data);
      
      if (data.success) {
        console.log('✅ Competitors fetched successfully:', data.competitors?.length || 0, 'competitors');
        console.log('🏆 Competitor source:', data.source);
        setCompetitors(data.competitors || []);
        
        // Log each competitor for debugging
        data.competitors?.forEach((comp: Competitor, index: number) => {
          console.log(`🏆 Competitor ${index + 1}:`, {
            title: comp.title,
            url: comp.url,
            description: comp.description?.substring(0, 100) + '...'
          });
        });
      } else {
        console.error('❌ Failed to fetch competitors:', data.error);
        alert(`Rakip analizi alınamadı: ${data.error || 'Bilinmeyen hata'}`);
        setCompetitors([]);
      }
    } catch (error) {
      console.error('💥 Network/API Error:', error);
      alert('Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
      setCompetitors([]);
    } finally {
      console.log('🏁 Competitor fetch process completed');
      setIsLoadingCompetitors(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.konu_sorgusu.trim()) {
      alert('Please enter a topic');
      return;
    }

    setIsLoading(true);
    setOutline(null);

    try {
      // Extended timeout for comprehensive Gemini generation (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          language: settings.language,
          selected_competitors: selectedCompetitors
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle different response types
      if (response.status === 504) {
        alert('Request timed out. The brief generation is taking longer than expected. Please try with a simpler topic or try again later.');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        alert('Server returned invalid response. Please try again.');
        return;
      }

      if (data.success) {
        setOutline(data.outline);
      } else {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error generating brief:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Request timed out. Please try with a simpler topic or try again later.');
      } else {
        alert('Failed to generate brief. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchema = async () => {
    try {
      const response = await fetch('/prompts/OUTPUT.schema.json');
      const schema = await response.json();
      return JSON.stringify(schema, null, 2);
    } catch {
      return 'Error loading schema';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Modern Header */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6 tracking-tight">
              ⚡ Brief AI
            </h1>
            <div className="absolute -top-3 -right-3 w-5 h-5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          </div>
          <p className="text-2xl text-slate-300 font-semibold mb-8 max-w-2xl mx-auto leading-relaxed">
            Next-Generation AI Content Strategy Platform
          </p>
          
          {/* Status Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center space-x-3 bg-slate-800/60 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-600/50 shadow-lg">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
              <span className="text-sm font-medium text-slate-200">Gemini 2.5 Pro Active</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-800/60 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-600/50 shadow-lg">
              <div className="w-3 h-3 bg-blue-400 rounded-full shadow-sm shadow-blue-400/50"></div>
              <span className="text-sm font-medium text-slate-200">Turkish SEO Optimized</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-800/60 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-600/50 shadow-lg">
              <div className="w-3 h-3 bg-purple-400 rounded-full shadow-sm shadow-purple-400/50"></div>
              <span className="text-sm font-medium text-slate-200">Max 3 Competitors (Performance)</span>
            </div>
          </div>

          {/* Settings Toggle */}
          <div className="flex justify-center">
            <Settings
              settings={settings}
              onSettingsChange={setSettings}
              showSchema={showSchema}
              onToggleSchema={() => setShowSchema(!showSchema)}
            />
          </div>
        </div>

        {/* Modern Input Form */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-600/30 p-10 mb-12 relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-pink-500/5 animate-pulse"></div>
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div>
              <label htmlFor="konu_sorgusu" className="block text-lg font-bold text-slate-200 mb-4 flex items-center">
                <span className="text-2xl mr-3">🎯</span>
                Topic Query *
              </label>
              <input
                type="text"
                id="konu_sorgusu"
                value={formData.konu_sorgusu}
                onChange={(e) => setFormData({ ...formData, konu_sorgusu: e.target.value })}
                placeholder="e.g., Kedi maması fiyatları"
                className="w-full px-6 py-4 text-slate-100 bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 rounded-2xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 focus:outline-none transition-all duration-300 placeholder-slate-400 text-lg font-medium shadow-lg"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="entities" className="block text-lg font-bold text-slate-200 mb-4 flex items-center">
                <span className="text-2xl mr-3">🌐</span>
                Fan-Out Entities (Optional)
              </label>
              <input
                type="text"
                id="entities"
                value={formData.google_query_fan_out_entities}
                onChange={(e) => setFormData({ ...formData, google_query_fan_out_entities: e.target.value })}
                placeholder="e.g., Royal Canin, Whiskas, premium cat food brands"
                className="w-full px-6 py-4 text-slate-100 bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/30 focus:border-cyan-400 focus:outline-none transition-all duration-300 placeholder-slate-400 text-lg font-medium shadow-lg"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="extra_subtitles" className="block text-lg font-bold text-slate-200 mb-4 flex items-center">
                <span className="text-2xl mr-3">📝</span>
                Extra Subtitles (Optional)
              </label>
              <textarea
                id="extra_subtitles"
                value={formData.extra_subtitles}
                onChange={(e) => setFormData({ ...formData, extra_subtitles: e.target.value })}
                placeholder="e.g., Kedi maması markaları karşılaştırması, En iyi yaş kedi maması, Kedi maması fiyat analizi"
                className="w-full px-6 py-4 text-slate-100 bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 rounded-2xl focus:ring-4 focus:ring-pink-500/30 focus:border-pink-400 focus:outline-none transition-all duration-300 placeholder-slate-400 text-lg font-medium shadow-lg resize-vertical"
                rows={3}
                disabled={isLoading}
              />
              <p className="text-sm text-slate-400 mt-2 ml-1">Enter additional subtitles you want included in the outline, separated by commas</p>
            </div>

            <div>
              <label htmlFor="extra_faq" className="block text-lg font-bold text-slate-200 mb-4 flex items-center">
                <span className="text-2xl mr-3">❓</span>
                Extra FAQ Questions (Optional)
              </label>
              <textarea
                id="extra_faq"
                value={formData.extra_faq}
                onChange={(e) => setFormData({ ...formData, extra_faq: e.target.value })}
                placeholder="e.g., Kedi maması nasıl seçilir?, Hangi yaşta kedi maması verilir?, Kedi maması ne kadar sürede tüketilir?"
                className="w-full px-6 py-4 text-slate-100 bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 rounded-2xl focus:ring-4 focus:ring-green-500/30 focus:border-green-400 focus:outline-none transition-all duration-300 placeholder-slate-400 text-lg font-medium shadow-lg resize-vertical"
                rows={3}
                disabled={isLoading}
              />
              <p className="text-sm text-slate-400 mt-2 ml-1">Enter additional FAQ questions you want included, separated by commas</p>
            </div>

            {/* Modern Competitor Selection */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <label className="block text-lg font-bold text-slate-200 flex items-center">
                  <span className="text-2xl mr-3">🏆</span>
                  Competitor Analysis (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleFetchCompetitors}
                  disabled={isLoadingCompetitors || !formData.konu_sorgusu.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-lg font-bold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105"
                >
                  {isLoadingCompetitors ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Fetching Real Competitors...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="mr-2">🔍</span>
                      Fetch Live SERP Competitors
                    </div>
                  )}
                </button>
              </div>
              
              {competitors.length > 0 && (
                <div className="bg-slate-700/30 backdrop-blur-xl border border-slate-600/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-black text-slate-100 flex items-center">
                        🏆 Live SERP Competitors
                        <span className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-2xl shadow-lg">
                          {competitors.length} found
                        </span>
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-slate-300 bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-600/50">
                          <span className="font-bold text-green-400">{selectedCompetitors.length}</span> selected
                        </div>
                        <div className="text-sm text-slate-300 bg-purple-500/20 px-4 py-2 rounded-2xl border border-purple-500/30">
                          <span className="font-bold text-purple-300">Max 3</span> for performance
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-4 mb-6">
                      <p className="text-slate-200 font-medium flex items-center">
                        <span className="text-2xl mr-3">💡</span>
                        <strong className="text-cyan-300">Real-time SERP data:</strong> 
                        <span className="ml-2">These competitors are fetched live from Google Turkey. Select up to 3 for optimal performance.</span>
                      </p>
                    </div>
                    
                      <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
                        {competitors.map((competitor, index) => (
                          <div
                            key={competitor.url}
                            className={`group relative backdrop-blur-sm border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
                              selectedCompetitors.some(c => c.url === competitor.url)
                                ? 'border-green-400/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 shadow-lg shadow-green-500/20'
                                : 'border-slate-600/30 bg-slate-700/20 hover:border-cyan-400/50 hover:bg-slate-700/30'
                            }`}
                          >
                            <div className="flex items-start space-x-6">
                              <div className="flex-shrink-0 pt-1">
                                <input
                                  type="checkbox"
                                  id={competitor.url}
                                  checked={selectedCompetitors.some(c => c.url === competitor.url)}
                                  onChange={(e) => {
                                    console.log(`🎯 User Action: ${e.target.checked ? 'Selected' : 'Deselected'} competitor:`, competitor.title);
                                    if (e.target.checked) {
                                      // CRITICAL: Limit to 3 competitors max to prevent timeout scaling
                                      if (selectedCompetitors.length < 3) {
                                        setSelectedCompetitors([...selectedCompetitors, competitor]);
                                      } else {
                                        alert('⚠️ Maximum 3 competitors allowed for optimal performance and to prevent timeouts!');
                                      }
                                    } else {
                                      setSelectedCompetitors(selectedCompetitors.filter(c => c.url !== competitor.url));
                                    }
                                  }}
                                  className="h-6 w-6 text-green-500 focus:ring-green-500/30 focus:ring-4 border-slate-500 rounded-lg transition-all duration-200 bg-slate-600/50"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-black rounded-2xl shadow-lg">
                                    {index + 1}
                                  </span>
                                  <label 
                                    htmlFor={competitor.url} 
                                    className="text-lg font-bold text-slate-100 cursor-pointer hover:text-cyan-300 transition-colors line-clamp-2"
                                  >
                                    {competitor.title}
                                  </label>
                                </div>
                                
                                <div className="mb-3">
                                  <a 
                                    href={competitor.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline font-medium break-all flex items-center"
                                  >
                                    <span className="mr-2">🔗</span>
                                    {competitor.url}
                                  </a>
                                </div>
                                
                                <p className="text-sm text-slate-300 leading-relaxed">
                                  {competitor.description}
                                </p>
                              </div>
                            </div>
                            
                            {selectedCompetitors.some(c => c.url === competitor.url) && (
                              <div className="absolute top-3 right-3">
                                <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl p-2 shadow-lg shadow-green-500/30">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  
                    {selectedCompetitors.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
                        <p className="text-slate-200 font-bold flex items-center">
                          <span className="text-xl mr-2">✅</span>
                          {selectedCompetitors.length} competitors selected and will be included in brief analysis
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modern Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white py-6 px-8 rounded-3xl hover:from-purple-700 hover:via-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-black text-xl shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-105 relative overflow-hidden"
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 animate-pulse"></div>
              
              <div className="relative z-10">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-white mr-4"></div>
                    <div className="text-center">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">🎯</span>
                        Strategic Analysis & Brief Generation...
                      </div>
                      <div className="text-sm opacity-90 mt-1 font-medium">
                        ⚡ Max 3 competitors • Optimized for speed and quality
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="text-3xl mr-3">🚀</span>
                    <span>Generate Comprehensive Brief</span>
                  </div>
                )}
              </div>
            </button>
          </form>
        </div>

        {/* Schema Display */}
        {showSchema && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">JSON Schema</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {loadSchema()}
            </pre>
          </div>
        )}

        {/* Editor */}
        <Editor
          outline={outline}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
