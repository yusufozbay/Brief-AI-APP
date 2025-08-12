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
  const [showCompetitors, setShowCompetitors] = useState(false);
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
    extra_faq: ''
  });

  const fetchCompetitors = async () => {
    if (!formData.konu_sorgusu.trim()) {
      alert('Please enter a topic first');
      return;
    }

    setIsLoadingCompetitors(true);
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          konu_sorgusu: formData.konu_sorgusu,
          language: settings.language
        })
      });

      const data = await response.json();
      if (data.success) {
        setCompetitors(data.competitors);
        setShowCompetitors(true);
      } else {
        alert(`Error fetching competitors: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
      alert('Failed to fetch competitors. Please try again.');
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  const toggleCompetitorSelection = (competitor: Competitor) => {
    setSelectedCompetitors(prev => {
      const isSelected = prev.some(c => c.url === competitor.url);
      if (isSelected) {
        return prev.filter(c => c.url !== competitor.url);
      } else {
        return [...prev, competitor];
      }
    });
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
      // Add timeout to frontend request (25 seconds to match Netlify limit)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
                  onClick={fetchCompetitors}
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
              
              {showCompetitors && competitors.length > 0 && (
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Select competitors to include in your brief analysis ({selectedCompetitors.length} selected):
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {competitors.map((competitor) => (
                      <div
                        key={competitor.url}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedCompetitors.some(c => c.url === competitor.url)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                        onClick={() => toggleCompetitorSelection(competitor)}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={selectedCompetitors.some(c => c.url === competitor.url)}
                            onChange={() => toggleCompetitorSelection(competitor)}
                            className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {competitor.title}
                            </h4>
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {competitor.url}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {competitor.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  Generating Brief...
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
