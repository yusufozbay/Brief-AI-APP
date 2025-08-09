import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location = 'Turkey', language = 'tr' } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const serpClient = new DataForSEOClient();
    const entities = await serpClient.getEntities(query);

    // Fallback entity extraction from query if no entities found
    let fallbackEntities = [];
    if (entities.length === 0) {
      // Simple entity extraction based on common patterns
      const words = query.split(' ');
      const capitalizedWords = words.filter((word: string) => 
        word.length > 2 && word[0] === word[0].toUpperCase()
      );
      
      fallbackEntities = capitalizedWords.map((word: string) => ({
        name: word,
        type: 'Extracted',
        description: `Potential entity extracted from query: ${word}`
      }));
    }

    const finalEntities = entities.length > 0 ? entities : fallbackEntities;

    return NextResponse.json({
      success: true,
      entities: finalEntities,
      count: finalEntities.length,
      source: entities.length > 0 ? 'dataforseo' : 'fallback'
    });

  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch entities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
