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
      
      return NextResponse.json({
        success: true,
        competitors: competitors || [],
        query: konu_sorgusu
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
