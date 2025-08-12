import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface BriefInputs {
  konu_sorgusu: string;
  google_query_fan_out_entities?: string;
  extra_subtitles?: string;
  extra_faq?: string;
  serp_competitors: string;
  paa_questions: string;
}

export async function runBrief(inputs: BriefInputs) {
  try {
    // Load runtime system prompt template with multiple path attempts
    let template: string = '';
    
    const possibleTemplatePaths = [
      path.join(process.cwd(), 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      path.join(__dirname, '..', '..', 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      path.join(process.cwd(), '..', 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      // Additional paths for different deployment scenarios
      path.join(process.cwd(), 'src', 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      path.join(__dirname, 'prompts', 'RUNTIME_SYSTEM.tmpl.md')
    ];
    


    // Try to load template
    let templateLoaded = false;
    for (const templatePath of possibleTemplatePaths) {
      try {
        if (fs.existsSync(templatePath)) {
          template = fs.readFileSync(templatePath, 'utf-8');
          templateLoaded = true;
          console.log('Template loaded from:', templatePath);
          break;
        }
      } catch {
        console.warn('Failed to load template from:', templatePath);
      }
    }

    if (!templateLoaded) {
      // CRITICAL ERROR - System prompt must load for proper Turkish SEO content
      const errorMsg = `CRITICAL: System prompt template not found in any of these paths: ${possibleTemplatePaths.join(', ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('✅ System prompt loaded successfully from file, length:', template.length);
    console.log('📝 System prompt preview (first 200 chars):', template.substring(0, 200) + '...');


    
    // Replace template variables
    const systemPrompt = template
      .replace('{{konu_sorgusu}}', inputs.konu_sorgusu)
      .replace('{{google_query_fan_out_entities}}', inputs.google_query_fan_out_entities || '')
      .replace('{{extra_subtitles}}', inputs.extra_subtitles || '')
      .replace('{{extra_faq}}', inputs.extra_faq || '')
      .replace('{{serp_competitors}}', inputs.serp_competitors)
      .replace('{{paa_questions}}', inputs.paa_questions);

    // Initialize Gemini model with optimized parameters for Turkish SEO content
    console.log('Initializing Gemini model...');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Topic (konu_sorgusu):', inputs.konu_sorgusu);
    console.log('Template loaded successfully:', templateLoaded);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Use stable Gemini 1.5 Flash for reliable performance
      generationConfig: {
        temperature: 0.2, // Lower temperature for more focused, consistent output
        topP: 0.8,
        topK: 32,
        maxOutputTokens: 3500, // Optimized for comprehensive content within timeout limits
        responseMimeType: 'text/plain'
      }
    });

    // Generate content with timeout and retry logic
    console.log('Generating content with Gemini...');
    let result;
    let response;
    let text;
    
    try {
      // Set up timeout for Gemini 2.0 Flash API call (20 seconds for comprehensive Turkish SEO content)
      const geminiPromise = model.generateContent(systemPrompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout after 20 seconds')), 20000)
      );
      
      result = await Promise.race([geminiPromise, timeoutPromise]);
      response = await (result as { response: { text: () => string } }).response;
      text = response.text();
      console.log('Gemini response received, length:', text.length);
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      throw new Error(`Gemini API failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
    }

    // Return the Markdown content directly
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    console.log('Returning Markdown content, length:', text.length);
    return text.trim();
  } catch (error) {
    console.error('Error in runBrief:', error);
    throw error;
  }
}
