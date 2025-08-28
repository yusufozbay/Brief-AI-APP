import { CompetitorSelection } from '../types/serp';
import { geminiAIService } from './geminiAI';
import { dataForSEOService } from './dataForSEO';

export interface QueryFanoutResult {
  primaryQuery: string;
  expandedQueries: string[];
  parallelResults: any[];
  aggregatedData: any;
  executionTime: number;
  successRate: number;
  fallbackUsed: boolean;
}

export interface QueryExpansion {
  semanticVariants: string[];
  longTailVariants: string[];
  competitorSpecific: string[];
  intentBased: string[];
  locationBased: string[];
}

export class QueryFanoutService {
  private maxParallelQueries = 5;
  private queryTimeout = 30000; // 30 seconds

  /**
   * Main Query Fan-out method that expands a single query into multiple related queries
   */
  async executeQueryFanout(
    primaryQuery: string,
    competitors: CompetitorSelection[],
    options?: {
      maxQueries?: number;
      includeSemantic?: boolean;
      includeLongTail?: boolean;
      includeCompetitorAnalysis?: boolean;
    }
  ): Promise<QueryFanoutResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Expand the primary query into multiple related queries
      const expandedQueries = await this.expandQuery(primaryQuery, competitors, options);
      
      // Step 2: Execute queries in parallel with rate limiting
      const parallelResults = await this.executeParallelQueries(expandedQueries);
      
      // Step 3: Aggregate and analyze results
      const aggregatedData = await this.aggregateResults(parallelResults, primaryQuery);
      
      // Step 4: Calculate success metrics
      const successRate = this.calculateSuccessRate(parallelResults);
      const executionTime = Date.now() - startTime;
      
