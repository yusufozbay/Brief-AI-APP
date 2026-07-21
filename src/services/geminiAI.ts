import { CompetitorSelection } from '../types/serp';

interface GeminiAnalysisResult {
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
  keyTakeaways: string[];
  contentOutline: Array<{
    level: 'H1' | 'H2' | 'H3';
    title: string;
    content: string;
    keyInfo?: string;
    storytelling?: string;
    imagePrompt?: string;
    icebreakerIdeas?: string[];
  }>;
  faqSection: Array<{
    question: string;
    answer: string;
  }>;
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
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    thoughtsTokens?: number;
    cachedTokens?: number;
  };
}

class GeminiAIService {
  private isGenerating: boolean = false;
  private currentModelIndex: number = 0;
  private workerBridgeUrl: string = ((import.meta.env as Record<string, string | undefined>).WORKER_BRIDGE_URL || import.meta.env.VITE_WORKER_BRIDGE_URL || '').replace(/\/$/, '');
  private modelOrder: string[] = [
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash', 
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ];

  constructor() {
    if (!this.workerBridgeUrl) {
      console.warn('⚠️ WORKER_BRIDGE_URL/VITE_WORKER_BRIDGE_URL is not configured. Gemini calls may fall back to static template.');
    }
  }

  initializeAI(_apiKey: string) {
    // Kept for compatibility. API key is no longer used client-side.
    console.log('ℹ️ initializeAI() is deprecated. Gemini calls now use Cloudflare Worker bridge.');
  }

  private getBridgeBaseUrl(): string {
    if (!this.workerBridgeUrl) {
      throw new Error('WORKER_BRIDGE_URL/VITE_WORKER_BRIDGE_URL is not configured');
    }
    return this.workerBridgeUrl;
  }

  private async callWorkerForContent(prompt: string, model: string): Promise<{ text: string; usageMetadata: any }> {
    const response = await fetch(`${this.getBridgeBaseUrl()}/api/gemini/content-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, model })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Worker Gemini call failed with status ${response.status}`);
    }

    if (!payload?.text || typeof payload.text !== 'string') {
      throw new Error('Worker Gemini response missing text payload');
    }

