import { GoogleGenerativeAI } from '@google/generative-ai';
import Ajv from 'ajv';
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
    let schema: object = {};
    
    const possibleTemplatePaths = [
      path.join(process.cwd(), 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      path.join(__dirname, '..', '..', 'prompts', 'RUNTIME_SYSTEM.tmpl.md'),
      path.join(process.cwd(), '..', 'prompts', 'RUNTIME_SYSTEM.tmpl.md')
    ];
    
    const possibleSchemaPaths = [
      path.join(process.cwd(), 'prompts', 'OUTPUT.schema.json'),
      path.join(__dirname, '..', '..', 'prompts', 'OUTPUT.schema.json'),
      path.join(process.cwd(), '..', 'prompts', 'OUTPUT.schema.json')
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

    // Try to load schema
    let schemaLoaded = false;
    for (const schemaPath of possibleSchemaPaths) {
      try {
        if (fs.existsSync(schemaPath)) {
          schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
          schemaLoaded = true;
          console.log('Schema loaded from:', schemaPath);
          break;
        }
      } catch {
        console.warn('Failed to load schema from:', schemaPath);
      }
    }

    if (!schemaLoaded) {
      // Fallback schema - basic structure
      schema = {
        type: "object",
        required: ["konu", "strateji", "title_meta", "outline", "eeat", "schema_org", "faq", "qc"],
        properties: {
          konu: { type: "string" },
          strateji: {
            type: "object",
            required: ["intent", "tone", "uvp", "rekabet_ozeti", "hedef_anahtar", "ikincil_anahtarlar"],
            properties: {
              intent: { type: "string" },
              tone: { type: "string" },
              uvp: { type: "string" },
              rekabet_ozeti: { type: "string" },
              hedef_anahtar: { type: "string" },
              ikincil_anahtarlar: { type: "array", items: { type: "string" } }
            }
          },
          title_meta: {
            type: "object",
            required: ["title_click", "title_seo", "meta"],
            properties: {
              title_click: { type: "string" },
              title_seo: { type: "string" },
              meta: { type: "string" }
            }
          },
          outline: {
            type: "object",
            required: ["h1", "giris", "bolumler"],
            properties: {
              h1: { type: "string" },
              giris: { type: "string" },
              bolumler: {
                type: "array",
                items: {
                  type: "object",
                  required: ["h2", "icerik_notu", "media", "kilit_bilgi", "alt"],
                  properties: {
                    h2: { type: "string" },
                    icerik_notu: { type: "string" },
                    media: { type: "string" },
                    kilit_bilgi: { type: "string" },
                    alt: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["h3", "icerik_notu"],
                        properties: {
                          h3: { type: "string" },
                          icerik_notu: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          eeat: {
            type: "object",
            required: ["yazar_onerisi", "veri_kaynak_onerileri", "entity_entegrasyonu", "guncellik_plani"],
            properties: {
              yazar_onerisi: { type: "string" },
              veri_kaynak_onerileri: { type: "array", items: { type: "string" } },
              entity_entegrasyonu: { type: "array", items: { type: "string" } },
              guncellik_plani: {
                type: "object",
                required: ["yillik_kontrol", "veri_tazeleme"],
                properties: {
                  yillik_kontrol: { type: "string" },
                  veri_tazeleme: { type: "string" }
                }
              }
            }
          },
          schema_org: {
            type: "object",
            required: ["ana", "destekleyici", "gerekce"],
            properties: {
              ana: { type: "string" },
              destekleyici: { type: "array", items: { type: "string" } },
              gerekce: { type: "string" }
            }
          },
          faq: {
            type: "array",
            items: {
              type: "object",
              required: ["soru", "cevap"],
              properties: {
                soru: { type: "string" },
                cevap: { type: "string" }
              }
            }
          },
          qc: {
            type: "object",
            required: ["ozgunluk", "baslik_giris", "okunabilirlik", "eeat", "gorsel", "linkleme", "sss", "dilbilgisi"],
            properties: {
              ozgunluk: { type: "boolean" },
              baslik_giris: { type: "boolean" },
              okunabilirlik: { type: "boolean" },
              eeat: { type: "boolean" },
              gorsel: { type: "boolean" },
              linkleme: { type: "boolean" },
              sss: { type: "boolean" },
              dilbilgisi: { type: "boolean" }
            }
          }
        }
      };
      console.warn('Using fallback schema');
    }
    
    // Replace template variables
    const systemPrompt = template
      .replace('{{konu_sorgusu}}', inputs.konu_sorgusu)
      .replace('{{google_query_fan_out_entities}}', inputs.google_query_fan_out_entities || '')
      .replace('{{extra_subtitles}}', inputs.extra_subtitles || '')
      .replace('{{extra_faq}}', inputs.extra_faq || '')
      .replace('{{serp_competitors}}', inputs.serp_competitors)
      .replace('{{paa_questions}}', inputs.paa_questions);

    // Initialize Gemini model with specified parameters
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json'
        // Note: responseSchema removed for compatibility
      }
    });

    // Generate content with retry logic
    console.log('Generating content with Gemini...');
    let result;
    let response;
    let text;
    
    try {
      result = await model.generateContent(systemPrompt);
      response = await result.response;
      text = response.text();
      console.log('Gemini response received, length:', text.length);
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      throw new Error(`Gemini API failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
    }

    // Parse and validate JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error}`);
    }

    // Validate against schema
    const ajv = new Ajv({ 
      strict: false,
      validateSchema: false,
      addUsedSchema: false
    });
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
        const revalidateAjv = new Ajv({ 
          strict: false,
          validateSchema: false,
          addUsedSchema: false
        });
        const revalidate = revalidateAjv.compile(schema);
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