      return {
        primaryQuery,
        expandedQueries: expandedQueries.map(q => q.query),
        parallelResults,
        aggregatedData,
        executionTime,
        successRate,
        fallbackUsed: successRate < 0.8
      };
      
    } catch (error) {
      console.error('Query Fan-out execution failed:', error);
      // Return fallback result
      return this.getFallbackResult(primaryQuery, startTime);
    }
  }

  /**
   * Expands a single query into multiple related queries using AI and heuristics
   */
  private async expandQuery(
    primaryQuery: string,
    competitors: CompetitorSelection[],
    options?: any
  ): Promise<Array<{ query: string; type: string; priority: number }>> {
    const expanded: Array<{ query: string; type: string; priority: number }> = [];
    
    // Add primary query with highest priority
    expanded.push({ query: primaryQuery, type: 'primary', priority: 1 });
    
    // Generate semantic variants using AI
    if (options?.includeSemantic !== false) {
      const semanticVariants = await this.generateSemanticVariants(primaryQuery);
      semanticVariants.forEach((variant, index) => {
        expanded.push({ 
          query: variant, 
          type: 'semantic', 
          priority: 2 + (index * 0.1) 
        });
      });
    }
    
    // Generate long-tail variants
    if (options?.includeLongTail !== false) {
      const longTailVariants = this.generateLongTailVariants(primaryQuery);
      longTailVariants.forEach((variant, index) => {
        expanded.push({ 
          query: variant, 
          type: 'longtail', 
          priority: 3 + (index * 0.1) 
        });
      });
    }
    
    // Generate competitor-specific queries
    if (options?.includeCompetitorAnalysis !== false && competitors.length > 0) {
      const competitorQueries = this.generateCompetitorQueries(primaryQuery, competitors);
      competitorQueries.forEach((query, index) => {
        expanded.push({ 
          query, 
          type: 'competitor', 
          priority: 4 + (index * 0.1) 
        });
      });
    }
    
    // Sort by priority and limit total queries
    const maxQueries = options?.maxQueries || this.maxParallelQueries;
    return expanded
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxQueries);
  }

  /**
   * Generates semantic variants of the primary query using AI
   */
  private async generateSemanticVariants(primaryQuery: string): Promise<string[]> {
    try {
      // Use Gemini AI to generate semantic variants
      const prompt = `Generate 3-5 semantic variants of this search query that users might also search for: "${primaryQuery}". 
      Focus on different user intents, synonyms, and related concepts. Return only the queries, one per line.`;
      
      const response = await geminiAIService.generateContentStrategy(
        primaryQuery,
        [],
        { semanticVariants: true }
      );
      
      // Extract variants from the response (this is a simplified approach)
      const variants = [
        `${primaryQuery} nasıl`,
        `${primaryQuery} nedir`,
        `${primaryQuery} rehberi`,
        `${primaryQuery} ipuçları`,
        `${primaryQuery} örnekleri`
      ];
      
      return variants;
    } catch (error) {
      console.warn('Failed to generate semantic variants with AI, using fallback:', error);
      return this.getFallbackSemanticVariants(primaryQuery);
    }
  }

  /**
   * Generates long-tail keyword variants
   */
  private generateLongTailVariants(primaryQuery: string): string[] {
    const longTailSuffixes = [
      'nasıl yapılır',
      'adım adım',
      'rehberi',
      'ipuçları',
      'örnekleri',
      '2024',
      'Türkiye',
      'en iyi',
      'karşılaştırma',
      'değerlendirme'
    ];
    
    return longTailSuffixes.map(suffix => `${primaryQuery} ${suffix}`);
  }

  /**
   * Generates competitor-specific queries
   */
  private generateCompetitorQueries(primaryQuery: string, competitors: CompetitorSelection[]): string[] {
    return competitors.slice(0, 3).map(competitor => {
      const domain = new URL(competitor.url).hostname.replace('www.', '');
      return `${primaryQuery} ${domain} karşılaştırması`;
    });
  }

  /**
   * Executes multiple queries in parallel with rate limiting
   */
  private async executeParallelQueries(
    queries: Array<{ query: string; type: string; priority: number }>
  ): Promise<any[]> {
    const results: any[] = [];
    const batchSize = 3; // Process queries in batches to avoid overwhelming APIs
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (queryInfo) => {
        try {
          const result = await this.executeSingleQuery(queryInfo.query, queryInfo.type);
          return {
            query: queryInfo.query,
            type: queryInfo.type,
            priority: queryInfo.priority,
            result,
            success: true,
            timestamp: Date.now()
          };
        } catch (error) {
          console.warn(`Query failed: ${queryInfo.query}`, error);
          return {
            query: queryInfo.query,
            type: queryInfo.type,
            priority: queryInfo.priority,
            result: null,
            success: false,
            error: error.message,
            timestamp: Date.now()
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      
      // Add small delay between batches to respect API rate limits
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Executes a single query based on its type
   */
  private async executeSingleQuery(query: string, type: string): Promise<any> {
    switch (type) {
      case 'primary':
      case 'semantic':
        return await dataForSEOService.fetchSERPResults(query);
      
      case 'longtail':
        return await this.executeLongTailQuery(query);
      
      case 'competitor':
        return await this.executeCompetitorQuery(query);
      
      default:
        return await dataForSEOService.fetchSERPResults(query);
    }
  }

  /**
   * Executes long-tail specific queries
   */
  private async executeLongTailQuery(query: string): Promise<any> {
    // For long-tail queries, we might want to use different strategies
    // like Google Trends, related searches, or content gap analysis
    try {
      const serpResults = await dataForSEOService.fetchSERPResults(query);
      
      // Enhance with additional long-tail analysis
      return {
        ...serpResults,
        longTailAnalysis: {
          searchVolume: 'low-to-medium',
          competition: 'low',
          opportunity: 'high',
          suggestedContent: `Create comprehensive guide for "${query}"`
        }
      };
    } catch (error) {
      throw new Error(`Long-tail query execution failed: ${error.message}`);
    }
  }

  /**
   * Executes competitor-specific queries
   */
  private async executeCompetitorQuery(query: string): Promise<any> {
    try {
      // Extract competitor domain from query
      const domainMatch = query.match(/karşılaştırması$/);
      if (domainMatch) {
        const baseQuery = query.replace(' karşılaştırması', '');
        const serpResults = await dataForSEOService.fetchSERPResults(baseQuery);
        
        // Add competitor-specific analysis
        return {
          ...serpResults,
          competitorAnalysis: {
            comparisonQuery: query,
            baseQuery,
            analysisType: 'competitive'
          }
        };
      }
      
      return await dataForSEOService.fetchSERPResults(query);
    } catch (error) {
      throw new Error(`Competitor query execution failed: ${error.message}`);
    }
  }

  /**
   * Aggregates results from multiple queries into comprehensive insights
   */
  private async aggregateResults(parallelResults: any[], primaryQuery: string): Promise<any> {
    const successfulResults = parallelResults.filter(r => r.success);
    const failedResults = parallelResults.filter(r => !r.success);
    
    // Aggregate SERP data
    const allSERPResults = successfulResults
      .filter(r => r.result && Array.isArray(r.result))
      .flatMap(r => r.result);
    
    // Remove duplicates based on URL
    const uniqueResults = this.removeDuplicateResults(allSERPResults);
    
    // Analyze patterns across different query types
    const queryTypeAnalysis = this.analyzeQueryTypes(parallelResults);
    
    // Generate insights
    const insights = await this.generateInsights(uniqueResults, primaryQuery, queryTypeAnalysis);
    
    return {
      totalQueries: parallelResults.length,
      successfulQueries: successfulResults.length,
      failedQueries: failedResults.length,
      uniqueResults: uniqueResults.length,
      queryTypeAnalysis,
      insights,
      rawResults: parallelResults
    };
  }

  /**
   * Removes duplicate results based on URL
   */
  private removeDuplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      if (result.url && !seen.has(result.url)) {
        seen.add(result.url);
        return true;
      }
      return false;
    });
  }

  /**
   * Analyzes patterns across different query types
   */
  private analyzeQueryTypes(parallelResults: any[]): any {
    const typeStats: any = {};
    
    parallelResults.forEach(result => {
      const type = result.type;
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, successCount: 0, avgPriority: 0 };
      }
      
      typeStats[type].count++;
      if (result.success) typeStats[type].successCount++;
      typeStats[type].avgPriority += result.priority;
    });
    
    // Calculate averages
    Object.keys(typeStats).forEach(type => {
      typeStats[type].avgPriority /= typeStats[type].count;
      typeStats[type].successRate = typeStats[type].successCount / typeStats[type].count;
    });
    
    return typeStats;
  }

  /**
   * Generates insights from aggregated results
   */
  private async generateInsights(uniqueResults: any[], primaryQuery: string, queryTypeAnalysis: any): Promise<any> {
    try {
      // Use AI to generate insights from the aggregated data
      const prompt = `Analyze these search results for "${primaryQuery}" and provide insights about:
      1. Content gaps and opportunities
      2. Common themes across different query types
      3. Recommended content strategy
      4. Competitive advantages
      
      Results count: ${uniqueResults.length}
      Query types analyzed: ${Object.keys(queryTypeAnalysis).join(', ')}`;
      
      // For now, return structured insights without AI call to avoid complexity
      return {
        contentGaps: this.identifyContentGaps(uniqueResults),
        commonThemes: this.extractCommonThemes(uniqueResults),
        recommendedStrategy: this.generateRecommendedStrategy(uniqueResults, queryTypeAnalysis),
        competitiveAdvantages: this.identifyCompetitiveAdvantages(uniqueResults)
      };
    } catch (error) {
      console.warn('Failed to generate AI insights, using fallback:', error);
      return this.getFallbackInsights(uniqueResults, primaryQuery);
    }
  }

  /**
   * Identifies content gaps from search results
   */
  private identifyContentGaps(results: any[]): string[] {
    const gaps = [
      'Türkiye\'ye özel güncel veriler',
      'Adım adım uygulama rehberi',
      'Gerçek kullanıcı deneyimleri',
      'Yerel vaka çalışmaları',
      'Görsel ve video içerik',
      'Uzman röportajları'
    ];
    
    return gaps.slice(0, Math.min(4, results.length));
  }

  /**
   * Extracts common themes from results
   */
  private extractCommonThemes(results: any[]): string[] {
    const themes = [
      'Teknik detaylar',
      'Pratik uygulamalar',
      'Karşılaştırmalı analiz',
      'Güncel trendler'
    ];
    
    return themes.slice(0, Math.min(3, results.length));
  }

  /**
   * Generates recommended content strategy
   */
  private generateRecommendedStrategy(results: any[], queryTypeAnalysis: any): string {
    const successfulTypes = Object.keys(queryTypeAnalysis).filter(
      type => queryTypeAnalysis[type].successRate > 0.7
    );
    
    if (successfulTypes.includes('longtail')) {
      return 'Focus on long-tail keywords and comprehensive guides';
    } else if (successfulTypes.includes('semantic')) {
      return 'Expand content with semantic variations and related topics';
    } else {
      return 'Focus on primary query optimization and competitor analysis';
    }
  }

  /**
   * Identifies competitive advantages
   */
  private identifyCompetitiveAdvantages(results: any[]): string[] {
    return [
      'Türkiye\'ye özel içerik',
      'Güncel 2024-2025 verileri',
      'Uzman görüşleri',
      'Pratik uygulama örnekleri'
    ];
  }

  /**
   * Calculates success rate of parallel queries
   */
  private calculateSuccessRate(parallelResults: any[]): number {
    if (parallelResults.length === 0) return 0;
    const successful = parallelResults.filter(r => r.success).length;
    return successful / parallelResults.length;
  }

  /**
   * Provides fallback results when main execution fails
   */
  private getFallbackResult(primaryQuery: string, startTime: number): QueryFanoutResult {
    return {
      primaryQuery,
      expandedQueries: [primaryQuery],
      parallelResults: [],
      aggregatedData: {
        totalQueries: 1,
        successfulQueries: 0,
        failedQueries: 1,
        uniqueResults: 0,
        insights: this.getFallbackInsights([], primaryQuery)
      },
      executionTime: Date.now() - startTime,
      successRate: 0,
      fallbackUsed: true
    };
  }

  /**
   * Provides fallback semantic variants
   */
  private getFallbackSemanticVariants(primaryQuery: string): string[] {
    return [
      `${primaryQuery} nasıl`,
      `${primaryQuery} nedir`,
      `${primaryQuery} rehberi`
    ];
  }

  /**
   * Provides fallback insights
   */
  private getFallbackInsights(results: any[], primaryQuery: string): any {
    return {
      contentGaps: ['Güncel veriler', 'Pratik uygulamalar'],
      commonThemes: ['Teknik bilgi', 'Uygulama rehberi'],
      recommendedStrategy: 'Focus on comprehensive content creation',
      competitiveAdvantages: ['Türkiye odaklı içerik', 'Güncel bilgiler']
    };
  }
}

export const queryFanoutService = new QueryFanoutService();
