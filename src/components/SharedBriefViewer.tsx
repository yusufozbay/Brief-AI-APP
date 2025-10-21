import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Lightbulb, FileText, Target } from 'lucide-react';
import { firebaseService, SharedBrief } from '../services/firebase';

const SharedBriefViewer: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const [brief, setBrief] = useState<SharedBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add NOINDEX meta tag for shared briefs
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    // Cleanup function to remove meta tag when component unmounts
    return () => {
      const existingMeta = document.querySelector('meta[name="robots"]');
      if (existingMeta) {
        document.head.removeChild(existingMeta);
      }
    };
  }, []);

  useEffect(() => {
    const loadBrief = async () => {
      if (!briefId) {
        setError('Brief ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        const briefData = await firebaseService.getBrief(briefId);
        if (briefData) {
          setBrief(briefData);
        } else {
          setError('Brief bulunamadı veya artık mevcut değil');
        }
      } catch (err) {
        console.error('Error loading brief:', err);
        setError('Brief yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadBrief();
  }, [briefId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Brief yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Brief Bulunamadı</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Mosanta Brief AI</h1>
          </div>
          <p className="text-lg text-gray-600">Paylaşılan İçerik Brief'i</p>
        </div>

        {/* Brief Content */}
        <div className="space-y-8">
          {/* Topic and Overview */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Target className="w-6 h-6 mr-3 text-indigo-600" />
              {brief.topic}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Kullanıcı Niyeti</h3>
                <p className="text-gray-600">{brief.userIntent}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Rakip Ton Analizi</h3>
                <p className="text-gray-600">{brief.competitorTone}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-2">Özgün Değer Teklifi</h3>
              <p className="text-gray-600">{brief.uniqueValue}</p>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Anahtar Kelime ve Başlık Stratejisi</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Ana Anahtar Kelime</h3>
              <div className="bg-indigo-50 rounded-lg p-3 inline-block">
                <span className="text-indigo-800 font-medium">{brief.primaryKeyword}</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">İkincil Anahtar Kelimeler</h3>
              <div className="flex flex-wrap gap-2">
                {brief.secondaryKeywords.map((keyword, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Başlık Önerisi 1 (Tıklama Odaklı)</h3>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-green-800">{brief.titleSuggestions.clickFocused}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Başlık Önerisi 2 (SEO Odaklı)</h3>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-800">{brief.titleSuggestions.seoFocused}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-2">Meta Açıklama</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{brief.metaDescription}</p>
              </div>
            </div>
          </div>

          {/* Content Outline */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Detaylı İçerik Planı
            </h2>
            
            <div className="space-y-6">
              {brief.contentOutline.map((section, index) => (
                <div key={index} className="border-l-4 border-indigo-200 pl-6">
                  <div className="flex items-center mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-3 ${
                      section.level === 'H1' ? 'bg-indigo-100 text-indigo-800' :
                      section.level === 'H2' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {section.level}
                    </span>
                    <h3 className="font-semibold text-gray-800">{section.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-3">{section.content}</p>
                  {section.keyInfo && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-2">
                      <p className="text-sm text-yellow-800">
                        <strong>💡 Kilit Bilgi:</strong> {section.keyInfo}
                      </p>
                    </div>
                  )}
                  {section.storytelling && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-800">
                        <strong>📖 Hikayeleştirme:</strong> {section.storytelling}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Sıkça Sorulan Sorular (SSS)</h2>
            
            <div className="space-y-4">
              {brief.faqSection.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Schema Strategy */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-indigo-600" />
              Schema Stratejisi
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Ana Schema</h3>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-indigo-800">{brief.schemaStrategy.mainSchema}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Destekleyici Schema'lar</h3>
                <div className="space-y-2">
                  {brief.schemaStrategy.supportingSchemas.map((schema, index) => (
                    <div key={index} className="bg-gray-100 rounded-lg p-2">
                      <p className="text-gray-700 text-sm">{schema}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-2">Gerekçe</h3>
              <p className="text-gray-600">{brief.schemaStrategy.reasoning}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              Bu brief {new Date(brief.sharedAt).toLocaleDateString('tr-TR')} tarihinde paylaşıldı
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Kendi Brief'inizi Oluşturun
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedBriefViewer;