    return {
      text: payload.text,
      usageMetadata: payload.usageMetadata || null
    };
  }

  private async tryWithFallback<T>(operation: (modelName: string) => Promise<T>): Promise<T> {
    const maxRetries = this.modelOrder.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const modelName = this.modelOrder[this.currentModelIndex % this.modelOrder.length];
        console.log(`🔄 Trying Worker Gemini model: ${modelName} (index: ${this.currentModelIndex})`);
        const result = await operation(modelName);
        console.log(`✅ Operation successful with model ${modelName}`);
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt + 1} failed with model at index ${this.currentModelIndex}:`, error.message);
        
        // Check if it's a quota error
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          console.log(`🔄 Quota exceeded, switching to next model...`);
          this.currentModelIndex = (this.currentModelIndex + 1) % this.modelOrder.length;
          
          // Add delay for quota reset
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
            console.log(`⏳ Waiting ${delay}ms before trying next model...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          // For non-quota errors, try next model immediately
          this.currentModelIndex = (this.currentModelIndex + 1) % this.modelOrder.length;
        }
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async generateContentStrategy(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): Promise<GeminiAnalysisResult> {
    
    // Prevent multiple simultaneous calls
    if (this.isGenerating) {
      console.log('⚠️ Generation already in progress, skipping duplicate call');
      return this.getFallbackAnalysis(topic, selectedCompetitors, competitorAnalysis);
    }
    
    this.isGenerating = true;
    
    console.log('=== GEMINI AI GENERATION DEBUG ===');
    console.log('Worker bridge configured:', !!this.workerBridgeUrl);
    console.log('Topic:', topic);
    console.log('Competitors count:', selectedCompetitors?.length || 0);

    console.log('✅ Using Worker-bridged Gemini with model fallback system for dynamic content strategy generation');

    try {
      const prompt = this.buildAnalysisPrompt(topic, selectedCompetitors, competitorAnalysis);
      console.log('📝 Generated prompt length:', prompt.length);
      console.log('📝 Prompt preview:', prompt.substring(0, 300) + '...');
      
      console.log('🚀 Calling Worker Gemini endpoint with fallback models...');

      const result = await this.tryWithFallback(async (modelName) => {
        const workerResult = await this.callWorkerForContent(prompt, modelName);
        console.log('📊 Token usage metadata:', workerResult.usageMetadata);
        return workerResult;
      });
      
      console.log('📥 Gemini AI response received, length:', result.text.length);
      console.log('📥 Raw response preview:', result.text.substring(0, 500) + '...');
      
      // Parse the JSON response from Gemini (remove markdown code blocks if present)
      let cleanText = result.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🔧 Cleaned text for parsing:', cleanText.substring(0, 200) + '...');
      const analysisResult = JSON.parse(cleanText);
      const permittedHistoricalYears = this.getPermittedHistoricalYears(topic, selectedCompetitors, competitorAnalysis);
      const sanitizedAnalysisResult = this.removeUnspecifiedHistoricalYears(analysisResult, permittedHistoricalYears);
      const enhancedAnalysisResult = this.ensureBriefEnhancements(sanitizedAnalysisResult, topic);
      
      console.log('✅ Successfully parsed Gemini AI response');
      console.log('📊 Generated keywords count:', analysisResult.secondaryKeywords?.length || 0);
      console.log('📊 Generated FAQ count:', analysisResult.faqSection?.length || 0);
      console.log('📊 Sample FAQ question:', analysisResult.faqSection?.[0]?.question || 'No FAQ found');
      console.log('📊 Sample FAQ answer length:', analysisResult.faqSection?.[0]?.answer?.length || 0);
      
      // Calculate token usage
      const tokenUsage = this.calculateTokenUsage(result.usageMetadata, prompt);
      console.log('📊 Calculated token usage:', tokenUsage);
      
      return {
        topic,
        ...enhancedAnalysisResult,
        tokenUsage
      };
    } catch (error) {
      console.error('❌ Gemini AI analysis error:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.log('🔄 Falling back to static template due to error');
      return this.getFallbackAnalysis(topic, selectedCompetitors, competitorAnalysis);
    } finally {
      this.isGenerating = false;
    }
  }

  private getPermittedHistoricalYears(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): Set<string> {
    const sourceText = [
      topic,
      ...selectedCompetitors.flatMap(({ title, snippet }) => [title, snippet]),
      JSON.stringify(competitorAnalysis ?? {})
    ].join(' ');
    const currentYear = new Date().getFullYear();

    return new Set(
      (sourceText.match(/\b(?:19|20)\d{2}\b/g) ?? [])
        .filter(year => Number(year) < currentYear)
    );
  }

  private removeUnspecifiedHistoricalYears(value: any, permittedHistoricalYears: Set<string>): any {
    if (typeof value === 'string') {
      const currentYear = new Date().getFullYear();
      return value
        .replace(/\b(?:19|20)\d{2}\b/g, year =>
          Number(year) < currentYear && !permittedHistoricalYears.has(year) ? '' : year
        )
        .replace(/\(\s*\)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.removeUnspecifiedHistoricalYears(item, permittedHistoricalYears));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.removeUnspecifiedHistoricalYears(item, permittedHistoricalYears)
        ])
      );
    }

    return value;
  }

  private ensureBriefEnhancements(analysisResult: any, topic: string): any {
    const contentOutline = Array.isArray(analysisResult.contentOutline) ? analysisResult.contentOutline : [];
    const h2Sections = contentOutline.filter((section: any) => section?.level === 'H2');
    const generatedTakeaways = Array.isArray(analysisResult.keyTakeaways)
      ? analysisResult.keyTakeaways.filter((takeaway: unknown) => typeof takeaway === 'string' && takeaway.trim())
      : [];
    const fallbackTakeaways = h2Sections.slice(0, 3).map((section: any) =>
      `${section.title} bölümündeki önerilerle bilinçli kararlar alın ve pratik uygulamalar geliştirin.`
    );

    while (fallbackTakeaways.length < 3) {
      fallbackTakeaways.push(`${topic} konusunda güvenilir bilgilerle daha etkili ve sürdürülebilir seçimler yapın.`);
    }

    return {
      ...analysisResult,
      keyTakeaways: generatedTakeaways.length >= 3 ? generatedTakeaways.slice(0, 3) : fallbackTakeaways,
      contentOutline: contentOutline.map((section: any) => {
        const suppliedIcebreakerIdeas = Array.isArray(section?.icebreakerIdeas)
          ? section.icebreakerIdeas.filter((idea: unknown) => typeof idea === 'string' && idea.trim()).slice(0, 2)
          : [];
        const fallbackIcebreakerIdeas = [
          `${section?.title || topic} ilk bakışta basit görünebilir; doğru yaklaşım ise sonucu doğrudan değiştirir.`,
          `Peki, ${topic} kapsamında bu başlık neden şimdi önem kazanıyor?`
        ];

        return {
          ...section,
          imagePrompt: section?.level === 'H2' && !section.imagePrompt
            ? `Cinematic premium editorial image illustrating ${section.title} for ${topic}, sophisticated composition, rich tactile detail, dramatic natural lighting, photorealistic, high-end magazine photography, no text, no logo, no watermark`
            : section.imagePrompt,
          icebreakerIdeas: section?.level === 'H2'
            ? [...suppliedIcebreakerIdeas, ...fallbackIcebreakerIdeas].slice(0, 2)
            : section?.icebreakerIdeas
        };
      })
    };
  }

  /**
   * Calculate token usage from Gemini AI response
   */
  private calculateTokenUsage(usageMetadata: any, prompt: string): {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    thoughtsTokens?: number;
    cachedTokens?: number;
  } {
    try {
      // Extract token counts from usage metadata
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = usageMetadata?.totalTokenCount || 0;
      
      // Extract thinking tokens (if available)
      const thoughtsTokens = usageMetadata?.thinkingTokenCount || 0;
      
      // Extract cached tokens (if available)
      const cachedTokens = usageMetadata?.cachedContentTokenCount || 0;
      
      console.log('📊 Token breakdown:', {
        promptTokens,
        candidatesTokens,
        totalTokens,
        thoughtsTokens,
        cachedTokens,
        promptLength: prompt.length,
        usageMetadata: usageMetadata
      });
      
      return {
        promptTokens,
        candidatesTokens,
        totalTokens: totalTokens || (promptTokens + candidatesTokens),
        thoughtsTokens,
        cachedTokens
      };
    } catch (error) {
      console.error('❌ Error calculating token usage:', error);
      
      // Fallback calculation based on text length
      const estimatedPromptTokens = Math.ceil(prompt.length / 4); // Rough estimation
      const estimatedOutputTokens = 2000; // Estimated output for brief generation
      
      return {
        promptTokens: estimatedPromptTokens,
        candidatesTokens: estimatedOutputTokens,
        totalTokens: estimatedPromptTokens + estimatedOutputTokens,
        thoughtsTokens: 0,
        cachedTokens: 0
      };
    }
  }

  /**
   * Determine content type based on keyword analysis
   */
  private determineContentType(topic: string): string {
    const commercialKeywords = [
      'güneş gözlüğü', 'ayakkabı', 'telefon', 'laptop', 'bilgisayar', 'saat', 'çanta', 'elbise',
      'tişört', 'pantolon', 'mont', 'ceket', 'ayakkabı', 'terlik', 'spor ayakkabı', 'takı',
      'yüzük', 'kolye', 'küpe', 'bilezik', 'parfüm', 'kozmetik', 'makyaj', 'krem', 'şampuan',
      'rayban', 'nike', 'adidas', 'puma', 'converse', 'vans', 'iphone', 'samsung', 'huawei',
      'macbook', 'dell', 'hp', 'asus', 'lenovo', 'rolex', 'omega', 'cartier', 'tiffany',
      'chanel', 'dior', 'gucci', 'prada', 'louis vuitton', 'hermes', 'versace', 'armani'
    ];

    const informationalKeywords = [
      'nedir', 'nasıl', 'neden', 'ne zaman', 'nerede', 'kim', 'hangi', 'rehber', 'kılavuz',
      'ipucu', 'tavsiye', 'öneri', 'yöntem', 'teknik', 'strateji', 'pazarlama', 'seo', 'dijital',
      'yazılım', 'programlama', 'tasarım', 'grafik', 'fotoğraf', 'video', 'müzik', 'sanat',
      'edebiyat', 'tarih', 'coğrafya', 'bilim', 'teknoloji', 'sağlık', 'beslenme', 'spor',
      'eğitim', 'öğrenme', 'geliştirme', 'iş', 'kariyer', 'finans', 'ekonomi', 'hukuk'
    ];

    const topicLower = topic.toLowerCase();
    
    // Check for commercial intent
    const hasCommercialKeyword = commercialKeywords.some(keyword => 
      topicLower.includes(keyword.toLowerCase())
    );
    
    // Check for informational intent
    const hasInformationalKeyword = informationalKeywords.some(keyword => 
      topicLower.includes(keyword.toLowerCase())
    );

    if (hasCommercialKeyword && !hasInformationalKeyword) {
      return `
KATEGORİ/ÜRÜN SAYFASI İÇERİĞİ OLUŞTUR:
- Bu bir ticari/ürün odaklı anahtar kelime
- Kategori sayfası veya ürün sayfası içeriği oluştur
- Ürün özellikleri, fiyat bilgileri, karşılaştırmalar vurgula
- Satın alma niyetini destekleyen içerik yapısı kullan
- Ürün kategorileri, filtreler, sıralama seçenekleri dahil et
- Müşteri yorumları ve değerlendirmeler bölümü ekle
- Satın alma rehberi ve karşılaştırma tabloları oluştur
- Schema: Product, Offer, AggregateRating, Review kullan
- Call-to-action'ları satın alma odaklı yap
- Fiyat karşılaştırmaları ve kampanya bilgileri ekle
`;
    } else {
      return `
BLOG MAKALESİ İÇERİĞİ OLUŞTUR:
- Bu bir bilgilendirici anahtar kelime
- Blog makalesi veya rehber içeriği oluştur
- Eğitici ve bilgilendirici içerik yapısı kullan
- Adım adım rehberler ve nasıl yapılır bölümleri ekle
- Uzman görüşleri ve deneyimleri vurgula
- İpuçları, tavsiyeler ve best practice'ler dahil et
- Schema: Article, HowTo, FAQPage kullan
- Call-to-action'ları bilgi paylaşımı odaklı yap
- Kaynak ve referans bilgileri ekle
`;
    }
  }

  private buildAnalysisPrompt(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): string {
    const competitorInfo = selectedCompetitors.map(comp => 
      `- ${comp.title} (${comp.domain}) - Pozisyon: #${comp.position}\n  Özet: ${comp.snippet}`
    ).join('\n');

    // Enhanced QFO insights integration
    const qfoInsightsText = competitorAnalysis?.qfoInsights ? `
🚀 QUERY FAN-OUT (QFO) ANALİZ VERİLERİ:
- Genişletilmiş sorgular: ${competitorAnalysis.qfoInsights.expandedQueries.join(', ')}
- Sorgu tipi performansı: ${Object.entries(competitorAnalysis.qfoInsights.queryTypePerformance).map(([type, stats]: [string, any]) => `${type}: %${Math.round(stats.successRate * 100)} başarı`).join(', ')}
- Tespit edilen içerik boşlukları: ${competitorAnalysis.qfoInsights.contentGaps.join(', ')}
- Ortak temalar: ${competitorAnalysis.qfoInsights.commonThemes.join(', ')}
- Önerilen strateji: ${competitorAnalysis.qfoInsights.recommendedStrategy}
- Rekabet avantajları: ${competitorAnalysis.qfoInsights.competitiveAdvantages.join(', ')}
- Benzersiz sonuç sayısı: ${competitorAnalysis.qfoInsights.uniqueResults}
- Genel başarı oranı: %${Math.round(competitorAnalysis.qfoInsights.successRate * 100)}

💡 QFO VERİLERİNE DAYALI STRATEJİK ÖNERİLER:
- Bu QFO analizi verilerini kullanarak en etkili içerik stratejisini geliştir
- Genişletilmiş sorguları dikkate alarak anahtar kelime stratejisini optimize et
- Tespit edilen içerik boşluklarını kapatacak içerik planı oluştur
- Rekabet avantajlarını vurgulayan benzersiz değer teklifi geliştir
- Sorgu tipi performansına göre içerik yaklaşımını belirle
- QFO verilerini kullanarak daha kapsamlı ve etkili brief oluştur
` : '';

    return `
Sen 25 yıllık deneyimli bir SEO uzmanı ve içerik stratejistisin. Türkiye pazarı için "${topic}" konusunda QFO (Query Fan-out) analizi verilerini kullanarak en üst düzeyde bir içerik stratejisi oluştur.

ÖNEMLİ: Anahtar kelimeyi analiz et ve içerik türünü belirle:
- Eğer "${topic}" ticari/ürün odaklı ise (örn: "rayban güneş gözlüğü", "iphone 15", "nike ayakkabı") → KATEGORİ/ÜRÜN SAYFASI içeriği oluştur
- Eğer "${topic}" bilgilendirici ise (örn: "seo nedir", "dijital pazarlama", "yazılım geliştirme") → BLOG MAKALESİ içeriği oluştur

RAKIP ANALİZİ:
${competitorInfo}

${competitorAnalysis ? `
DETAYLI RAKİP VERİLERİ:
- Analiz edilen rakip sayısı: ${competitorAnalysis.competitorCount}
- Ortalama kelime sayısı: ${competitorAnalysis.averageWordCount}
- Baskın ton: ${competitorAnalysis.dominantTone}
- İçerik boşlukları: ${competitorAnalysis.contentGaps?.join(', ')}
` : ''}

${qfoInsightsText}

🎯 İÇERİK TÜRÜNE GÖRE STRATEJİ BELİRLE:

${this.determineContentType(topic)}

💡 QFO VERİLERİNE DAYALI STRATEJİK ÖNERİLER:
- Bu QFO analizi verilerini kullanarak en etkili içerik stratejisini geliştir
- Genişletilmiş sorguları dikkate alarak anahtar kelime stratejisini optimize et
- Tespit edilen içerik boşluklarını kapatacak içerik planı oluştur
- Rekabet avantajlarını vurgulayan benzersiz değer teklifi geliştir
- Sorgu tipi performansına göre içerik yaklaşımını belirle
- QFO verilerini kullanarak daha kapsamlı ve etkili brief oluştur

Lütfen aşağıdaki JSON formatında QFO verilerine dayalı en üst düzeyde bir içerik stratejisi oluştur:

{
  "userIntent": "Kullanıcı niyeti analizi (Informational/Transactional/Navigational)",
  "competitorTone": "Rakiplerin baskın ton ve stil analizi - dinamik olarak analiz edilmiş",
  "uniqueValue": "Bu içeriğin rakiplerden farklılaşacağı benzersiz değer teklifi",
  "competitorAnalysisSummary": "Rakip analizi özeti",
  "competitorStrengths": ["Rakiplerin güçlü yönleri listesi - 5 adet dinamik analiz"],
  "contentGaps": ["Tespit edilen içerik boşlukları listesi - 5 adet dinamik analiz"],
  "dominantTone": "Rakiplerin baskın içerik tonu (örn: Profesyonel ve bilgilendirici, Samimi ve yakın, Teknik ve detaylı)",
  "primaryKeyword": "${topic}",
  "secondaryKeywords": ["ikincil anahtar kelime listesi - 8 adet"],
  "titleSuggestions": {
    "clickFocused": "Tıklama odaklı başlık önerisi",
    "seoFocused": "SEO odaklı başlık önerisi"
  },
  "metaDescription": "155 karakter sınırında meta açıklama",
  "keyTakeaways": ["10-15 kelimelik ilk önemli çıkarım", "10-15 kelimelik ikinci önemli çıkarım", "10-15 kelimelik üçüncü önemli çıkarım"],
  "contentOutline": [
    {
      "level": "H1",
      "title": "Ana başlık",
      "content": "Bu bölümde ne anlatılacağının detaylı açıklaması",
      "keyInfo": "Bu bölümün kilit bilgisi"
    },
    {
      "level": "H2", 
      "title": "İkinci seviye başlık",
      "content": "Bu bölümde ne anlatılacağının detaylı açıklaması",
      "storytelling": "Bu bölüm için hikayeleştirme önerisi",
      "icebreakerIdeas": ["Editörü yazıya hızlı başlatacak ilk giriş/kanca cümlesi", "Farklı bir açı sunan ikinci giriş/kanca cümlesi"],
      "imagePrompt": "English cinematic, premium visual prompt for this H2 section"
    }
  ],
  "faqSection": [
    {
      "question": "Sık sorulan soru",
      "answer": "Detaylı yanıt"
    }
  ],
  "schemaStrategy": {
    "mainSchema": "Ana schema türü",
    "supportingSchemas": ["destekleyici schema türleri"],
    "reasoning": "Schema seçiminin gerekçesi"
  },
  "qualityChecklist": [
    {
      "item": "Özgün Değer Teklifi (UVP) karşılanıyor mu?",
      "status": true,
      "note": "Bu içeriğin benzersiz değeri açıkça belirtilmiş"
    },
    {
      "item": "Paragraflar kısa mı (Max 5 satır)?",
      "status": true,
      "note": "İçerik outline'ında kısa paragraflar önerilmiş"
    },
    {
      "item": "Her H2 altında görsel var mı?",
      "status": true,
      "note": "Görsel önerileri içerik planında belirtilmiş"
    },
    {
      "item": "Başlık merak uyandırıcı mı?",
      "status": true,
      "note": "Tıklama odaklı başlık önerisi merak uyandırıcı"
    },
    {
      "item": "E-E-A-T sinyalleri mevcut mu?",
      "status": true,
      "note": "Uzman görüşleri ve güvenilir kaynaklar belirtilmiş"
    },
    {
      "item": "İç linkleme stratejisi doğru mu?",
      "status": true,
      "note": "İlgili konulara bağlantılar önerilmiş"
    },
    {
      "item": "SSS bölümü kapsamlı mı?",
      "status": true,
      "note": "10 adet detaylı SSS sorusu hazırlanmış"
    },
    {
      "item": "Dilbilgisi kontrolü yapıldı mı?",
      "status": true,
      "note": "Türkçe dilbilgisi kurallarına uygun içerik"
    }
  ]
}

ÖNEMLI KURALLAR:
1. Türkiye pazarına özel örnekler kullan
2. Güncel trendleri dahil et. Kullanıcı girdisi veya analiz verisi açıkça belirtmedikçe 2025 ya da daha eski bir yıl kullanma; başlık, anahtar kelime ve içerikte tarihsiz ifade kullan.
3. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) prensiplerini uygula
4. Rakiplerden farklılaşacak özgün değer teklifi sun
5. Pratik, uygulanabilir öneriler ver
6. İçerik outline'ında en az 6 H2 bölümü olsun
7. FAQ bölümünde en az 10 soru olsun
8. "keyTakeaways" alanında, okuyucunun yazıdan elde edeceği en önemli 3 fayda ve bilgiyi Türkçe, 10-15 kelimelik kısa ve vurucu maddeler halinde özetle.
9. Her H2 için "imagePrompt" alanında yalnızca İngilizce, Midjourney/DALL-E uyumlu, konuyu yansıtan sinematik ve premium bir görsel prompt oluştur. Kompozisyon, ışık, doku ve kalite detaylarını belirt; yazı, logo veya watermark isteme.
10. Her H2 için "icebreakerIdeas" alanında Türkçe, birbirinden farklı, editörün metne hızlı başlamasını sağlayacak tam 2 giriş/kanca cümlesi oluştur.
11. Yanıtın sadece JSON formatında olsun, başka açıklama ekleme

🚀 QFO VERİLERİNİ MAKSİMUM ETKİ İÇİN KULLAN:
- Her QFO analiz verisini dikkate al ve stratejiye entegre et
- Genişletilmiş sorguları anahtar kelime stratejisine dahil et
- İçerik boşluklarını kapatacak kapsamlı plan geliştir
- Sorgu performans verilerini kullanarak en etkili yaklaşımı belirle
- Rekabet avantajlarını maksimize eden strateji oluştur
`;
  }

  private getFallbackAnalysis(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): GeminiAnalysisResult {
    // Enhanced fallback with competitor-specific insights and QFO data
    const competitorDomains = selectedCompetitors.map(c => c.domain).join(', ');
    const avgPosition = Math.round(selectedCompetitors.reduce((sum, c) => sum + c.position, 0) / selectedCompetitors.length);
    
    // Check if QFO data is available for enhanced fallback
    const qfoData = competitorAnalysis?.qfoInsights;
    
    return {
      topic: topic,
      userIntent: `Informational - Kullanıcılar "${topic}" konusunu derinlemesine öğrenmek ve pratik uygulamalar hakkında bilgi sahibi olmak istiyor. Seçilen rakipler (${competitorDomains}) ortalama #${avgPosition} pozisyonda yer alıyor.`,
      competitorTone: competitorAnalysis?.dominantTone || `Analiz edilen ${selectedCompetitors.length} rakip profesyonel ve samimi ton karışımı kullanıyor, teknik detayları anlaşılır dille sunma eğiliminde`,
      uniqueValue: competitorAnalysis?.recommendedUVP || `${topic} konusunda Türkiye'ye özel güncel veriler, uzman röportajları ve adım adım uygulama rehberi ile seçilen rakiplerden (${selectedCompetitors.slice(0,3).map(c => c.domain).join(', ')}) ayrışma`,
      competitorAnalysisSummary: competitorAnalysis 
        ? `${competitorAnalysis.competitorCount} rakip analiz edildi. Ortalama ${competitorAnalysis.averageWordCount} kelime uzunluğunda içerikler mevcut. Seçilen rakipler: ${competitorDomains}`
        : `${selectedCompetitors.length} rakip seçildi: ${competitorDomains}. Rakipler genel bilgi sunuyor ancak yerel örnekler ve güncel vaka çalışmaları eksik`,
      competitorStrengths: [
        "Kapsamlı konu işleme",
        "Görsel destekli anlatım", 
        "Pratik örnekler",
        "Kapsamlı konu işleme",
        "Görsel destekli anlatım"
      ],
      contentGaps: qfoData?.contentGaps || [
        "Türkiye'ye özel veriler eksik",
        "Güncel trendler yetersiz",
        "Adım adım uygulama rehberi eksik",
        "Gerçek kullanıcı deneyimleri az",
        "Yerel vaka çalışmaları eksik",
        "Görsel içerik kalitesi düşük"
      ],
      dominantTone: "Profesyonel ve bilgilendirici",
      primaryKeyword: topic,
      secondaryKeywords: (qfoData?.expandedQueries?.slice(1, 9) || [
        `${topic} nedir`,
        `${topic} nasıl yapılır`,
        `${topic} örnekleri`, 
        `${topic} avantajları`,
        `${topic} stratejileri`,
        `${topic} rehberi`,
        `${topic} ipuçları`
      ]).map((keyword: string) => {
        // Fix common Turkish typos
        return keyword
          .replace('gezilece', 'gezilecek')
          .replace('kyerler', 'yerler')
          .replace('yperler', 'yerler');
      }),
      titleSuggestions: {
        clickFocused: `${topic}: Bilmeniz Gereken Her Şey`,
        seoFocused: `${topic} Rehberi: Tanımı, Avantajları ve Uygulama Stratejileri`
      },
      metaDescription: `${topic} hakkında kapsamlı rehber. Tanımı, avantajları, uygulama stratejileri ve uzman önerileri ile başarıya ulaşın. Türkiye'ye özel örnekler.`,
      keyTakeaways: [
        `${topic} seçiminde temel kriterleri öğrenerek daha bilinçli ve güvenli kararlar alın.`,
        `Uzman önerileriyle yaygın hatalardan kaçının ve uygulama sürecinizi güvenle planlayın.`,
        `Türkiye'ye uygun örnekler sayesinde bilgileri günlük ihtiyaçlarınıza kolayca uyarlayın.`
      ],
      contentOutline: [
        {
          level: 'H1',
          title: `${topic} Rehberi: Tanımı, Avantajları ve Uygulama Stratejileri`,
          content: `Konuyu ve rehberin okuyucuya ne katacağını net bir şekilde açıklayın. Seçilen rakipler (${selectedCompetitors.slice(0,2).map(c => c.domain).join(', ')}) bu konuda genel yaklaşım sergiliyor, biz daha derinlemesine ve Türkiye'ye özel bir perspektif sunacağız.`
        },
        {
          level: 'H2',
          title: `${topic} Nedir? Temel Kavramlar`,
          content: "Konunun temelini anlatın. En az 1-2 somut Türkiye'den örnek kullanın. Paragraflar 55 kelimeyi aşmayacak şekilde kısa tutun.",
          keyInfo: `${topic}'in Türkiye pazarındaki en önemli özelliği ve temel amacı`,
          imagePrompt: `Cinematic premium editorial scene explaining ${topic}, refined Turkish setting, warm natural light, sophisticated textures, photorealistic, high-end magazine photography, no text, no logo, no watermark`
        },
        {
          level: 'H2',
          title: `${topic}'in Avantajları ve Faydaları`,
          content: "Konunun sağladığı faydaları madde madde, her maddeye Türkiye'den kısa örnek ekleyerek işleyin.",
          storytelling: "Türkiye'den gerçek bir kullanıcının bu yöntemle elde ettiği başarı hikayesi üzerinden anlatın",
          imagePrompt: `Premium cinematic lifestyle image showing the benefits of ${topic}, elegant composition, soft directional lighting, tactile details, aspirational yet authentic, photorealistic, no text, no logo, no watermark`
        },
        {
          level: 'H2',
          title: `${topic} Nasıl Uygulanır? Adım Adım Rehber`,
          content: "Pratik uygulama adımlarını detaylı şekilde açıklayın. Her adım için Türkiye pazarından somut örnekler verin.",
          keyInfo: "Türkiye'de en kritik uygulama adımı ve dikkat edilmesi gereken yasal/kültürel nokta",
          imagePrompt: `Cinematic premium overhead scene of ${topic} being applied step by step, precise hands and tools, rich material detail, dramatic studio lighting, photorealistic editorial photography, no text, no logo, no watermark`
        },
        {
          level: 'H2',
          title: `${topic} Örnekleri ve Türkiye'den Vaka Çalışmaları`,
          content: "Başarılı uygulama örneklerini detaylı şekilde inceleyin. Mutlaka Türkiye'den örneklere yer verin.",
          storytelling: "Türkiye'den başarılı bir şirketin bu stratejiyi nasıl uyguladığı ve sonuçları",
          imagePrompt: `High-end cinematic case study scene for ${topic} in Türkiye, authentic local context, polished professional environment, nuanced depth of field, editorial photography, no text, no logo, no watermark`
        },
        {
          level: 'H2',
          title: `${topic}'te Dikkat Edilmesi Gereken Hatalar`,
          content: "Yaygın hataları ve bunlardan kaçınma yollarını açıklayın. Türkiye'ye özel hatalara değinin.",
          keyInfo: "Türkiye pazarında en sık yapılan hata ve bunun önlenmesi için kritik ipucu",
          imagePrompt: `Cinematic premium conceptual image about avoiding mistakes in ${topic}, subtle contrast between risk and confidence, controlled moody lighting, elegant visual storytelling, photorealistic, no text, no logo, no watermark`
        },
        {
          level: 'H2',
          title: `${topic} için Araçlar ve Kaynaklar`,
          content: "Konuyla ilgili faydalı araçları, Türkiye'de erişilebilir kaynakları listeleyin.",
          keyInfo: "Türkiye'de ücretsiz erişilebilecek en değerli kaynak",
          imagePrompt: `Luxury editorial flat lay of tools and resources for ${topic}, curated objects, premium materials, balanced composition, soft cinematic light, photorealistic, no text, no logo, no watermark`
        }
      ],
      faqSection: [
        {
          question: `${topic} için ideal su sıcaklığı nedir?`,
          answer: `${topic} için ideal su sıcaklığı 90-96°C arasındadır. Bu sıcaklık kahvenin aromasını en iyi şekilde çıkarır ve acı tadı önler. Türkiye'de çoğu ev tipi su ısıtıcısı bu sıcaklığa ulaşabilir.`
        },
        {
          question: `Makinesiz ${topic} yapmak mümkün mü?`,
          answer: `Evet, makinesiz ${topic} yapmak mümkündür. Moka pot, French press veya V60 gibi alternatif yöntemlerle evde kolayca hazırlayabilirsiniz. Bu yöntemler Türkiye'de yaygın olarak kullanılır ve uygun fiyatlıdır.`
        },
        {
          question: `Soğuk demleme ${topic} kaç saatte demlenir?`,
          answer: `Soğuk demleme ${topic} genellikle 12-24 saat arasında demlenir. Türkiye'nin sıcak iklim koşullarında özellikle yaz aylarında tercih edilen bu yöntem, daha yumuşak ve az asitli bir tat profili sunar.`
        },
        {
          question: `${topic} kreması nasıl elde edilir?`,
          answer: `${topic} kreması için taze çekilmiş kahve ve doğru basınç gereklidir. Ev tipi süt köpürtücüler veya French press ile de krema elde edebilirsiniz. Türkiye'de yaygın olan UHT süt de iyi sonuç verir.`
        },
        {
          question: `${topic} hangi fincanda servis edilir?`,
          answer: `${topic} genellikle 60-90ml kapasiteli küçük fincanlarda servis edilir. Türkiye'de geleneksel kahve fincanları da kullanılabilir. Porselen veya seramik fincanlar sıcaklığı daha iyi korur.`
        },
        {
          question: `${topic} ile hangi tatlılar uyumlu?`,
          answer: `${topic} ile çikolatalı tatlılar, tiramisu, profiterol ve Türk mutfağından baklava, künefe gibi tatlılar çok uyumludur. Kahvenin yoğun tadı tatlıların lezzetini dengeleyerek mükemmel bir uyum yaratır.`
        },
        {
          question: `${topic} için en uygun kahve çekirdeği hangisi?`,
          answer: `${topic} için Arabica çekirdekleri tercih edilir. Türkiye'de yerel kavurucularda bulunan orta-koyu kavrum çekirdekleri ideal sonuç verir. Brezilya, Kolombiya ve Etiyopya orijinli çekirdekler popülerdir.`
        },
        {
          question: `${topic} yapımında en sık yapılan hatalar neler?`,
          answer: `En sık yapılan hatalar: çok ince veya kaba öğütme, yanlış su sıcaklığı, eski kahve kullanımı ve yanlış oran. Türkiye'de yaygın hata ayrıca çok uzun demleme süresidir.`
        },
        {
          question: `${topic} için gerekli ekipmanlar neler?`,
          answer: `Temel ekipmanlar: kahve makinesi veya alternatif demleme aracı, kahve değirmeni, terazi, zamanlayıcı ve kaliteli su. Türkiye'de bu ekipmanlar kolayca bulunabilir ve çeşitli bütçelere uygun seçenekler mevcuttur.`
        },
        {
          question: `${topic} ile normal kahve arasındaki fark nedir?`,
          answer: `${topic} daha konsantre, yoğun ve kremalıdır. Normal filtre kahveye göre daha kısa sürede hazırlanır ve daha güçlü bir aroma profili sunar. Türkiye'de geleneksel Türk kahvesinden farklı olarak basınçlı demleme yöntemi kullanılır.`
        }
      ],
      schemaStrategy: {
        mainSchema: "Article",
        supportingSchemas: ["FAQPage", "HowTo", "BreadcrumbList", "Organization"],
        reasoning: "Article schema ana içerik için, FAQPage SSS bölümü için, HowTo pratik adımlar için, Organization Türkiye'deki şirket bilgileri için kullanılmalıdır."
      },
      qualityChecklist: [
        {
          item: "Özgün Değer Teklifi (UVP) karşılanıyor mu?",
          status: true,
          note: "Bu içeriğin benzersiz değeri açıkça belirtilmiş"
        },
        {
          item: "Paragraflar kısa mı (Max 5 satır)?",
          status: true,
          note: "İçerik outline'ında kısa paragraflar önerilmiş"
        },
        {
          item: "Her H2 altında görsel var mı?",
          status: true,
          note: "Görsel önerileri içerik planında belirtilmiş"
        },
        {
          item: "Başlık merak uyandırıcı mı?",
          status: true,
          note: "Tıklama odaklı başlık önerisi merak uyandırıcı"
        },
        {
          item: "E-E-A-T sinyalleri mevcut mu?",
          status: true,
          note: "Uzman görüşleri ve güvenilir kaynaklar belirtilmiş"
        },
        {
          item: "İç linkleme stratejisi doğru mu?",
          status: true,
          note: "İlgili konulara bağlantılar önerilmiş"
        },
        {
          item: "SSS bölümü kapsamlı mı?",
          status: true,
          note: "10 adet detaylı SSS sorusu hazırlanmış"
        },
        {
          item: "Dilbilgisi kontrolü yapıldı mı?",
          status: true,
          note: "Türkçe dilbilgisi kurallarına uygun içerik"
        }
      ]
    };
  }
}

export const geminiAIService = new GeminiAIService();