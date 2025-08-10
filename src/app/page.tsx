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

export default function Home() {
  const [outline, setOutline] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
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
          language: settings.language
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
