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

// Define comprehensive Gemini Models Configuration - Fast configuration optimized for Netlify constraints
const GEMINI_MODELS = [
  { name: 'gemini-1.5-flash', maxTokens: 4096 },
  { name: 'gemini-1.5-flash-8b', maxTokens: 4096 },
  { name: 'gemini-2.0-flash', maxTokens: 4096 },
  { name: 'gemini-1.5-pro', maxTokens: 4096 },
  { name: 'gemini-2.5-flash', maxTokens: 4096 }
];

async function tryGeminiModel(modelConfig: { name: string; maxTokens: number }, systemPrompt: string, genAI: GoogleGenerativeAI) {
  console.log(`🤖 Trying ${modelConfig.name} with comprehensive generation like working Netlify app...`);
  
  try {
    const generationConfig = {
      temperature: 0.9,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: modelConfig.maxTokens,
      responseMimeType: "text/plain",
    };

    const model = genAI.getGenerativeModel({
      model: modelConfig.name,
      generationConfig,
    });

    // No timeout - let Gemini process as long as needed
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.trim().length < 200) {
      throw new Error(`${modelConfig.name} generated insufficient content (${text?.length || 0} chars)`);
    }
    
    console.log(`✅ ${modelConfig.name} SUCCESS - Generated ${text.length} characters`);
    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`❌ ${modelConfig.name} failed: ${errorMessage}`);
    throw error;
  }
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

    console.log('🚀 Starting Gemini Model Callback Pipeline...');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Topic (konu_sorgusu):', inputs.konu_sorgusu);
    console.log('Template loaded successfully:', templateLoaded);
    
    // Try models in priority order with callback pipeline
    let text: string | null = null;
    let lastError: Error | null = null;
    
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const modelConfig = GEMINI_MODELS[i];
      

      
      try {
        text = await tryGeminiModel(modelConfig, systemPrompt, genAI);
        console.log(`🎉 SUCCESS with ${modelConfig.name}!`);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ ${modelConfig.name} failed:`, lastError.message);
        
        if (i < GEMINI_MODELS.length - 1) {
          console.log(`🔄 Falling back to next model...`);
        } else {
          console.error('💥 All Gemini models failed!');
        }
      }
    }
    
    if (!text) {
      throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
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
