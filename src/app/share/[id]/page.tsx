'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SharedAnalysis {
  id: string;
  query: string;
  subtitles: string;
  competitors: string[];
  brief: string;
  createdAt: string;
}

export default function SharedAnalysisPage() {
  const params = useParams();
  const shareId = params.id as string;
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      try {
        const response = await fetch(`/api/share?id=${shareId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Analiz bulunamadı. Link geçersiz olabilir.');
          } else {
            setError('Analiz yüklenirken hata oluştu.');
          }
          return;
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (error) {
        console.error('❌ Error fetching shared analysis:', error);
        setError('Analiz yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSharedAnalysis();
    }
  }, [shareId]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">❌</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-900 font-bold text-lg">✨</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Brief AI</h1>
                <p className="text-blue-100 text-sm">Paylaşılan Analiz</p>
              </div>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
            >
              Yeni Analiz Oluştur
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Analysis Info */}
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">İçerik Stratejisi ve SEO Geliştirme Raporu</h2>
          </div>

          {/* Analysis Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-blue-800 text-sm mb-1">
                  <strong>Analiz Edilen İçerik:</strong>
                </p>
                <p className="text-blue-700 font-mono text-sm bg-blue-100 px-3 py-2 rounded">
                  {analysis.query}
                </p>
              </div>
              <div>
                <p className="text-blue-800 text-sm mb-1">
                  <strong>Oluşturulma Tarihi:</strong>
                </p>
                <p className="text-blue-700 text-sm">
                  {new Date(analysis.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            {analysis.subtitles && (
              <div className="mt-4">
                <p className="text-blue-800 text-sm mb-1">
                  <strong>Ek Başlıklar:</strong>
                </p>
                <p className="text-blue-700 text-sm">
                  {analysis.subtitles}
                </p>
              </div>
            )}

            {analysis.competitors.length > 0 && (
              <div className="mt-4">
                <p className="text-blue-800 text-sm mb-1">
                  <strong>Analiz Edilen Rakipler:</strong>
                </p>
                <p className="text-blue-700 text-sm">
                  {analysis.competitors.length} rakip içerik analiz edildi
                </p>
              </div>
            )}
          </div>

          {/* Brief Content */}
          <div className="prose prose-lg max-w-none">
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
                {analysis.brief}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">
                Bu analiz Brief AI tarafından oluşturulmuştur
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <span className="mr-2">⚡</span>
                Kendi Analizinizi Oluşturun
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
