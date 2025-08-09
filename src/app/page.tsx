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
  const [outline, setOutline] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
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
    google_query_fan_out_entities: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.konu_sorgusu.trim()) {
      alert('Please enter a topic');
      return;
    }

    setIsLoading(true);
    setOutline(null);
    setValidationErrors([]);

    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          language: settings.language
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOutline(data.outline);
        setValidationErrors(data.validation.errors || []);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating brief:', error);
      alert('Failed to generate brief. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchema = async () => {
    try {
      const response = await fetch('/prompts/OUTPUT.schema.json');
      const schema = await response.json();
      return JSON.stringify(schema, null, 2);
    } catch (error) {
      return 'Error loading schema';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="konu_sorgusu" className="block text-sm font-medium text-gray-700 mb-2">
                Topic Query *
              </label>
              <input
                type="text"
                id="konu_sorgusu"
                value={formData.konu_sorgusu}
                onChange={(e) => setFormData({ ...formData, konu_sorgusu: e.target.value })}
                placeholder="e.g., Kedi maması fiyatları"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="entities" className="block text-sm font-medium text-gray-700 mb-2">
                Fan-Out Entities (Optional)
              </label>
              <input
                type="text"
                id="entities"
                value={formData.google_query_fan_out_entities}
                onChange={(e) => setFormData({ ...formData, google_query_fan_out_entities: e.target.value })}
                placeholder="e.g., Royal Canin, Whiskas, premium cat food brands"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Generating Brief...' : 'Generate Brief'}
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
          validationErrors={validationErrors}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
