import React, { useState } from 'react';
import { Search, Target, Users, TrendingUp, FileText, CheckCircle, Lightbulb, BarChart3, ArrowRight, Share2, Copy, ExternalLink } from 'lucide-react';
import CompetitorSelector from './CompetitorSelector';
import { CompetitorSelection } from '../types/serp';
import { geminiAIService } from '../services/geminiAI';
import { firebaseService } from '../services/firebase';

interface AnalysisResult {
  topic: string;
  userIntent: string;
  competitorTone: string;
  uniqueValue: string;
  competitorAnalysisSummary: string;
  competitorStrengths: string[];
  contentGaps: string[];
  dominantTone: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleSuggestions: {
    clickFocused: string;
    seoFocused: string;
  };
  metaDescription: string;
  contentOutline: OutlineSection[];
  faqSection: FAQ[];
  schemaStrategy: {
    mainSchema: string;
    supportingSchemas: string[];
    reasoning: string;
  };
  qualityChecklist: Array<{
    item: string;
    status: boolean;
    note: string;
  }>;
  competitorAnalysis?: {
    competitorCount: number;
    averageWordCount: number;
    commonHeadings: string[];
    dominantTone: string;
    competitorStrengths: string[];
    competitorWeaknesses: string[];
    contentGaps: string[];
    recommendedUVP: string;
  };
}

interface OutlineSection {
  level: 'H1' | 'H2' | 'H3';
  title: string;
  content: string;
  keyInfo?: string;
  storytelling?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const SEOAnalyzer: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [entities, setEntities] = useState('');
  const [currentStep, setCurrentStep] = useState<'input' | 'competitors' | 'results'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorSelection[]>([]);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const proceedToCompetitorSelection = () => {
    if (!topic.trim()) return;
    setCurrentStep('competitors');
  };

  const goBackToInput = () => {
    setCurrentStep('input');
    setResult(null);
    setSelectedCompetitors([]);
    setCompetitorAnalysis(null);
  };

  const goBackToCompetitors = () => {
    setCurrentStep('competitors');
    setResult(null);
  };

  const handleCompetitorsSelected = (competitors: CompetitorSelection[]) => {
    setSelectedCompetitors(competitors);
    generateFinalAnalysis();
  };

  const handleAnalysisComplete = (analysisData: any) => {
    setCompetitorAnalysis(analysisData);
    
    // If AI analysis is available, use it directly
    if (analysisData.aiGeneratedStrategy) {
      const aiResult = analysisData.aiGeneratedStrategy;
      aiResult.competitorAnalysis = analysisData;
      setResult(aiResult);
      setCurrentStep('results');
      setIsAnalyzing(false);
    } else {
      // Fallback to basic analysis
      generateFinalAnalysis(analysisData);
    }
  };

  const generateFinalAnalysis = async (competitorData?: any) => {
    setCurrentStep('results');
    setIsAnalyzing(true);
    
    try {
      // Use Gemini AI for actual content strategy generation
      const geminiResult = await geminiAIService.generateContentStrategy(
        topic,
        selectedCompetitors,
        competitorData
      );
      
      // Convert Gemini result to our AnalysisResult format
      const analysisResult: AnalysisResult = {
        topic: geminiResult.topic,
        userIntent: geminiResult.userIntent,
        competitorTone: geminiResult.competitorTone,
        uniqueValue: geminiResult.uniqueValue,
        competitorAnalysisSummary: geminiResult.competitorAnalysisSummary,
        competitorStrengths: geminiResult.competitorStrengths,
        contentGaps: geminiResult.contentGaps,
        dominantTone: geminiResult.dominantTone,
        primaryKeyword: geminiResult.primaryKeyword,
        secondaryKeywords: geminiResult.secondaryKeywords,
        titleSuggestions: geminiResult.titleSuggestions,
        metaDescription: geminiResult.metaDescription,
        contentOutline: geminiResult.contentOutline,
        faqSection: geminiResult.faqSection,
        schemaStrategy: geminiResult.schemaStrategy,
        qualityChecklist: geminiResult.qualityChecklist,
      };

      if (competitorData) {
        analysisResult.competitorAnalysis = competitorData;
      }
      
      setResult(analysisResult);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Gemini AI analysis failed:', error);
      setIsAnalyzing(false);
      // Could show an error message to the user here
    }
  };

