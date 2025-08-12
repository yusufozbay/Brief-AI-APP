'use client';

import React, { useState } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface Competitor {
  url: string;
  title: string;
  description: string;
}

export default function Home() {
  const [outline, setOutline] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Competitor[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  const [formData, setFormData] = useState({
    konu_sorgusu: '',
    google_query_fan_out_entities: '',
    extra_subtitles: '',
    extra_faq: '',
    language: 'tr'
  });

  const handleFetchCompetitors = async () => {
    if (!formData.konu_sorgusu.trim()) {
      alert('Lütfen bir konu girin');
      return;
    }

    setIsLoadingCompetitors(true);
    
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: formData.konu_sorgusu,
          language: formData.language
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.competitors && data.competitors.length > 0) {
        setCompetitors(data.competitors);
      } else {
        alert('Bu konu için rakip bulunamadı');
      }
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
      alert('Rakipler getirilirken hata oluştu');
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  const handleCompetitorToggle = (competitor: Competitor) => {
    const isSelected = selectedCompetitors.some(c => c.url === competitor.url);
    
    if (isSelected) {
      setSelectedCompetitors(selectedCompetitors.filter(c => c.url !== competitor.url));
    } else {
      if (selectedCompetitors.length < 3) {
        setSelectedCompetitors([...selectedCompetitors, competitor]);
      } else {
        alert('⚠️ Maximum 3 competitors allowed for optimal performance!');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.konu_sorgusu.trim()) {
      alert('Lütfen bir konu girin');
      return;
    }

    setIsLoading(true);
    setOutline('');
    
    try {
      const requestBody = {
        ...formData,
        selected_competitors: selectedCompetitors,
      };

      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.outline) {
        setOutline(data.outline);
      } else {
        throw new Error('No outline received from API');
      }
    } catch (error) {
      console.error('Brief generation failed:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          alert('İşlem zaman aşımına uğradı. Lütfen daha basit bir konu deneyin.');
        } else {
          alert(`Hata: ${error.message}`);
        }
      } else {
        alert('Bilinmeyen bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Clean Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Brief AI</h1>
          <p className="text-gray-600">Generate comprehensive SEO content briefs with AI</p>
        </div>

        {/* Clean Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What is your content about? *
              </label>
              <input
                type="text"
                value={formData.konu_sorgusu}
                onChange={(e) => setFormData({ ...formData, konu_sorgusu: e.target.value })}
                placeholder="e.g., Kedi maması fiyatları"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.konu_sorgusu.length}/400</p>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords to include
              </label>
              <input
                type="text"
                value={formData.google_query_fan_out_entities}
                onChange={(e) => setFormData({ ...formData, google_query_fan_out_entities: e.target.value })}
                placeholder="vegetables, healthy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.google_query_fan_out_entities.length}/400</p>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone of voice
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>Informative</option>
                <option>Professional</option>
                <option>Casual</option>
                <option>Academic</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output language
              </label>
              <div className="flex gap-2">
                <select 
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="tr">Turkish</option>
                  <option value="en">English</option>
                </select>
                <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Default</option>
                </select>
              </div>
            </div>

            {/* Competitor Analysis */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Competitor Analysis (Optional)</h3>
                <button
                  type="button"
                  onClick={handleFetchCompetitors}
                  disabled={isLoadingCompetitors || !formData.konu_sorgusu.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingCompetitors ? 'Fetching...' : 'Fetch Competitors'}
                </button>
              </div>

              {competitors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Select up to 3 competitors:</p>
                  {competitors.slice(0, 10).map((competitor, index) => {
                    const isSelected = selectedCompetitors.some(c => c.url === competitor.url);
                    return (
                      <div
                        key={index}
                        onClick={() => handleCompetitorToggle(competitor)}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-500 text-white text-xs font-medium rounded-full mr-2">
                                {index + 1}
                              </span>
                              <h4 className="font-medium text-gray-900 text-sm truncate">{competitor.title}</h4>
                              {isSelected && <span className="ml-2 text-blue-600 text-sm">✓</span>}
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{competitor.description}</p>
                            <p className="text-xs text-blue-600 truncate">{competitor.url}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {selectedCompetitors.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-700 text-sm">
                        ✅ Selected {selectedCompetitors.length} competitor{selectedCompetitors.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={isLoading || !formData.konu_sorgusu.trim()}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section with Rich Editor */}
        {outline && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Generated Brief</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
                  Copy
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
                  Export
                </button>
              </div>
            </div>
            
            {/* Rich Text Editor */}
            <div className="border border-gray-300 rounded-md">
              <CodeEditor
                value={outline}
                language="markdown"
                placeholder="Generated content will appear here..."
                onChange={(evn) => setOutline(evn.target.value)}
                padding={15}
                style={{
                  fontSize: 14,
                  backgroundColor: "#f8f9fa",
                  fontFamily: 'ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace',
                  minHeight: '400px'
                }}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600">Generating comprehensive brief...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
