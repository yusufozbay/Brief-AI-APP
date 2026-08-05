import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Lightbulb, FileText, Target, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { firebaseService, SharedBrief } from '../services/firebase';

const getKeyTakeaways = (brief: SharedBrief) => {
  const suppliedTakeaways = brief.keyTakeaways?.filter(takeaway => takeaway.trim()) || [];
  if (suppliedTakeaways.length >= 3) return suppliedTakeaways.slice(0, 3);

  const derivedTakeaways = brief.contentOutline
    .filter(section => section.level === 'H2')
    .slice(0, 3)
    .map(section => `${section.title} ile daha bilinçli seçimler yapın ve uygulanabilir sonuçlar elde edin.`);

  while (derivedTakeaways.length < 3) {
    derivedTakeaways.push(`${brief.topic} hakkında güvenilir bilgilerle etkili ve sürdürülebilir kararlar verin.`);
  }

  return derivedTakeaways;
};

const getSummaryBox = (brief: SharedBrief) => brief.summaryBox || {
  format: 'bullets' as const,
  title: 'Bu yazıda ne okuyacaksınız?',
  items: getKeyTakeaways(brief)
};

const getImagePrompt = (section: SharedBrief['contentOutline'][number], topic: string) => section.imagePrompt ||
  `Cinematic premium editorial image illustrating ${section.title} for ${topic}, sophisticated composition, rich tactile detail, dramatic natural lighting, photorealistic, high-end magazine photography, no text, no logo, no watermark`;

const getIcebreakerIdeas = (section: SharedBrief['contentOutline'][number], topic: string) => {
  const suppliedIdeas = section.icebreakerIdeas?.filter(idea => idea.trim()).slice(0, 2) || [];
  const fallbackIdeas = [
    `${section.title} ilk bakışta basit görünebilir; doğru yaklaşım ise sonucu doğrudan değiştirir.`,
    `Peki, ${topic} kapsamında bu başlık neden şimdi önem kazanıyor?`
  ];

  return [...suppliedIdeas, ...fallbackIdeas].slice(0, 2);
};

const getReferenceSuggestions = (section: SharedBrief['contentOutline'][number]) => (section.referenceSuggestions || [])
  .filter(reference => {
    try {
      const url = new URL(reference.url);
      return Boolean(reference.title.trim()) && (url.protocol === 'https:' || url.protocol === 'http:');
    } catch {
      return false;
    }
  })
  .filter((reference, index, references) =>
    references.findIndex(item => item.url === reference.url) === index
  )
  .slice(0, 2);

const getGeoOptimization = (brief: SharedBrief) => brief.geoOptimization || {
  directAnswer: `${brief.topic} hakkında ilk paragrafta doğrudan, kısa ve doğrulanabilir bir yanıt verin; ayrıntıları aşağıdaki bölümlerde açın.`,
  keyEntities: [brief.topic, 'Türkiye pazarı', 'güvenilir kaynaklar'],
  claimGuidance: ['Ölçülebilir her iddiayı birincil veya otoriter bir kaynakla destekleyin.', 'Tanımları ve ana sonuçları kısa, tek anlamlı cümlelerle yazın.'],
  citationInstruction: 'Kaynakları ilgili iddianın hemen ardından, yayıncı adı ve doğrudan bağlantıyla belirtin.'
};

