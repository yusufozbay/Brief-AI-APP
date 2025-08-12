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
      path.join(process.cwd(), '..', 'prompts', 'RUNTIME_SYSTEM.tmpl.md')
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
      // Fallback template
      template = `You are a Senior SEO Strategist and Master Content Planner.
Your job: produce an ultra-detailed outline that is **actionable, E-E-A-T aligned, intent-matched, and fully scannable**.

# Non-negotiable Rules
- Depth over surface: explain how to apply, pitfalls, pros/cons, strategy.
- Structure: H1 > H2 > H3 > H4 (no jumps). Short paragraphs: ≤55 words.
- First paragraph: **no internal or external links**.
- Link policy: cadence ~ every 250 words; no generic anchors; no chain-linking.
- Media: each H2 includes at least one relevant media suggestion.
- Tone: credible, clear, lightly story-driven; bold only for key facts.
- UVP: must include a unique angle (case, data, interview, or methodology).
- Living content: include update cadence notes.

# Inputs
- Topic: {{konu_sorgusu}}
- Fan-Out Entities (optional): {{google_query_fan_out_entities}}
- Top competitors (URLs + brief notes): {{serp_competitors}}
- People Also Ask: {{paa_questions}}

# Required Output
Return **valid JSON** that matches the provided JSON Schema exactly.
Populate every field. Do not include markdown. No prose outside JSON.`;
      console.warn('Using fallback template');
    }


    
    // Replace template variables
    const systemPrompt = template
      .replace('{{konu_sorgusu}}', inputs.konu_sorgusu)
      .replace('{{google_query_fan_out_entities}}', inputs.google_query_fan_out_entities || '')
      .replace('{{extra_subtitles}}', inputs.extra_subtitles || '')
      .replace('{{extra_faq}}', inputs.extra_faq || '')
      .replace('{{serp_competitors}}', inputs.serp_competitors)
      .replace('{{paa_questions}}', inputs.paa_questions);

    // Initialize Gemini model with optimized parameters for Markdown output
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Use stable model instead of experimental
      generationConfig: {
        temperature: 0.1, // Very low temperature for faster, more consistent output
        topP: 0.8,
        topK: 32,
        maxOutputTokens: 3000, // Further reduced to speed up generation
        responseMimeType: 'text/plain' // Changed from JSON to plain text for Markdown
      }
    });

    // Generate content with timeout and retry logic
    console.log('Generating content with Gemini...');
    let result;
    let response;
    let text;
    
    try {
      // Set up timeout for Gemini API call (8 seconds to allow more comprehensive output)
      const geminiPromise = model.generateContent(systemPrompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout after 8 seconds')), 8000)
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
