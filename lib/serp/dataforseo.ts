interface DataForSEOCredentials {
  login: string;
  password: string;
}

interface SERPResult {
  url: string;
  title: string;
  description: string;
}

interface PAAQuestion {
  question: string;
  answer?: string;
}

interface EntityResult {
  name: string;
  type: string;
  description?: string;
}

interface Competitor {
  url: string;
  title: string;
  description: string;
}

export class DataForSEOClient {
  private credentials: DataForSEOCredentials;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor() {
    this.credentials = {
      login: process.env.DATAFORSEO_LOGIN!,
      password: process.env.DATAFORSEO_PASSWORD!
    };
  }

  private async makeRequest(endpoint: string, data: unknown) {
    const auth = Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString('base64');
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('DataForSEO API request timed out after 8 seconds');
      }
      throw error;
    }
  }

  async getTopCompetitors(query: string, _location: string = 'Turkey', language: string = 'tr'): Promise<Competitor[]> {
    const postData = [{
      language_code: language,
      location_code: 2792, // Turkey location code
      keyword: query,
      depth: 20,
      device: 'desktop',
      os: 'windows'
    }];

    console.log('🔍 DataForSEO Competitors Request:', {
      endpoint: '/serp/google/organic/live/advanced',
      params: postData[0],
      timestamp: new Date().toISOString(),
      credentials_configured: !!(this.credentials.login && this.credentials.password)
    });

    try {
      const response = await this.makeRequest('/serp/google/organic/live/advanced', postData);
      
      console.log('📡 DataForSEO Response Structure:', {
        has_tasks: !!response.tasks,
        tasks_length: response.tasks?.length || 0,
        has_result: !!response.tasks?.[0]?.result,
        result_length: response.tasks?.[0]?.result?.length || 0,
        has_items: !!response.tasks?.[0]?.result?.[0]?.items,
        items_length: response.tasks?.[0]?.result?.[0]?.items?.length || 0,
        status_code: response.tasks?.[0]?.status_code,
        status_message: response.tasks?.[0]?.status_message
      });
      
      if (response.tasks?.[0]?.result?.[0]?.items) {
        const items = response.tasks[0].result[0].items;
        const competitors = items
          .filter((item: { url?: string; title?: string; description?: string }) => item.url && item.title && item.description)
          .slice(0, 10)
          .map((item: { url?: string; title?: string; description?: string }) => ({
            url: item.url || '',
            title: item.title || '',
            description: item.description || ''
          }));

        console.log('📊 Real Competitors Found:', competitors.length);
        competitors.forEach((comp: Competitor, index: number) => {
          console.log(`🏆 Competitor ${index + 1}:`, {
            title: comp.title.substring(0, 60) + (comp.title.length > 60 ? '...' : ''),
            url: comp.url,
            description: comp.description.substring(0, 100) + (comp.description.length > 100 ? '...' : '')
          });
        });

        return competitors;
      }
      
      console.warn('⚠️ No competitor data found in DataForSEO response');
      console.log('Full response for debugging:', JSON.stringify(response, null, 2));
      return [];
    } catch (error) {
      console.error('❌ Error fetching competitors from DataForSEO:', error);
      throw error;
    }
  }

  async getPAAQuestions(query: string, _location: string = 'Turkey', language: string = 'tr'): Promise<PAAQuestion[]> {
    const postData = [{
      language_code: language,
      location_code: 2792, // Turkey location code
      keyword: query
    }];

    console.log('❓ DataForSEO PAA Request:', {
      endpoint: '/serp/google/organic/live/advanced',
      params: postData[0],
      timestamp: new Date().toISOString()
    });

    try {
      const response = await this.makeRequest('/serp/google/organic/live/advanced', postData);
      
      if (response.tasks?.[0]?.result?.[0]?.items) {
        const items = response.tasks[0].result[0].items;
        const paaItems = items.filter((item: { type?: string }) => item.type === 'people_also_ask');
        
        const questions = paaItems.flatMap((item: { items?: Array<{ title?: string; snippet?: string }> }) => 
          item.items?.map((paa: { title?: string; snippet?: string }) => ({
            question: paa.title || '',
            answer: paa.snippet || ''
          })) || []
        );

        console.log('❓ PAA Questions Found:', questions.length);
        questions.forEach((paa: PAAQuestion, index: number) => {
          console.log(`❓ PAA ${index + 1}:`, {
            question: paa.question.substring(0, 80) + (paa.question.length > 80 ? '...' : ''),
            answer: paa.answer ? paa.answer.substring(0, 100) + (paa.answer.length > 100 ? '...' : '') : 'No answer'
          });
        });

        return questions;
      }
      
      console.warn('⚠️ No PAA data found in response');
      return [];
    } catch (error) {
      console.error('❌ Error fetching PAA questions:', error);
      throw error;
    }
  }

  async getEntities(query: string): Promise<EntityResult[]> {
    try {
      // DataForSEO doesn't have a direct entity endpoint, so we'll extract from knowledge graph
      const data = [{
        keyword: query,
        location_code: 2792, // Turkey location code
        language_code: 'tr',
        device: 'mobile',
        os: 'android'
      }];

      const result = await this.makeRequest('/serp/google/organic/live/advanced', data);
      
      if (result.tasks && result.tasks[0] && result.tasks[0].result) {
        const items = result.tasks[0].result[0]?.items || [];
        const knowledgeGraph = items.find((item: { type: string }) => item.type === 'knowledge_graph') as { title: string; sub_title?: string; description?: string } | undefined;
        
        if (knowledgeGraph) {
          return [{
            name: knowledgeGraph.title,
            type: knowledgeGraph.sub_title || 'Entity',
            description: knowledgeGraph.description
          }];
        }
      }

      return [];
    } catch (error) {
      console.error('Error fetching entities:', error);
      return [];
    }
  }

  formatCompetitorsForPrompt(competitors: SERPResult[]): string {
    return competitors
      .map((comp, index) => `${index + 1}. ${comp.title}\n   URL: ${comp.url}\n   Description: ${comp.description}`)
      .join('\n\n');
  }

  formatPAAForPrompt(questions: PAAQuestion[]): string {
    return questions
      .map((q, index) => `${index + 1}. ${q.question}${q.answer ? `\n   Answer: ${q.answer}` : ''}`)
      .join('\n\n');
  }
}
