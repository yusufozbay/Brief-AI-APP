import { GoogleGenerativeAI } from '@google/generative-ai';
import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface BriefInputs {
  konu_sorgusu: string;
  google_query_fan_out_entities?: string;
  serp_competitors: string;
  paa_questions: string;
}

export async function runBrief(inputs: BriefInputs) {
  try {
    // Load runtime system prompt template
    const templatePath = path.join(process.cwd(), 'prompts', 'RUNTIME_SYSTEM.tmpl.md');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // Load JSON schema
    const schemaPath = path.join(process.cwd(), 'prompts', 'OUTPUT.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    
    // Inject variables into template
    const systemPrompt = template
      .replace('{{konu_sorgusu}}', inputs.konu_sorgusu)
      .replace('{{google_query_fan_out_entities}}', inputs.google_query_fan_out_entities || 'None provided')
      .replace('{{serp_competitors}}', inputs.serp_competitors)
      .replace('{{paa_questions}}', inputs.paa_questions);

    // Initialize Gemini model with specified parameters
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

    // Generate content
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse and validate JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error}`);
    }

    // Validate against schema
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(parsedResponse);

    if (!valid) {
      // Attempt one repair pass
      const repairPrompt = `The following JSON response failed validation. Please fix it to match the schema exactly:\n\n${text}\n\nValidation errors: ${JSON.stringify(validate.errors)}\n\nReturn only valid JSON that matches the schema.`;
      
      const repairResult = await model.generateContent(repairPrompt);
      const repairResponse = await repairResult.response;
      const repairedText = repairResponse.text();
      
      try {
        parsedResponse = JSON.parse(repairedText);
        const revalidate = ajv.compile(schema);
        const revalid = revalidate(parsedResponse);
        
        if (!revalid) {
          throw new Error(`Schema validation failed after repair: ${JSON.stringify(revalidate.errors)}`);
        }
      } catch (error) {
        throw new Error(`Repair attempt failed: ${error}`);
      }
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error in runBrief:', error);
    throw error;
  }
}