  const resetAnalysis = () => {
    setCurrentStep('input');
    setTopic('');
    setEntities('');
    setResult(null);
    setSelectedCompetitors([]);
    setCompetitorAnalysis(null);
    setShareUrl(null);
    setShowShareModal(false);
  };

  const handleShareBrief = async () => {
    if (!result) return;
    
    setIsSharing(true);
    try {
      const briefId = await firebaseService.shareBrief({
        topic: result.topic,
        userIntent: result.userIntent,
        competitorTone: result.competitorTone,
        uniqueValue: result.uniqueValue,
        competitorAnalysisSummary: result.competitorAnalysisSummary,
        competitorStrengths: result.competitorStrengths,
        contentGaps: result.contentGaps,
        dominantTone: result.dominantTone,
        primaryKeyword: result.primaryKeyword,
        secondaryKeywords: result.secondaryKeywords,
        titleSuggestions: result.titleSuggestions,
        metaDescription: result.metaDescription,
        contentOutline: result.contentOutline,
        faqSection: result.faqSection,
        schemaStrategy: result.schemaStrategy,
        qualityChecklist: result.qualityChecklist,
        competitorAnalysis: result.competitorAnalysis
      });
      
      const url = `${window.location.origin}/share/${briefId}`;
      setShareUrl(url);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error sharing brief:', error);
      alert('Paylaşım sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link kopyalandı!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Link kopyalanamadı. Lütfen manuel olarak kopyalayın.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Brief AI</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create AI-Driven Content Briefs
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${currentStep === 'input' ? 'text-indigo-600' : currentStep === 'competitors' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'input' ? 'bg-indigo-600 text-white' : currentStep === 'competitors' || currentStep === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Konu Girişi</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${currentStep === 'competitors' ? 'text-indigo-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'competitors' ? 'bg-indigo-600 text-white' : currentStep === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Rakip Seçimi</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${currentStep === 'results' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'results' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Strateji Analizi</span>
            </div>
          </div>
        </div>

        {/* Step 1: Input Form */}
        {currentStep === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-2" />
                  Ana Konu / Anahtar Kelime
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: dijital pazarlama, seo optimizasyonu, içerik pazarlaması"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  İlgili Varlıklar (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={entities}
                  onChange={(e) => setEntities(e.target.value)}
                  placeholder="Markalar, kişiler, yerler (virgülle ayırın)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={proceedToCompetitorSelection}
              disabled={!topic.trim()}
              className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              SERP Analizi ve Rakip Seçimine Geç
            </button>
          </div>
        )}

        {/* Competitor Selection Step */}
        {currentStep === 'competitors' && (
          <div>
            <div className="mb-6">
              <button
                onClick={goBackToInput}
                className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Konu Girişine Geri Dön
              </button>
            </div>
            <CompetitorSelector
              keyword={topic}
              onCompetitorsSelected={handleCompetitorsSelected}
              onAnalysisComplete={generateFinalAnalysis}
            />
          </div>
        )}

        {/* Results */}
        {currentStep === 'results' && result && (
          <div className="space-y-8">
            {/* Back Navigation and Share Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBackToCompetitors}
                  className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Rakip Seçimine Geri Dön
                </button>
                <button
                  onClick={resetAnalysis}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  ← Yeni Analiz Başlat
                </button>
              </div>
              <div className="flex items-center space-x-4">
                {isAnalyzing && (
                  <div className="flex items-center text-indigo-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                    Strateji oluşturuluyor...
                  </div>
                )}
                {!isAnalyzing && (
                  <button
                    onClick={handleShareBrief}
                    disabled={isSharing}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {isSharing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Share2 className="w-4 h-4 mr-2" />
                    )}
                    Briefi Paylaş
                  </button>
                )}
              </div>
            </div>

            {/* Strategic Overview */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 text-indigo-600" />
                AI Destekli Stratejik Analiz
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Kullanıcı Niyeti</h3>
                  <p className="text-gray-700">{result.userIntent}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Rakip Ton Analizi</h3>
                  <p className="text-gray-700">{result.competitorTone}</p>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                  Özgün Değer Teklifi (UVP)
                </h3>
                <p className="text-gray-700 mb-3"><strong>Rekabet Analizi:</strong> {result.competitorAnalysisSummary}</p>
                <p className="text-gray-700"><strong>Sizin Benzersiz Değeriniz:</strong> {result.uniqueValue}</p>
              </div>
            </div>

            {/* Competitor Analysis Results */}
            {result.competitorAnalysis && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Detaylı Rakip Analizi Sonuçları</h2>
                
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.competitorAnalysis.competitorCount}</div>
                    <div className="text-sm text-gray-600">Analiz Edilen Rakip</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.competitorAnalysis.averageWordCount}</div>
                    <div className="text-sm text-gray-600">Ortalama Kelime Sayısı</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{result.dominantTone}</div>
                    <div className="text-sm text-gray-600">Baskın İçerik Tonu</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rakiplerin Güçlü Yönleri</h3>
                    <ul className="space-y-2">
                      {result.competitorStrengths.slice(0, 5).map((strength: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Tespit Edilen İçerik Boşlukları</h3>
                    <ul className="space-y-2">
                      {result.contentGaps.map((gap: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <Lightbulb className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords & Titles */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Anahtar Kelime ve Başlık Stratejisi</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Ana Anahtar Kelime</h3>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <span className="font-mono text-indigo-800">{result.primaryKeyword}</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-800 mb-3">İkincil Anahtar Kelimeler</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.secondaryKeywords.map((keyword, index) => (
                      <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 1 (Tıklama Odaklı)</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800">{result.titleSuggestions.clickFocused}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 2 (SEO Odaklı)</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-800">{result.titleSuggestions.seoFocused}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                    AI Tarafından Geliştirilen Özgün Değer Teklifi
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-700">{result.metaDescription}</p>
                  <p className="text-sm text-gray-500 mt-2">Karakter sayısı: {result.metaDescription.length}/155</p>
                  {selectedCompetitors.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Seçilen Rakipler:</strong> {selectedCompetitors.map(c => c.domain).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content Outline */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-indigo-600" />
                Detaylı İçerik Planı
              </h2>
              
              <div className="space-y-6">
                {result.contentOutline.map((section, index) => (
                  <div key={index} className="border-l-4 border-indigo-400 pl-6">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-mono mr-3">
                        {section.level}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                    </div>
                    <p className="text-gray-700 mb-3">{section.content}</p>
                    
                    {section.keyInfo && (
                      <div className="bg-yellow-50 p-3 rounded-lg mb-2 border-l-4 border-yellow-400">
                        <p className="text-sm"><strong>💡 Kilit Bilgi:</strong> {section.keyInfo}</p>
                      </div>
                    )}
                    
                    {section.storytelling && (
                      <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                        <p className="text-sm"><strong>✍️ Hikayeleştirme:</strong> {section.storytelling}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Sıkça Sorulan Sorular (SSS)</h2>
              <div className="space-y-4">
                {result.faqSection.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">{faq.question}</h3>
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Schema Strategy */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Yapısal Veri (Schema.org) Stratejisi</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Ana Schema</h3>
                  <div className="bg-indigo-100 p-4 rounded-lg">
                    <span className="font-mono text-indigo-800">{result.schemaStrategy.mainSchema}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Destekleyici Schemalar</h3>
                  <div className="space-y-2">
                    {result.schemaStrategy.supportingSchemas.map((schema, index) => (
                      <div key={index} className="bg-gray-100 p-2 rounded">
                        <span className="font-mono text-gray-700">{schema}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Gerekçe</h3>
                <p className="text-gray-700">{result.schemaStrategy.reasoning}</p>
              </div>
            </div>

            {/* Quality Checklist */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                Yayın Öncesi Kalite Kontrol Listesi
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {result.qualityChecklist.map((checkItem, index) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${checkItem.status ? 'text-green-500' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <span className="text-gray-700 font-medium">{checkItem.item}</span>
                      {checkItem.note && (
                        <p className="text-sm text-gray-600 mt-1">{checkItem.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Modal */}
            {showShareModal && shareUrl && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Brief Başarıyla Paylaşıldı!</h3>
                    <p className="text-gray-600 mb-6">Brief'iniz paylaşıma hazır. Aşağıdaki linki kopyalayarak istediğiniz kişilerle paylaşabilirsiniz.</p>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate flex-1 mr-2">{shareUrl}</span>
                        <button
                          onClick={() => copyToClipboard(shareUrl)}
                          className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Kopyala
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => window.open(shareUrl, '_blank')}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Önizle
                      </button>
                      <button
                        onClick={() => setShowShareModal(false)}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOAnalyzer;