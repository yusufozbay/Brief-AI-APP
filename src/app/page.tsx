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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Brief AI</h1>
            <p className="text-gray-600 mt-1">Generate comprehensive SEO outlines with Gemini 2.5 Pro</p>
          </div>
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
            showSchema={showSchema}
            onToggleSchema={() => setShowSchema(!showSchema)}
          />
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="konu_sorgusu" className="block text-sm font-semibold text-gray-800 mb-3">
                Topic Query *
              </label>
              <input
                type="text"
                id="konu_sorgusu"
                value={formData.konu_sorgusu}
                onChange={(e) => setFormData({ ...formData, konu_sorgusu: e.target.value })}
                placeholder="e.g., Kedi maması fiyatları"
                className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500 text-base"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="entities" className="block text-sm font-semibold text-gray-800 mb-3">
                Fan-Out Entities (Optional)
              </label>
              <input
                type="text"
                id="entities"
                value={formData.google_query_fan_out_entities}
                onChange={(e) => setFormData({ ...formData, google_query_fan_out_entities: e.target.value })}
                placeholder="e.g., Royal Canin, Whiskas, premium cat food brands"
                className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500 text-base"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="extra_subtitles" className="block text-sm font-semibold text-gray-800 mb-3">
                Extra Subtitles (Optional)
              </label>
              <textarea
                id="extra_subtitles"
                value={formData.extra_subtitles}
                onChange={(e) => setFormData({ ...formData, extra_subtitles: e.target.value })}
                placeholder="e.g., Kedi maması markaları karşılaştırması, En iyi yaş kedi maması, Kedi maması fiyat analizi"
                className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500 text-base resize-vertical"
                rows={3}
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">Enter additional subtitles you want included in the outline, separated by commas</p>
            </div>

            <div>
              <label htmlFor="extra_faq" className="block text-sm font-semibold text-gray-800 mb-3">
                Extra FAQ Questions (Optional)
              </label>
              <textarea
                id="extra_faq"
                value={formData.extra_faq}
                onChange={(e) => setFormData({ ...formData, extra_faq: e.target.value })}
                placeholder="e.g., Kedi maması nasıl seçilir?, Hangi yaşta kedi maması verilir?, Kedi maması ne kadar sürede tüketilir?"
                className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500 text-base resize-vertical"
                rows={3}
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">Enter additional FAQ questions you want included, separated by commas</p>
            </div>

            {/* Competitor Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-800">
                  Competitor Analysis (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleFetchCompetitors}
                  disabled={isLoadingCompetitors || !formData.konu_sorgusu.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isLoadingCompetitors ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Fetching...
                    </div>
                  ) : (
                    'Fetch Competitors'
                  )}
                </button>
              </div>
              
              {competitors.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      🏆 Rakip Analizi
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {competitors.length} rakip bulundu
                      </span>
                    </h3>
                    <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                      {selectedCompetitors.length} seçili
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4 bg-white/50 p-3 rounded-lg border-l-4 border-blue-400">
                    💡 <strong>Gerçek SERP verisi:</strong> Aşağıdaki rakipler Google&apos;dan canlı olarak çekilmiştir. 
                    Analiz için dahil etmek istediğiniz rakipleri seçin.
                  </p>
                  
                  <div className="grid gap-3 max-h-80 overflow-y-auto pr-2">
                    {competitors.map((competitor, index) => (
                      <div
                        key={competitor.url}
                        className={`group relative bg-white border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
                          selectedCompetitors.some(c => c.url === competitor.url)
                            ? 'border-green-400 bg-green-50 shadow-sm'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              id={competitor.url}
                              checked={selectedCompetitors.some(c => c.url === competitor.url)}
                              onChange={(e) => {
                                console.log(`🎯 User Action: ${e.target.checked ? 'Selected' : 'Deselected'} competitor:`, competitor.title);
                                if (e.target.checked) {
                                  setSelectedCompetitors([...selectedCompetitors, competitor]);
                                } else {
                                  setSelectedCompetitors(selectedCompetitors.filter(c => c.url !== competitor.url));
                                }
                              }}
                              className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded-md transition-colors"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {index + 1}
                              </span>
                              <label 
                                htmlFor={competitor.url} 
                                className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-700 transition-colors line-clamp-2"
                              >
                                {competitor.title}
                              </label>
                            </div>
                            
                            <div className="mb-2">
                              <a 
                                href={competitor.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                              >
                                🔗 {competitor.url}
                              </a>
                            </div>
                            
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {competitor.description}
                            </p>
                          </div>
                        </div>
                        
                        {selectedCompetitors.some(c => c.url === competitor.url) && (
                          <div className="absolute top-2 right-2">
                            <div className="bg-green-500 text-white rounded-full p-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {selectedCompetitors.length > 0 && (
                    <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ {selectedCompetitors.length} rakip seçildi ve brief analizine dahil edilecek
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <div className="text-center">
                    <div>🚀 Generating Comprehensive Brief...</div>
                    <div className="text-sm opacity-90 mt-1">⏱️ This takes 1-2 minutes for best quality</div>
                  </div>
                </div>
              ) : (
                'Generate Brief'
              )}
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
