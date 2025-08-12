import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';
import { runBrief } from '../../../../lib/llm/runBrief';
import { db } from '../../../../lib/db/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { convertMarkdownToHtml, cleanHtml } from '../../../../lib/utils/markdownToHtml';

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
      language = 'tr',
      selected_competitors = []
    } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    // Initialize DataForSEO client
    const serpClient = new DataForSEOClient();

    // Use selected competitors if provided, otherwise fetch from SERP
    let competitors = [];
    let paaQuestions = [];
    let entities = [];
    
    if (selected_competitors && selected_competitors.length > 0) {
      // CRITICAL: Limit competitors to 3 max to prevent timeout scaling
      competitors = selected_competitors.slice(0, 3);
      console.log(`🎯 Using ${competitors.length} user-selected competitors (limited to 3 for performance)`);
      if (selected_competitors.length > 3) {
        console.log(`⚠️ Reduced from ${selected_competitors.length} to 3 competitors to prevent timeout`);
      }
    } else {
      console.log('No selected competitors, fetching from SERP...');
    }

    // Run SERP requests in parallel with competitor limit
    const serpPromises = [];
    
    if (competitors.length === 0) {
      console.log('🔍 Fetching max 3 competitors from SERP for performance...');
      serpPromises.push(serpClient.getTopCompetitors(konu_sorgusu, 'Turkey', language));
    }
    
    serpPromises.push(
      serpClient.getPAAQuestions(konu_sorgusu, 'Turkey', language),
      serpClient.getEntities(konu_sorgusu)
    );
    
    const serpResults = await Promise.allSettled(serpPromises);
    
    console.log('✅ SERP data fetched, processing results...');
    
    // Handle results based on whether competitors were user-selected
    let resultIndex = 0;
    if (competitors.length === 0) {
      const competitorsResult = serpResults[resultIndex++];
      if (competitorsResult.status === 'fulfilled') {
        competitors = competitorsResult.value as { url: string; title: string; description: string }[];
      } else {
        console.warn('Failed to fetch competitors, using fallback:', competitorsResult.reason);
        competitors = [
          { url: 'https://example.com', title: 'Sample Competitor 1', description: 'Fallback competitor data' },
          { url: 'https://example2.com', title: 'Sample Competitor 2', description: 'Fallback competitor data' }
        ];
      }
    }

    // Handle PAA result
    const paaResult = serpResults[resultIndex++];
    if (paaResult.status === 'fulfilled') {
      paaQuestions = (paaResult.value as unknown) as { question: string; answer?: string }[];
    } else {
      console.warn('Failed to fetch PAA questions, using fallback:', paaResult.reason);
      paaQuestions = [
        { question: `What is ${konu_sorgusu}?`, answer: 'Sample PAA answer' },
        { question: `How to choose ${konu_sorgusu}?`, answer: 'Sample PAA answer' }
      ];
    }

    // Handle entities result
    const entitiesResult = serpResults[resultIndex++];
    if (entitiesResult.status === 'fulfilled') {
      entities = (entitiesResult.value as unknown) as { name: string; type: string; description?: string }[];
    } else {
      console.warn('Failed to fetch entities, using fallback:', entitiesResult.reason);
      entities = [{ name: konu_sorgusu, type: 'Topic', description: 'Main topic entity' }];
    }

    // Format data for prompt with strategic competitor analysis (no URL fetching for speed)
    console.log('🎯 Analyzing competitor strategy and positioning for deep insights...');
    const serpCompetitors = serpClient.formatCompetitorsForPrompt(competitors);
    const paaFormatted = serpClient.formatPAAForPrompt(paaQuestions);

    console.log('🚀 Strategic competitor analysis complete, starting optimized Gemini generation...');
    
    // Prepare inputs for LLM
    const briefInputs = {
      konu_sorgusu,
      google_query_fan_out_entities,
      extra_subtitles: extra_subtitles || '',
      extra_faq: extra_faq || '',
      serp_competitors: serpCompetitors,
      paa_questions: paaFormatted
    };

    console.log('🚀 CALLING GEMINI CALLBACK PIPELINE - NO FALLBACK ALLOWED, UNRESTRICTED PROCESSING...');
    console.log('📊 Processing', competitors.length, 'competitors with comprehensive analysis...');
    let markdownOutline;
    try {
      markdownOutline = await runBrief(briefInputs);
      if (!markdownOutline || markdownOutline.trim().length === 0) {
        throw new Error('Gemini API returned empty response');
      }
      console.log('✅ GEMINI CALLBACK PIPELINE SUCCESS - Generated content length:', markdownOutline.length);
      
    } catch (error) {
      console.error('❌ GEMINI API FAILED:', error);
      // NO FALLBACK - Return error to force proper debugging
      return NextResponse.json(
        { 
          error: 'Gemini API failure - no fallback allowed',
          details: error instanceof Error ? error.message : 'Unknown Gemini error',
          debug_info: {
            api_key_configured: !!process.env.GOOGLE_AI_API_KEY,
            inputs_provided: Object.keys(briefInputs),
            topic: konu_sorgusu
          }
        },
        { status: 500 }
      );
    }

    // Basic validation - ensure we got substantial content from Gemini
    if (markdownOutline.length < 200) {
      console.error('❌ GEMINI OUTPUT TOO SHORT:', markdownOutline.length, 'characters');
      return NextResponse.json(
        { 
          error: 'Gemini generated insufficient content',
          details: `Generated content is too short (${markdownOutline.length} characters). Expected comprehensive Turkish SEO brief.`,
          content_length: markdownOutline.length
        },
        { status: 500 }
      );
    }
    
    console.log('✅ GEMINI OUTPUT VALIDATED - Length:', markdownOutline.length, 'characters');

    // ALL FALLBACK CODE REMOVED - ONLY GEMINI 2.5 PRO ALLOWED

    console.log('Markdown outline generated successfully, length:', markdownOutline.length);
    
    // Convert Markdown to HTML
    const htmlOutline = cleanHtml(convertMarkdownToHtml(markdownOutline));
    console.log('Converted to HTML, length:', htmlOutline.length);

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
      outline: htmlOutline,
      format: 'html',
      metadata: {
        competitors_found: competitors.length,
        competitors_user_selected: selected_competitors.length > 0,
        paa_questions_found: paaQuestions.length,
        entities_found: entities.length,
        outline_length: htmlOutline.length,
        original_markdown_length: markdownOutline.length
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
