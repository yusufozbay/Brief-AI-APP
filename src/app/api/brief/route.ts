import { NextRequest, NextResponse } from 'next/server';
import { DataForSEOClient } from '../../../../lib/serp/dataforseo';
import { runBrief } from '../../../../lib/llm/runBrief';
import { OutlineValidator } from '../../../../lib/validate/outline';
import { db } from '../../../../lib/db/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { konu_sorgusu, google_query_fan_out_entities, language = 'tr' } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    // Initialize DataForSEO client
    const serpClient = new DataForSEOClient();

    // Fetch SERP data
    console.log('Fetching SERP competitors...');
    const competitors = await serpClient.getTopCompetitors(konu_sorgusu, 'Turkey', language);
    
    console.log('Fetching PAA questions...');
    const paaQuestions = await serpClient.getPAAQuestions(konu_sorgusu, 'Turkey', language);
    
    console.log('Fetching entities...');
    const entities = await serpClient.getEntities(konu_sorgusu);

    // Format data for prompt
    const serpCompetitors = serpClient.formatCompetitorsForPrompt(competitors);
    const paaFormatted = serpClient.formatPAAForPrompt(paaQuestions);

    // Prepare inputs for LLM
    const briefInputs = {
      konu_sorgusu,
      google_query_fan_out_entities,
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

    // Store in Firebase
    try {
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
