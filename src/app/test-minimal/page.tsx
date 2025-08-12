'use client';

import { useState } from 'react';

export default function TestMinimal() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    brief: string;
    markdown: string;
    query: string;
    language: string;
    source: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🚀 Testing minimal API with query:', query);
      
      const response = await fetch('/api/brief-minimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          konu_sorgusu: query,
          language: 'tr'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      console.log('✅ Minimal API Success:', data);
      setResult(data);
      
    } catch (err) {
      console.error('❌ Minimal API Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🧪 Minimal Gemini Test
          </h1>
          
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your topic (e.g., 'kahve')"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '🔄 Testing...' : '🚀 Test Gemini'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold">❌ Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-green-800 font-semibold">✅ Success!</h3>
                <p className="text-green-700">
                  Generated {result.brief?.length || 0} characters of content
                </p>
                <p className="text-sm text-green-600">
                  Source: {result.source} | Query: {result.query}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">📝 Generated Brief:</h3>
                <div 
                  className="prose max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: result.brief }}
                />
              </div>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-semibold text-gray-800 cursor-pointer">
                  🔍 Raw Markdown
                </summary>
                <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
                  {result.markdown}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