const SharedBriefViewer: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const [brief, setBrief] = useState<SharedBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const copyImagePrompt = async (imagePrompt: string, sectionIndex: number) => {
    try {
      await navigator.clipboard.writeText(imagePrompt);
      setCopiedPromptIndex(sectionIndex);
      window.setTimeout(() => setCopiedPromptIndex(currentIndex =>
        currentIndex === sectionIndex ? null : currentIndex
      ), 2000);
    } catch (copyError) {
      console.error('Image prompt could not be copied:', copyError);
    }
  };

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

  const keyTakeaways = getKeyTakeaways(brief);
  const summaryBox = getSummaryBox(brief);

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
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <Target className="w-6 h-6 mr-3 text-indigo-600" />
              AI Destekli Stratejik Analiz
            </h2>
            <p className="text-lg text-gray-600 mb-6">{brief.topic}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Kullanıcı Niyeti</h3>
                <p className="text-gray-700">{brief.userIntent}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Rakip Ton Analizi</h3>
                <p className="text-gray-700">{brief.competitorTone}</p>
              </div>
            </div>
            
            <div className="mt-6 bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Özgün Değer Teklifi (UVP)
              </h3>
              {brief.competitorAnalysisSummary && (
                <p className="text-gray-700 mb-3"><strong>Rekabet Analizi:</strong> {brief.competitorAnalysisSummary}</p>
              )}
              <p className="text-gray-700"><strong>Sizin Benzersiz Değeriniz:</strong> {brief.uniqueValue}</p>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Anahtar Kelime ve Başlık Stratejisi</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Ana Anahtar Kelime</h3>
              <div className="bg-indigo-100 p-3 rounded-lg inline-block">
                <span className="font-mono text-indigo-800">{brief.primaryKeyword}</span>
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
                <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 1 (Tıklama Odaklı)</h3>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-800">{brief.titleSuggestions.clickFocused}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 2 (SEO Odaklı)</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800">{brief.titleSuggestions.seoFocused}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-3">AI Tarafından Geliştirilen Özgün Değer Teklifi</h3>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-gray-700">{brief.metaDescription}</p>
                <p className="text-sm text-gray-500 mt-2">Karakter sayısı: {brief.metaDescription.length}/155</p>
              </div>
            </div>
          </div>

          {/* Content Outline */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Detaylı İçerik Planı
            </h2>

            <section className="brief-summary-box mb-6 border-l-4 border-amber-400 bg-amber-50 p-4" aria-labelledby="content-summary-title">
              <h3 id="content-summary-title" className="font-semibold text-gray-800">{summaryBox.title}</h3>
              {summaryBox.format === 'paragraph' && summaryBox.paragraph ? (
                <p className="mt-3 text-gray-700">{summaryBox.paragraph}</p>
              ) : summaryBox.format === 'labeled' && summaryBox.labeledItems?.length ? (
                <dl className="mt-3 space-y-2 text-gray-700">
                  {summaryBox.labeledItems.slice(0, 5).map((item, index) => (
                    <div key={index}><dt className="inline font-semibold">{item.label}: </dt><dd className="inline">{item.value}</dd></div>
                  ))}
                </dl>
              ) : (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                  {(summaryBox.items?.slice(0, 5) || keyTakeaways).map((takeaway, index) => <li key={index}>{takeaway}</li>)}
                </ul>
              )}
            </section>

            {brief.coverImagePrompt && (
              <div className="brief-image-prompt mb-6 overflow-hidden rounded-lg border border-[#B8BEC7] border-l-4 border-l-violet-400 bg-[#ECEDEF] text-slate-800">
                <div className="flex items-center justify-between gap-3 border-b border-[#B8BEC7] bg-[#D9DDE2] px-3 py-2">
                  <h3 className="text-sm font-semibold text-violet-950">🖼️ Kapak Görseli Promptu</h3>
                  <button type="button" onClick={() => copyImagePrompt(brief.coverImagePrompt || '', -1)} className="inline-flex shrink-0 items-center gap-1.5 rounded border border-violet-300 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-200">
                    {copiedPromptIndex === -1 ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedPromptIndex === -1 ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-words p-3 text-sm leading-6">{brief.coverImagePrompt}</pre>
              </div>
            )}
            
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
                  {section.level === 'H2' && (
                    <div className="brief-icebreaker mb-3 border-l-4 border-indigo-200 bg-indigo-50 p-3">
                      <h4 className="mb-2 text-sm font-semibold text-indigo-900">✍️ Giriş Fikirleri:</h4>
                      <div className="space-y-1 text-sm italic text-indigo-800">
                        {getIcebreakerIdeas(section, brief.topic).map((idea, ideaIndex) => (
                          <p key={ideaIndex}>"{idea}"</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {section.keyInfo && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-2">
                      <p className="text-sm text-yellow-800">
                        <strong>💡 Kilit Bilgi:</strong> {section.keyInfo}
                      </p>
                    </div>
                  )}
                  {section.storytelling && (
                    <div className="brief-story bg-[#F7F5FC] rounded-lg p-3">
                      <p className="text-sm text-purple-800">
                        <strong>📖 Hikayeleştirme:</strong> {section.storytelling}
                      </p>
                    </div>
                  )}
                  {section.level === 'H2' && (
                    <div className="brief-image-prompt mt-3 overflow-hidden rounded-lg border border-[#B8BEC7] border-l-4 border-l-violet-400 bg-[#ECEDEF] text-slate-800">
                      <div className="flex items-center justify-between gap-3 border-b border-[#B8BEC7] bg-[#D9DDE2] px-3 py-2">
                        <h4 className="text-sm font-semibold text-violet-950">🎨 Görsel Prompt</h4>
                        <button
                          type="button"
                          onClick={() => copyImagePrompt(getImagePrompt(section, brief.topic), index)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-violet-300 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-200"
                        >
                          {copiedPromptIndex === index ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedPromptIndex === index ? 'Kopyalandı' : 'Kopyala'}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-words p-3 text-sm leading-6">{getImagePrompt(section, brief.topic)}</pre>
                    </div>
                  )}
                  {section.level === 'H2' && getReferenceSuggestions(section).length === 2 && (
                    <div className="brief-reference-suggestions mt-3 border-l-4 border-cyan-400 bg-cyan-50 p-3">
                      <p className="text-sm font-semibold text-cyan-950">🔗 Referans Önerisi:</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {getReferenceSuggestions(section).map(reference => (
                          <li key={reference.url}>
                            <a
                              href={reference.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-cyan-800 underline decoration-cyan-400 underline-offset-2 hover:text-cyan-950"
                            >
                              {reference.title}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {section.level === 'H2' && section.geoTip && (
                    <p className="brief-geo-tip mt-3 text-sm">🤖 GEO Notu: {section.geoTip}</p>
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const geoOptimization = getGeoOptimization(brief);
              return (
                <section className="brief-geo-box mt-6 border-l-4 border-teal-500 bg-teal-50 p-4" aria-labelledby="geo-optimization-title">
                  <h3 id="geo-optimization-title" className="text-base font-semibold text-teal-950">🤖 GEO Optimizasyon Kutusu</h3>
                  <p className="mt-2 text-sm text-teal-900">{geoOptimization.directAnswer}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {geoOptimization.keyEntities.slice(0, 5).map(entity => <span key={entity} className="bg-white px-2 py-1 text-xs font-medium text-teal-900">{entity}</span>)}
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-teal-900">
                    {geoOptimization.claimGuidance.slice(0, 3).map(guidance => <li key={guidance}>{guidance}</li>)}
                  </ul>
                  <p className="mt-3 text-sm font-medium text-teal-950">Kaynak yerleşimi: {geoOptimization.citationInstruction}</p>
                </section>
              );
            })()}
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

          {/* Quality Checklist */}
          {brief.qualityChecklist && brief.qualityChecklist.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                Yayın Öncesi Kalite Kontrol Listesi
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {brief.qualityChecklist.map((checkItem, index) => (
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
          )}

          {/* Footer */}
          <div className="text-center py-8">
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
