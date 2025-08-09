import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';
import { runBrief } from '../../../../lib/llm/runBrief';
import { OutlineValidator } from '../../../../lib/validate/outline';
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

    // Fetch SERP data with fallbacks
    console.log('Fetching SERP competitors...');
    let competitors = [];
    let paaQuestions = [];
    let entities = [];

    try {
      competitors = await serpClient.getTopCompetitors(konu_sorgusu, 'Turkey', language);
    } catch (error) {
      console.warn('Failed to fetch competitors, using fallback:', error);
      competitors = [
        { url: 'https://example.com', title: 'Sample Competitor 1', description: 'Fallback competitor data' },
        { url: 'https://example2.com', title: 'Sample Competitor 2', description: 'Fallback competitor data' }
      ];
    }
    
    try {
      console.log('Fetching PAA questions...');
      paaQuestions = await serpClient.getPAAQuestions(konu_sorgusu, 'Turkey', language);
    } catch (error) {
      console.warn('Failed to fetch PAA questions, using fallback:', error);
      paaQuestions = [
        { question: `What is ${konu_sorgusu}?`, answer: 'Sample PAA answer' },
        { question: `How to choose ${konu_sorgusu}?`, answer: 'Sample PAA answer' }
      ];
    }
    
    try {
      console.log('Fetching entities...');
      entities = await serpClient.getEntities(konu_sorgusu);
    } catch (error) {
      console.warn('Failed to fetch entities, using fallback:', error);
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
    const outline = await runBrief(briefInputs);

    // Validate the outline
    console.log('Validating outline...');
    const validator = new OutlineValidator();
    const validation = validator.validate(outline);

    // Auto-fix common issues if validation fails
    let finalOutline = outline;
    if (!validation.isValid) {
      console.log('Validation failed, attempting auto-fix...');
      finalOutline = OutlineValidator.autoFix(outline);
      
      // Re-validate after auto-fix
      const revalidation = validator.validate(finalOutline);
      if (!revalidation.isValid) {
        console.warn('Auto-fix could not resolve all validation issues');
      }
    }

    // Store in Firebase (optional, don't fail if it doesn't work)
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        const docRef = await addDoc(collection(db, 'briefs'), {
          konu_sorgusu,
          google_query_fan_out_entities,
          outline: finalOutline,
          validation_errors: validation.errors,
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
      outline: finalOutline,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors
      },
      metadata: {
        competitors_found: competitors.length,
        paa_questions_found: paaQuestions.length,
        entities_found: entities.length
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
