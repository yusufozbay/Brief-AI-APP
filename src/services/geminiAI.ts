import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompetitorSelection } from '../types/serp';

interface GeminiAnalysisResult {
  topic: string;
  userIntent: string;
  competitorTone: string;
  uniqueValue: string;
  competitorAnalysisSummary: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleSuggestions: {
    clickFocused: string;
    seoFocused: string;
  };
  metaDescription: string;
  contentOutline: Array<{
    level: 'H1' | 'H2' | 'H3';
    title: string;
    content: string;
    keyInfo?: string;
    storytelling?: string;
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
}

class GeminiAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Initialize with environment variable or allow manual setting
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.initializeAI(apiKey);
    }
  }

  initializeAI(apiKey: string) {
    try {
      console.log('🔧 Initializing Gemini AI with key length:', apiKey?.length || 0);
      console.log('🔧 API Key starts with:', apiKey?.substring(0, 10) + '...');
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      console.log('✅ Gemini AI initialized successfully with model: gemini-1.5-pro');
      console.log('✅ Model object created:', !!this.model);
    } catch (error) {
      console.error('❌ Gemini AI initialization error:', error);
      this.model = null;
      this.genAI = null;
    }
  }

  async generateContentStrategy(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): Promise<GeminiAnalysisResult> {
    console.log('=== GEMINI AI GENERATION DEBUG ===');
    console.log('Model initialized:', !!this.model);
    console.log('API Key available:', !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log('Topic:', topic);
    console.log('Competitors count:', selectedCompetitors?.length || 0);
    
    if (!this.model) {
      console.error('❌ Gemini AI model not initialized! Falling back to static template.');
      console.log('Attempting to re-initialize...');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        this.initializeAI(apiKey);
        if (this.model) {
          console.log('✅ Re-initialization successful, proceeding with AI generation');
        } else {
          console.error('❌ Re-initialization failed, using fallback');
          return this.getFallbackAnalysis(topic, selectedCompetitors, competitorAnalysis);
        }
      } else {
        console.error('❌ No API key available, using fallback');
        return this.getFallbackAnalysis(topic, selectedCompetitors, competitorAnalysis);
      }
    }
    
    console.log('✅ Using Gemini AI for dynamic content strategy generation');

    try {
      const prompt = this.buildAnalysisPrompt(topic, selectedCompetitors, competitorAnalysis);
      console.log('📝 Generated prompt length:', prompt.length);
      console.log('📝 Prompt preview:', prompt.substring(0, 300) + '...');
      
      console.log('🚀 Calling Gemini AI model...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('📥 Gemini AI response received, length:', text.length);
      console.log('📥 Raw response preview:', text.substring(0, 500) + '...');
      
      // Parse the JSON response from Gemini (remove markdown code blocks if present)
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🔧 Cleaned text for parsing:', cleanText.substring(0, 200) + '...');
      const analysisResult = JSON.parse(cleanText);
      
      console.log('✅ Successfully parsed Gemini AI response');
      console.log('📊 Generated keywords count:', analysisResult.secondaryKeywords?.length || 0);
      console.log('📊 Generated FAQ count:', analysisResult.faqSection?.length || 0);
      console.log('📊 Sample FAQ question:', analysisResult.faqSection?.[0]?.question || 'No FAQ found');
      console.log('📊 Sample FAQ answer length:', analysisResult.faqSection?.[0]?.answer?.length || 0);
      
      return {
        topic,
        ...analysisResult
      };
    } catch (error) {
      console.error('❌ Gemini AI analysis error:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.log('🔄 Falling back to static template due to error');
      return this.getFallbackAnalysis(topic, selectedCompetitors, competitorAnalysis);
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

    return `
Sen 25 yıllık deneyimli bir SEO uzmanı ve içerik stratejistisin. Türkiye pazarı için "${topic}" konusunda kapsamlı bir içerik stratejisi oluştur.

RAKIP ANALİZİ:
${competitorInfo}

${competitorAnalysis ? `
DETAYLI RAKİP VERİLERİ:
- Analiz edilen rakip sayısı: ${competitorAnalysis.competitorCount}
- Ortalama kelime sayısı: ${competitorAnalysis.averageWordCount}
- Baskın ton: ${competitorAnalysis.dominantTone}
- İçerik boşlukları: ${competitorAnalysis.contentGaps?.join(', ')}
` : ''}

Lütfen aşağıdaki JSON formatında yanıt ver:

{
  "userIntent": "Kullanıcı niyeti analizi (Informational/Transactional/Navigational)",
  "competitorTone": "Rakiplerin baskın ton ve stil analizi",
  "uniqueValue": "Bu içeriğin rakiplerden farklılaşacağı benzersiz değer teklifi",
  "competitorAnalysisSummary": "Rakip analizi özeti",
  "primaryKeyword": "${topic}",
  "secondaryKeywords": ["ikincil anahtar kelime listesi - 8 adet"],
  "titleSuggestions": {
    "clickFocused": "Tıklama odaklı başlık önerisi",
    "seoFocused": "SEO odaklı başlık önerisi"
  },
  "metaDescription": "155 karakter sınırında meta açıklama",
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
      "storytelling": "Bu bölüm için hikayeleştirme önerisi"
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
  }
}

ÖNEMLI KURALLAR:
1. Türkiye pazarına özel örnekler kullan
2. 2025 güncel trendlerini dahil et
3. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) prensiplerini uygula
4. Rakiplerden farklılaşacak özgün değer teklifi sun
5. Pratik, uygulanabilir öneriler ver
6. İçerik outline'ında en az 6 H2 bölümü olsun
7. FAQ bölümünde en az 10 soru olsun
8. Yanıtın sadece JSON formatında olsun, başka açıklama ekleme
`;
  }

  private getFallbackAnalysis(
    topic: string,
    selectedCompetitors: CompetitorSelection[],
    competitorAnalysis?: any
  ): GeminiAnalysisResult {
    // Enhanced fallback with competitor-specific insights
    const competitorDomains = selectedCompetitors.map(c => c.domain).join(', ');
    const avgPosition = Math.round(selectedCompetitors.reduce((sum, c) => sum + c.position, 0) / selectedCompetitors.length);
    
    return {
      topic: topic,
      userIntent: `Informational - Kullanıcılar "${topic}" konusunu derinlemesine öğrenmek ve pratik uygulamalar hakkında bilgi sahibi olmak istiyor. Seçilen rakipler (${competitorDomains}) ortalama #${avgPosition} pozisyonda yer alıyor.`,
      competitorTone: competitorAnalysis?.dominantTone || `Analiz edilen ${selectedCompetitors.length} rakip profesyonel ve samimi ton karışımı kullanıyor, teknik detayları anlaşılır dille sunma eğiliminde`,
      uniqueValue: competitorAnalysis?.recommendedUVP || `${topic} konusunda Türkiye'ye özel güncel veriler, uzman röportajları ve adım adım uygulama rehberi ile seçilen rakiplerden (${selectedCompetitors.slice(0,3).map(c => c.domain).join(', ')}) ayrışma`,
      competitorAnalysisSummary: competitorAnalysis 
        ? `${competitorAnalysis.competitorCount} rakip analiz edildi. Ortalama ${competitorAnalysis.averageWordCount} kelime uzunluğunda içerikler mevcut. Seçilen rakipler: ${competitorDomains}`
        : `${selectedCompetitors.length} rakip seçildi: ${competitorDomains}. Rakipler genel bilgi sunuyor ancak yerel örnekler ve güncel vaka çalışmaları eksik`,
      primaryKeyword: topic,
      secondaryKeywords: [
        `${topic} nedir`,
        `${topic} nasıl yapılır`,
        `${topic} örnekleri`, 
        `${topic} avantajları`,
        `${topic} stratejileri`,
        `${topic} 2024`,
        `${topic} rehberi`,
        `${topic} ipuçları`
      ].map(keyword => {
        // Fix common Turkish typos
        return keyword
          .replace('gezilece', 'gezilecek')
          .replace('kyerler', 'yerler')
          .replace('yperler', 'yerler');
      }),
      titleSuggestions: {
        clickFocused: `${topic}: 2025'te Başarı İçin Bilmeniz Gereken Her Şey`,
        seoFocused: `${topic} Rehberi: Tanımı, Avantajları ve Uygulama Stratejileri`
      },
      metaDescription: `${topic} hakkında kapsamlı rehber. Tanımı, avantajları, uygulama stratejileri ve uzman önerileri ile başarıya ulaşın. Türkiye'ye özel örnekler.`,
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
          keyInfo: `${topic}'in Türkiye pazarındaki en önemli özelliği ve temel amacı`
        },
        {
          level: 'H2',
          title: `${topic}'in Avantajları ve Faydaları`,
          content: "Konunun sağladığı faydaları madde madde, her maddeye Türkiye'den kısa örnek ekleyerek işleyin.",
          storytelling: "Türkiye'den gerçek bir kullanıcının bu yöntemle elde ettiği başarı hikayesi üzerinden anlatın"
        },
        {
          level: 'H2',
          title: `${topic} Nasıl Uygulanır? Adım Adım Rehber`,
          content: "Pratik uygulama adımlarını detaylı şekilde açıklayın. Her adım için Türkiye pazarından somut örnekler verin.",
          keyInfo: "Türkiye'de en kritik uygulama adımı ve dikkat edilmesi gereken yasal/kültürel nokta"
        },
        {
          level: 'H2',
          title: `${topic} Örnekleri ve Türkiye'den Vaka Çalışmaları`,
          content: "Başarılı uygulama örneklerini detaylı şekilde inceleyin. Mutlaka Türkiye'den örneklere yer verin.",
          storytelling: "Türkiye'den başarılı bir şirketin bu stratejiyi nasıl uyguladığı ve sonuçları"
        },
        {
          level: 'H2',
          title: `${topic}'te Dikkat Edilmesi Gereken Hatalar`,
          content: "Yaygın hataları ve bunlardan kaçınma yollarını açıklayın. Türkiye'ye özel hatalara değinin.",
          keyInfo: "Türkiye pazarında en sık yapılan hata ve bunun önlenmesi için kritik ipucu"
        },
        {
          level: 'H2',
          title: `${topic} için Araçlar ve Kaynaklar`,
          content: "Konuyla ilgili faydalı araçları, Türkiye'de erişilebilir kaynakları listeleyin.",
          keyInfo: "Türkiye'de ücretsiz erişilebilecek en değerli kaynak"
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
      }
    };
  }
}

export const geminiAIService = new GeminiAIService();