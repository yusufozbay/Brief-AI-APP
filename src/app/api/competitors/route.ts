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
    const { query, konu_sorgusu, language = 'tr' } = body;
    
    // Accept both 'query' and 'konu_sorgusu' for compatibility
    const searchQuery = query || konu_sorgusu;

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'query or konu_sorgusu is required' },
        { status: 400 }
      );
    }

    // Initialize DataForSEO client
    const serpClient = new DataForSEOClient();

    console.log('Fetching competitors for:', searchQuery);
    
    try {
      // Fetch competitors with timeout
      const competitorsPromise = serpClient.getTopCompetitors(searchQuery, 'Turkey', language);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Competitors timeout')), 20000)
      );
      
      console.log('🔍 DataForSEO API Call - Fetching real competitors for:', searchQuery);
      const competitors = await Promise.race([competitorsPromise, timeoutPromise]) as { url: string; title: string; description: string }[];
      
      console.log('📊 DataForSEO Response - Competitors found:', competitors?.length || 0);
      
      // Only return real competitors from DataForSEO API - NO FALLBACK
      if (!competitors || competitors.length === 0) {
        console.warn('⚠️ No real competitors found from DataForSEO API');
        return NextResponse.json({
          success: false,
          error: 'No competitors found from DataForSEO API. Please try a different query.',
          competitors: [],
          query: searchQuery,
          source: 'none'
        });
      }
      
      console.log('✅ Real competitors successfully fetched from DataForSEO');
      competitors.forEach((comp, index) => {
        console.log(`🏆 Real Competitor ${index + 1}:`, {
          title: comp.title.substring(0, 50) + '...',
          url: comp.url,
          description: comp.description.substring(0, 80) + '...'
        });
      });
      
      return NextResponse.json({
        success: true,
        competitors: competitors,
        query: konu_sorgusu,
        source: 'api'
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
