import { NextRequest, NextResponse } from 'next/server';
import { runBrief } from '../../../../lib/llm/runBrief';
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

    const body = await request.json();
    const { konu_sorgusu, language = 'tr' } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    console.log('🚀 MINIMAL TEST: Starting Gemini generation for:', konu_sorgusu);

    // Use minimal test data - no SERP calls
    const briefInputs = {
      konu_sorgusu,
      google_query_fan_out_entities: '',
      extra_subtitles: '',
      extra_faq: '',
      serp_competitors: 'Test competitors: example.com, test.com',
      paa_questions: `What is ${konu_sorgusu}? How to use ${konu_sorgusu}? Best practices for ${konu_sorgusu}?`
    };

    console.log('🎯 CALLING GEMINI WITH MINIMAL DATA...');
    let markdownOutline;
    
    try {
      markdownOutline = await runBrief(briefInputs);
      
      if (!markdownOutline || markdownOutline.trim().length === 0) {
        throw new Error('Gemini API returned empty response');
      }
      
      console.log('✅ GEMINI SUCCESS - Generated content length:', markdownOutline.length);
      
    } catch (error) {
      console.error('❌ GEMINI FAILED:', error);
      return NextResponse.json(
        { 
          error: 'Gemini API failure',
          details: error instanceof Error ? error.message : 'Unknown Gemini error',
          debug_info: {
            api_key_configured: !!process.env.GOOGLE_AI_API_KEY,
            inputs: briefInputs
          }
        },
        { status: 500 }
      );
    }

    // Convert markdown to HTML
    const htmlOutline = convertMarkdownToHtml(markdownOutline);
    const cleanedHtml = cleanHtml(htmlOutline);

    console.log('🎉 MINIMAL TEST SUCCESS - Returning brief');

    return NextResponse.json({
      success: true,
      brief: cleanedHtml,
      markdown: markdownOutline,
      query: konu_sorgusu,
      language,
      competitors: ['example.com', 'test.com'],
      paa_questions: [`What is ${konu_sorgusu}?`, `How to use ${konu_sorgusu}?`],
      entities: [{ name: konu_sorgusu, type: 'Topic' }],
      processing_time: 'minimal',
      source: 'gemini-minimal-test'
    });

  } catch (error) {
    console.error('💥 MINIMAL TEST API ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error in minimal test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
