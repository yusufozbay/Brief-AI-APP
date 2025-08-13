import axios from 'axios';
import { DataForSEOResponse, SERPResult, CompetitorSelection } from '../types/serp';

// DataForSEO API configuration
const DATAFORSEO_API_BASE = 'https://api.dataforseo.com/v3';

interface DataForSEOCredentials {
  login: string;
  password: string;
}

class DataForSEOService {
  private credentials: DataForSEOCredentials = {
    login: 'yusuf@admonato.com',
    password: 'ea73b2041365858f'
  };

  setCredentials(login: string, password: string) {
    this.credentials = { login, password };
  }

  private getAuthHeaders() {
    const auth = btoa(`${this.credentials.login}:${this.credentials.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchSERPResults(keyword: string, location: string = 'Turkey', language: string = 'tr'): Promise<CompetitorSelection[]> {
    try {
      const requestData = [{
        keyword: keyword,
        location_code: 2792, // Turkey location code
        language_code: language,
        device: 'mobile',
        os: 'android'
      }];

      const response = await axios.post<DataForSEOResponse>(
        `${DATAFORSEO_API_BASE}/serp/google/organic/live/advanced`,
        requestData,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.status_code === 20000 && response.data.tasks.length > 0) {
        const task = response.data.tasks[0];
        if (task.result && task.result.length > 0) {
          const serpResults = task.result[0].items;
          return this.processSERPResults(serpResults);
        }
      }

      console.warn('No valid SERP results found from DataForSEO API, falling back to mock data');
      return this.getMockSERPResults(keyword);
    } catch (error) {
      console.error('DataForSEO API Error during request:', error);
      // Fallback to mock data
      return this.getMockSERPResults(keyword);
    }
  }

  private processSERPResults(serpResults: SERPResult[]): CompetitorSelection[] {
    return serpResults
      .filter(item => item.type === 'organic')
      .slice(0, 10) // Top 10 results
      .map((item, index) => ({
        url: item.url,
        title: item.title,
        domain: item.domain,
        snippet: item.snippet || '',
        position: item.rank_absolute || index + 1,
        selected: false
      }));
  }

  private getMockSERPResults(keyword: string): CompetitorSelection[] {
    // Mock SERP results for demo
    const mockDomains = [
      'wikipedia.org',
      'medium.com',
      'hubspot.com',
      'moz.com',
      'searchengineland.com',
      'backlinko.com',
      'ahrefs.com',
      'semrush.com',
      'neilpatel.com',
      'contentmarketinginstitute.com'
    ];

    return mockDomains.map((domain, index) => ({
      url: `https://${domain}/${keyword.toLowerCase().replace(/\s+/g, '-')}`,
      title: `${keyword} - Kapsamlı Rehber | ${domain.split('.')[0].toUpperCase()}`,
      domain: domain,
      snippet: `${keyword} hakkında detaylı bilgi, stratejiler ve uygulama örnekleri. Uzmanlar tarafından hazırlanmış kapsamlı içerik.`,
      position: index + 1,
      selected: false
    }));
  }

  async analyzeCompetitorContent(url: string): Promise<{
    title: string;
    headings: string[];
    wordCount: number;
    contentStructure: string[];
    tone: string;
    strengths: string[];
    weaknesses: string[];
  }> {
    // In a real implementation, this would scrape and analyze the competitor's content
    // For now, return mock analysis data
    return {
      title: "Rakip İçerik Analizi",
      headings: [
        "Giriş ve Temel Kavramlar",
        "Avantajlar ve Dezavantajlar", 
        "Uygulama Adımları",
        "Örnekler ve Vaka Çalışmaları",
        "Sonuç ve Öneriler"
      ],
      wordCount: Math.floor(Math.random() * 2000) + 1500,
      contentStructure: ["H1", "H2", "H3", "Liste", "Görsel", "Video"],
      tone: "Profesyonel ve bilgilendirici",
      strengths: [
        "Kapsamlı konu işleme",
        "Görsel destekli anlatım",
        "Pratik örnekler"
      ],
      weaknesses: [
        "Güncel veri eksikliği",
        "Yerel örnekler az",
        "Derinlemesine analiz eksik"
      ]
    };
  }
}

export const dataForSEOService = new DataForSEOService();