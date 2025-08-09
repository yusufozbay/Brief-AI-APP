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

export class DataForSEOClient {
  private credentials: DataForSEOCredentials;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor() {
    this.credentials = {
      login: process.env.DATAFORSEO_LOGIN!,
      password: process.env.DATAFORSEO_PASSWORD!
    };
  }

  private async makeRequest(endpoint: string, data: any) {
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

  async getTopCompetitors(query: string, location: string = 'Turkey', language: string = 'tr'): Promise<SERPResult[]> {
    try {
      const data = [{
        keyword: query,
        location_name: location,
        language_name: language,
        device: 'desktop',
        os: 'windows'
      }];

      const result = await this.makeRequest('/serp/google/organic/live/advanced', data);
      
      if (result.tasks && result.tasks[0] && result.tasks[0].result) {
        const items = result.tasks[0].result[0]?.items || [];
        return items
          .filter((item: any) => item.type === 'organic')
          .slice(0, 10)
          .map((item: any) => ({
            url: item.url,
            title: item.title,
            description: item.description || ''
          }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching competitors:', error);
      return [];
    }
  }

  async getPAAQuestions(query: string, location: string = 'Turkey', language: string = 'tr'): Promise<PAAQuestion[]> {
    try {
      const data = [{
        keyword: query,
        location_name: location,
        language_name: language,
        device: 'desktop',
        os: 'windows'
      }];

      const result = await this.makeRequest('/serp/google/organic/live/advanced', data);
      
      if (result.tasks && result.tasks[0] && result.tasks[0].result) {
        const items = result.tasks[0].result[0]?.items || [];
        const paaItems = items.filter((item: any) => item.type === 'people_also_ask');
        
        return paaItems.flatMap((item: any) => 
          item.items?.map((paa: any) => ({
            question: paa.title,
            answer: paa.expanded_element?.[0]?.description
          })) || []
        );
      }

      return [];
    } catch (error) {
      console.error('Error fetching PAA questions:', error);
      return [];
    }
  }

  async getEntities(query: string): Promise<EntityResult[]> {
    try {
      // DataForSEO doesn't have a direct entity endpoint, so we'll extract from knowledge graph
      const data = [{
        keyword: query,
        location_name: 'Turkey',
        language_name: 'tr',
        device: 'desktop',
        os: 'windows'
      }];

      const result = await this.makeRequest('/serp/google/organic/live/advanced', data);
      
      if (result.tasks && result.tasks[0] && result.tasks[0].result) {
        const items = result.tasks[0].result[0]?.items || [];
        const knowledgeGraph = items.find((item: any) => item.type === 'knowledge_graph');
        
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
