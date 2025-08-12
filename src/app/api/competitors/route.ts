import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      console.error('DataForSEO credentials are not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SERP API credentials' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { konu_sorgusu, language = 'tr' } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    // Initialize DataForSEO client
    const serpClient = new DataForSEOClient();

    console.log('Fetching competitors for:', konu_sorgusu);
    
    try {
      // Fetch competitors with timeout
      const competitorsPromise = serpClient.getTopCompetitors(konu_sorgusu, 'Turkey', language);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Competitors timeout')), 5000)
      );
      
      const competitors = await Promise.race([competitorsPromise, timeoutPromise]) as { url: string; title: string; description: string }[];
      
      // If we got competitors from the API, use them; otherwise use enhanced fallback
      const finalCompetitors = competitors && competitors.length > 0 ? competitors : [
        { 
          url: `https://www.example1.com/${konu_sorgusu.replace(/\s+/g, '-')}`, 
          title: `${konu_sorgusu} - Kapsamlı Rehber | Örnek Site 1`, 
          description: `${konu_sorgusu} hakkında detaylı bilgiler, ipuçları ve uzman önerileri. Adım adım rehber ve pratik uygulamalar.` 
        },
        { 
          url: `https://www.example2.com/${konu_sorgusu.replace(/\s+/g, '-')}-rehberi`, 
          title: `${konu_sorgusu} Nasıl Yapılır? | Örnek Site 2`, 
          description: `${konu_sorgusu} için en iyi yöntemler, araçlar ve teknikler. Başlangıçtan ileri seviyeye kadar.` 
        },
        { 
          url: `https://www.example3.com/blog/${konu_sorgusu.replace(/\s+/g, '-')}`, 
          title: `${konu_sorgusu} Hakkında Bilmeniz Gerekenler | Örnek Site 3`, 
          description: `${konu_sorgusu} konusunda uzman görüşleri, sık sorulan sorular ve pratik çözümler.` 
        },
        { 
          url: `https://www.example4.com/${konu_sorgusu.replace(/\s+/g, '-')}-ipuclari`, 
          title: `${konu_sorgusu} İpuçları ve Püf Noktaları | Örnek Site 4`, 
          description: `${konu_sorgusu} için profesyonel ipuçları, yaygın hatalar ve bunlardan kaçınma yolları.` 
        },
        { 
          url: `https://www.example5.com/rehber/${konu_sorgusu.replace(/\s+/g, '-')}`, 
          title: `${konu_sorgusu} - Uzman Rehberi | Örnek Site 5`, 
          description: `${konu_sorgusu} konusunda kapsamlı rehber, örnekler ve uygulamalı bilgiler.` 
        }
      ];
      
      return NextResponse.json({
        success: true,
        competitors: finalCompetitors,
        query: konu_sorgusu,
        source: competitors && competitors.length > 0 ? 'api' : 'fallback'
      });
      
    } catch (error) {
      console.warn('Failed to fetch competitors:', error);
      
      // Return fallback competitors
      const fallbackCompetitors = [
        { 
          url: 'https://example1.com', 
          title: `${konu_sorgusu} - Örnek Rakip 1`, 
          description: 'Bu konuda detaylı bilgi sunan örnek rakip sitesi.' 
        },
        { 
          url: 'https://example2.com', 
          title: `${konu_sorgusu} Rehberi - Örnek Rakip 2`, 
          description: 'Kapsamlı rehber ve ipuçları sunan örnek rakip.' 
        },
        { 
          url: 'https://example3.com', 
          title: `${konu_sorgusu} Hakkında - Örnek Rakip 3`, 
          description: 'Uzman görüşleri ve öneriler içeren örnek site.' 
        }
      ];
      
      return NextResponse.json({
        success: true,
        competitors: fallbackCompetitors,
        query: konu_sorgusu,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error in competitors endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch competitors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
