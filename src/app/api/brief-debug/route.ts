import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug Brief API called');
    
    // Check environment variables
    const envCheck = {
      hasGoogleAI: !!process.env.GOOGLE_AI_API_KEY,
      hasDataForSEO: !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
      hasFirebase: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      nodeEnv: process.env.NODE_ENV
    };
    
    console.log('🔍 Environment check:', envCheck);

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('🔍 Request body parsed:', { 
        hasKonuSorgusu: !!body.konu_sorgusu,
        bodyKeys: Object.keys(body)
      });
    } catch (parseError) {
      console.error('🔍 Body parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown parse error' },
        { status: 400 }
      );
    }

    const { konu_sorgusu } = body;

    if (!konu_sorgusu) {
      return NextResponse.json(
        { error: 'konu_sorgusu is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing topic:', konu_sorgusu);

    // Test file system access
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      const cwd = process.cwd();
      console.log('🔍 Current working directory:', cwd);
      
      const promptsDir = path.join(cwd, 'prompts');
      console.log('🔍 Prompts directory:', promptsDir);
      
      const templatePath = path.join(promptsDir, 'RUNTIME_SYSTEM.tmpl.md');
      console.log('🔍 Template path:', templatePath);
      
      const templateExists = fs.existsSync(templatePath);
      console.log('🔍 Template exists:', templateExists);
      
      if (templateExists) {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        console.log('🔍 Template loaded, length:', templateContent.length);
      }
      
    } catch (fsError) {
      console.error('🔍 File system error:', fsError);
    }

    // Test Google AI import
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      console.log('🔍 Google AI imported successfully');
      
      new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
      console.log('🔍 Google AI client created');
      
    } catch (aiError) {
      console.error('🔍 Google AI error:', aiError);
    }

    return NextResponse.json({
      success: true,
      message: 'Debug completed successfully',
      topic: konu_sorgusu,
      environment: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔍 Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
