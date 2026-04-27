import axios from 'axios';
import { DataForSEOResponse, SERPResult, CompetitorSelection } from '../types/serp';

const WORKER_BRIDGE_URL = (import.meta.env.VITE_WORKER_BRIDGE_URL || '').replace(/\/$/, '');
const DATAFORSEO_WORKER_PROXY_URL = WORKER_BRIDGE_URL ? `${WORKER_BRIDGE_URL}/api/dataforseo/serp` : '';
const DATAFORSEO_NETLIFY_PROXY_URL = '/.netlify/functions/dataforseo-proxy';

class DataForSEOService {
  private async requestSERP(requestData: any[]): Promise<DataForSEOResponse> {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (DATAFORSEO_WORKER_PROXY_URL) {
      try {
        const workerResponse = await axios.post<DataForSEOResponse>(
          DATAFORSEO_WORKER_PROXY_URL,
          requestData,
          { headers }
        );
        return workerResponse.data;
      } catch (workerError) {
        console.warn('⚠️ Worker DataForSEO request failed, trying Netlify fallback:', workerError);
      }
    } else {
      console.warn('⚠️ VITE_WORKER_BRIDGE_URL is not configured. Using Netlify fallback for DataForSEO.');
    }

    const netlifyResponse = await axios.post<DataForSEOResponse>(
      DATAFORSEO_NETLIFY_PROXY_URL,
      requestData,
      { headers }
    );

    return netlifyResponse.data;
  }

  async fetchSERPResults(keyword: string, location: string = 'Turkey', language: string = 'tr'): Promise<CompetitorSelection[]> {
    try {
      const requestData = [{
        keyword: keyword,
        location_code: 2792, // Turkey location code
        language_code: language,
        device: 'mobile',
        os: 'android',
        depth: 10, // Limit to 10 results to avoid Google's num=100 removal issue
        max_crawl_pages: 1 // Only crawl first page
      }];

      const responseData = await this.requestSERP(requestData);

      if (responseData.status_code === 20000 && responseData.tasks.length > 0) {
        const task = responseData.tasks[0];
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
        selected: true // Automatically select all competitors
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
      selected: true // Automatically select all competitors
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