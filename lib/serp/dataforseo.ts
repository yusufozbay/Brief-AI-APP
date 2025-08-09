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
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTopCompetitors(query: string, location: string = 'Turkey', language: string = 'tr'): Promise<Competitor[]> {
    const postData = [{
      language_code: language,
      location_name: location,
      keyword: query,
      depth: 10
    }];

    console.log(' DataForSEO Competitors Request:', {
      endpoint: '/serp/google/organic/live/advanced',
      params: postData[0],
      timestamp: new Date().toISOString()
    });

    try {
      const response = await this.makeRequest('/serp/google/organic/live/advanced', postData);
      
      if (response.tasks?.[0]?.result?.[0]?.items) {
        const items = response.tasks[0].result[0].items;
        const competitors = items.slice(0, 10).map((item: { url?: string; title?: string; description?: string }) => ({
          url: item.url || '',
          title: item.title || '',
          description: item.description || ''
        }));

        console.log('📊 Competitors Found:', competitors.length);
        competitors.forEach((comp: Competitor, index: number) => {
          console.log(`🏆 Competitor ${index + 1}:`, {
            title: comp.title.substring(0, 60) + (comp.title.length > 60 ? '...' : ''),
            url: comp.url,
            description: comp.description.substring(0, 100) + (comp.description.length > 100 ? '...' : '')
          });
        });

        return competitors;
      }
      
      console.warn(' No competitor data found in response');
      return [];
    } catch (error) {
      console.error(' Error fetching competitors:', error);
      throw error;
    }
  }

  async getPAAQuestions(query: string, location: string = 'Turkey', language: string = 'tr'): Promise<PAAQuestion[]> {
    const postData = [{
      language_code: language,
      location_name: location,
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
        location_name: 'Turkey',
        language_name: 'tr',
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
