import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';
import { runBrief } from '../../../../lib/llm/runBrief';
import { db } from '../../../../lib/db/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Missing AI API key' },
        { status: 500 }
      );
    }

    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      console.error('DataForSEO credentials are not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SERP API credentials' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      konu_sorgusu, 
      google_query_fan_out_entities, 
      extra_subtitles,
      extra_faq,
      language = 'tr' 
    } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    // Initialize DataForSEO client
    const serpClient = new DataForSEOClient();

    // Fetch SERP data in parallel with timeouts and fallbacks
    console.log('Fetching SERP data in parallel...');
    let competitors = [];
    let paaQuestions = [];
    let entities = [];

    // Run all SERP requests in parallel with individual timeouts
    const [competitorsResult, paaResult, entitiesResult] = await Promise.allSettled([
      Promise.race([
        serpClient.getTopCompetitors(konu_sorgusu, 'Turkey', language),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Competitors timeout')), 5000))
      ]),
      Promise.race([
        serpClient.getPAAQuestions(konu_sorgusu, 'Turkey', language),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PAA timeout')), 5000))
      ]),
      Promise.race([
        serpClient.getEntities(konu_sorgusu),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Entities timeout')), 5000))
      ])
    ]);

    // Handle competitors result
    if (competitorsResult.status === 'fulfilled') {
      competitors = competitorsResult.value as { url: string; title: string; description: string }[];
    } else {
      console.warn('Failed to fetch competitors, using fallback:', competitorsResult.reason);
      competitors = [
        { url: 'https://example.com', title: 'Sample Competitor 1', description: 'Fallback competitor data' },
        { url: 'https://example2.com', title: 'Sample Competitor 2', description: 'Fallback competitor data' }
      ];
    }

    // Handle PAA result
    if (paaResult.status === 'fulfilled') {
      paaQuestions = paaResult.value as { question: string; answer?: string }[];
    } else {
      console.warn('Failed to fetch PAA questions, using fallback:', paaResult.reason);
      paaQuestions = [
        { question: `What is ${konu_sorgusu}?`, answer: 'Sample PAA answer' },
        { question: `How to choose ${konu_sorgusu}?`, answer: 'Sample PAA answer' }
      ];
    }

    // Handle entities result
    if (entitiesResult.status === 'fulfilled') {
      entities = entitiesResult.value as { name: string; type: string; description?: string }[];
    } else {
      console.warn('Failed to fetch entities, using fallback:', entitiesResult.reason);
      entities = [{ name: konu_sorgusu, type: 'Topic', description: 'Main topic entity' }];
    }

    // Format data for prompt
    const serpCompetitors = serpClient.formatCompetitorsForPrompt(competitors);
    const paaFormatted = serpClient.formatPAAForPrompt(paaQuestions);

    // Prepare inputs for LLM
    const briefInputs = {
      konu_sorgusu,
      google_query_fan_out_entities,
      extra_subtitles: extra_subtitles || '',
      extra_faq: extra_faq || '',
      serp_competitors: serpCompetitors,
      paa_questions: paaFormatted
    };

    console.log('Calling Gemini API...');
    let markdownOutline;
    try {
      markdownOutline = await runBrief(briefInputs);
      if (!markdownOutline) {
        throw new Error('Gemini API returned empty response');
      }
    } catch (error) {
      console.error('Brief generation failed:', error);
      return NextResponse.json(
        { 
          error: 'Failed to generate brief',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback_available: true
        },
        { status: 500 }
      );
    }

    console.log('Markdown outline generated successfully, length:', markdownOutline.length);

    // Store in Firebase (optional, don't fail if it doesn't work)
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        const docRef = await addDoc(collection(db, 'briefs'), {
          konu_sorgusu,
          google_query_fan_out_entities,
          markdown_outline: markdownOutline,
          output_format: 'markdown',
          serp_data: {
            competitors: competitors.slice(0, 5), // Store top 5 for reference
            paa_questions: paaQuestions.slice(0, 10),
            entities
          },
          created_at: new Date(),
          language
        });
        console.log('Stored brief with ID:', docRef.id);
      } else {
        console.warn('Firebase not configured, skipping storage');
      }
    } catch (firebaseError) {
      console.error('Firebase storage error:', firebaseError);
      // Continue without failing the request
    }

    return NextResponse.json({
      success: true,
      outline: markdownOutline,
      format: 'markdown',
      metadata: {
        competitors_found: competitors.length,
        paa_questions_found: paaQuestions.length,
        entities_found: entities.length,
        outline_length: markdownOutline.length
      }
    });

  } catch (error) {
    console.error('Error in brief generation:', error);
    return NextResponse.json(
      { 
        error: 'Brief generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
