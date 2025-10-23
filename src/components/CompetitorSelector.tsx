import React, { useState, useEffect } from 'react';
import { Globe, Search, CheckCircle, Circle, ExternalLink, TrendingUp } from 'lucide-react';
import { CompetitorSelection } from '../types/serp';
import { dataForSEOService } from '../services/dataForSEO';
import { geminiAIService } from '../services/geminiAI';

interface CompetitorSelectorProps {
  keyword: string;
  onCompetitorsSelected: (competitors: CompetitorSelection[]) => void;
  onAnalysisComplete: (analysisData: any) => void;
}

const CompetitorSelector: React.FC<CompetitorSelectorProps> = ({
  keyword,
  onCompetitorsSelected,
  onAnalysisComplete
}) => {
  const [serpResults, setSerpResults] = useState<CompetitorSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorSelection[]>([]);



  useEffect(() => {
    if (keyword) {
      fetchSERPResults();
    }
  }, [keyword]);

  const fetchSERPResults = async () => {
    setLoading(true);
    try {
      const results = await dataForSEOService.fetchSERPResults(keyword);
      setSerpResults(results);
      
      // Automatically select all competitors and notify parent component
      const selectedCompetitors = results.filter(result => result.selected);
      setSelectedCompetitors(selectedCompetitors);
      onCompetitorsSelected(selectedCompetitors);
    } catch (error) {
      console.error('SERP fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompetitorSelection = (index: number) => {
    const updatedResults = [...serpResults];
    updatedResults[index].selected = !updatedResults[index].selected;
    setSerpResults(updatedResults);

    const selected = updatedResults.filter(result => result.selected);
    setSelectedCompetitors(selected);
    onCompetitorsSelected(selected);
  };

  const analyzeSelectedCompetitors = async () => {
    if (selectedCompetitors.length === 0) return;

    setAnalyzing(true);
    try {
      // First, get basic competitor analysis
      const basicAnalysisPromises = selectedCompetitors.map(competitor =>
        dataForSEOService.analyzeCompetitorContent(competitor.url)
      );

      const basicAnalyses = await Promise.all(basicAnalysisPromises);
      
      // Create combined basic analysis
      const basicCombinedAnalysis = {
        competitorCount: selectedCompetitors.length,
        averageWordCount: Math.round(basicAnalyses.reduce((sum, a) => sum + a.wordCount, 0) / basicAnalyses.length),
        commonHeadings: basicAnalyses.flatMap(a => a.headings),
        dominantTone: basicAnalyses[0]?.tone || "Profesyonel",
        competitorStrengths: basicAnalyses.flatMap(a => a.strengths),
        competitorWeaknesses: basicAnalyses.flatMap(a => a.weaknesses),
        contentGaps: [
          "Türkiye'ye özel veriler eksik",
          "Güncel 2024-2025 trendleri yetersiz", 
          "Adım adım uygulama rehberi eksik",
          "Gerçek kullanıcı deneyimleri az",
          "Yerel vaka çalışmaları eksik",
          "Görsel içerik kalitesi düşük"
        ],
        recommendedUVP: `${keyword} konusunda Türkiye'ye özel güncel veriler, uzman röportajları ve adım adım uygulama rehberi ile seçilen rakiplerden ayrışma`
      };

      // Now use Gemini AI for advanced analysis
      const aiAnalysis = await geminiAIService.generateContentStrategy(
        keyword,
        selectedCompetitors,
        basicCombinedAnalysis
      );

      // Combine both analyses
      const finalAnalysis = {
        ...basicCombinedAnalysis,
        aiGeneratedStrategy: aiAnalysis
      };

      onAnalysisComplete(finalAnalysis);
    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to basic analysis only
      const fallbackAnalysis = {
        competitorCount: selectedCompetitors.length,
        averageWordCount: 2000,
        commonHeadings: ["Giriş", "Tanım", "Avantajlar", "Uygulama", "Sonuç"],
        dominantTone: "Profesyonel",
        competitorStrengths: ["Kapsamlı bilgi", "Görsel destekli anlatım"],
        competitorWeaknesses: ["Güncel veri eksikliği", "Yerel örnekler az"],
        contentGaps: [
          "Türkiye'ye özel veriler eksik",
          "Güncel 2024-2025 trendleri yetersiz",
          "Yerel vaka çalışmaları eksik"
        ],
        recommendedUVP: `${keyword} konusunda Türkiye'ye özel güncel veriler ve pratik rehberle rakiplerden ayrışma`
      };
      onAnalysisComplete(fallbackAnalysis);
    } finally {
      setAnalyzing(false);
    }
  };





  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Globe className="w-6 h-6 mr-3 text-indigo-600" />
          SERP Analizi ve Rakip Seçimi
        </h2>

      </div>





      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            <strong>"{keyword}"</strong> için Google.com.tr organik sonuçları
          </p>
          <button
            onClick={fetchSERPResults}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">SERP sonuçları getiriliyor...</span>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {serpResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  result.selected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleCompetitorSelection(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {result.selected ? (
                        <CheckCircle className="w-5 h-5 text-indigo-600 mr-3" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className="text-sm font-medium text-gray-500 mr-2">
                        #{result.position}
                      </span>
                      <span className="text-sm text-gray-500">{result.domain}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {result.snippet}
                    </p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Sayfayı Görüntüle
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCompetitors.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">
                Seçilen Rakipler ({selectedCompetitors.length})
              </h3>
              <p className="text-sm text-gray-600">
                Bu rakipler detaylı analiz için seçildi
              </p>
            </div>
            <button
              onClick={analyzeSelectedCompetitors}
              disabled={analyzing}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  AI ile Analiz Ediliyor...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI Destekli Rakip Analizi
                </>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedCompetitors.map((competitor, index) => (
              <div key={index} className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-indigo-800">
                    #{competitor.position}
                  </span>
                  <span className="text-xs text-indigo-600">{competitor.domain}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {competitor.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorSelector;