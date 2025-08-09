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
    const paaQuestions = await serpClient.getPAAQuestions(query, location, language);

    return NextResponse.json({
      success: true,
      questions: paaQuestions,
      count: paaQuestions.length
    });

  } catch (error) {
    console.error('Error fetching PAA questions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch PAA questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
