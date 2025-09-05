import { 
  RefinedQuery, 
  QueryResult, 
  BriefQueryResult, 
  BriefOpportunity,
  CircuitBreakerState,
  BriefAnalysisRequest,
  BriefAnalysisResult
} from '../types/queryFanout';
import { geminiAIService } from './geminiAI';

export class ParallelBriefProcessor {
  private concurrencyLimit: number = 10;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryWrapper: RetryWrapper;
  private geminiService = geminiAIService;

  constructor() {
    this.retryWrapper = new RetryWrapper();
  }

  /**
   * Executes parallel brief analysis with circuit breaker protection
   */
  async executeParallelBriefAnalysis(queries: RefinedQuery[]): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    const batches = this.createBatches(queries, this.concurrencyLimit);

    for (const batch of batches) {
      const batchPromises = batch.map(query => 
        this.executeWithCircuitBreaker(
          () => this.processSingleQuery(query),
          () => this.getFallbackResult(query)
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn(`Query ${batch[index].query} failed:`, result.reason);
          results.push(this.getFallbackResult(batch[index]));
        }
      });

      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Processes brief-specific queries
   */
  async processBriefQueries(queries: RefinedQuery[]): Promise<BriefQueryResult[]> {
    const results: BriefQueryResult[] = [];
    const batches = this.createBatches(queries, this.concurrencyLimit);

    for (const batch of batches) {
      const batchPromises = batch.map(query => 
        this.executeWithCircuitBreaker(
          () => this.processBriefQuery(query),
          () => this.getFallbackBriefResult(query)
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn(`Brief query ${batch[index].query} failed:`, result.reason);
          results.push(this.getFallbackBriefResult(batch[index]));
        }
      });

      // Add delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Synthesizes brief opportunities from query results
   */
  async synthesizeBriefOpportunities(results: BriefQueryResult[]): Promise<BriefOpportunity[]> {
    const opportunities: BriefOpportunity[] = [];
    
    // Group results by brief type
    const groupedResults = this.groupResultsByBriefType(results);
    
    for (const [briefType, typeResults] of Object.entries(groupedResults)) {
      const typeOpportunities = await this.generateOpportunitiesForType(briefType, typeResults);
      opportunities.push(...typeOpportunities);
    }

    return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  // Private methods

  private async processSingleQuery(query: RefinedQuery): Promise<QueryResult> {
    try {
      // Simulate query processing (replace with actual API calls)
      const result = await this.simulateQueryExecution(query);
      
      return Promise.resolve({
        query: query.query,
        type: query.briefType,
        priority: query.opportunityScore,
        result,
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      throw new Error(`Query processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processBriefQuery(query: RefinedQuery): Promise<BriefQueryResult> {
    try {
      // Process the query
      const result = await this.simulateQueryExecution(query);
      
      // Analyze the result for brief-specific insights
      const analysis = await this.analyzeBriefContent(query, result);
      
      return Promise.resolve({
        query: query.query,
        type: query.briefType,
        priority: query.opportunityScore,
        result,
        success: true,
        error: undefined,
        timestamp: Date.now(),
        briefType: query.briefType,
        analysis
      });
    } catch (error) {
      throw new Error(`Brief query processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async simulateQueryExecution(query: RefinedQuery): Promise<any> {
    // Simulate API call delay
    await this.delay(Math.random() * 2000 + 500);
    
    // Simulate query results
    return {
      query: query.query,
      results: [
        {
          title: `Sample result for ${query.query}`,
          url: `https://example.com/${query.query.replace(/\s+/g, '-')}`,
          snippet: `This is a sample result for the query: ${query.query}`,
          relevance: query.semanticRelevance
        }
      ],
      metadata: {
        totalResults: Math.floor(Math.random() * 100) + 10,
        processingTime: Math.random() * 1000 + 200
      }
    };
  }

  private async analyzeBriefContent(query: RefinedQuery, result: any): Promise<BriefAnalysisResult> {
    try {
      const analysisRequest: BriefAnalysisRequest = {
        content: result.results?.[0]?.snippet || '',
        briefType: query.briefType,
        targetAudience: 'general',
        objectives: ['clarity', 'completeness', 'actionability'],
        constraints: ['time', 'resources']
      };

      return await this.performBriefAnalysis(analysisRequest);
    } catch (error) {
      console.warn('Brief analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(query);
    }
  }

  private async performBriefAnalysis(request: BriefAnalysisRequest): Promise<BriefAnalysisResult> {
    try {
      // Use Gemini AI for brief analysis
      const response = await this.geminiService.generateContentStrategy(
        request.content,
        [],
        { briefAnalysis: true }
      );

      // Parse response or use fallback
      return this.parseAnalysisResponse(response) || this.getFallbackAnalysisFromRequest(request);
    } catch (error) {
      console.warn('AI brief analysis failed, using fallback:', error);
      return this.getFallbackAnalysisFromRequest(request);
    }
  }

  private parseAnalysisResponse(response: any): BriefAnalysisResult | null {
    try {
      // Simple parsing - in production, use proper JSON parsing
      return {
        clarityScore: 0.8,
        completenessScore: 0.7,
        structureScore: 0.75,
        recommendations: [
          'Improve clarity of key points',
          'Add more specific examples',
          'Enhance structure and flow'
        ],
        missingElements: [
          'Clear objectives',
          'Success metrics',
          'Timeline'
        ],
        enhancedContent: response.topic || 'Enhanced content based on analysis'
      };
    } catch (error) {
      return null;
    }
  }

  private async generateOpportunitiesForType(briefType: string, results: BriefQueryResult[]): Promise<BriefOpportunity[]> {
    const opportunities: BriefOpportunity[] = [];
    
    results.forEach(result => {
      if (result.success && result.analysis) {
        const opportunity: BriefOpportunity = {
          query: result.query,
          briefType: briefType,
          opportunityScore: result.analysis.clarityScore * result.analysis.completenessScore,
          estimatedImpact: this.estimateImpact(result.analysis),
          recommendedAction: this.generateRecommendedAction(result.analysis, briefType),
          priority: this.calculatePriority(result.analysis, briefType)
        };
        
        opportunities.push(opportunity);
      }
    });

    return opportunities;
  }

  private groupResultsByBriefType(results: BriefQueryResult[]): Record<string, BriefQueryResult[]> {
    const grouped: Record<string, BriefQueryResult[]> = {};
    
    results.forEach(result => {
      if (!grouped[result.briefType]) {
        grouped[result.briefType] = [];
      }
      grouped[result.briefType].push(result);
    });

    return grouped;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    const circuitKey = 'default';
    const circuitState = this.circuitBreakers.get(circuitKey) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };

    if (circuitState.state === 'OPEN') {
      if (Date.now() - circuitState.lastFailureTime > 60000) { // 1 minute timeout
        circuitState.state = 'HALF_OPEN';
      } else {
        return await fallback();
      }
    }

    try {
      const result = await this.retryWrapper.executeWithRetry(operation);
      
      // Reset circuit breaker on success
      if (circuitState.state === 'HALF_OPEN') {
        circuitState.state = 'CLOSED';
        circuitState.failures = 0;
      }
      
      this.circuitBreakers.set(circuitKey, circuitState);
      return result;
    } catch (error) {
      circuitState.failures++;
      circuitState.lastFailureTime = Date.now();
      
      if (circuitState.failures >= 5) {
        circuitState.state = 'OPEN';
      }
      
      this.circuitBreakers.set(circuitKey, circuitState);
      return await fallback();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFallbackResult(query: RefinedQuery): QueryResult {
    return {
      query: query.query,
      type: query.briefType,
      priority: query.opportunityScore,
      result: null,
      success: false,
      error: 'Circuit breaker fallback',
      timestamp: Date.now()
    };
  }

  private getFallbackBriefResult(query: RefinedQuery): BriefQueryResult {
    return {
      query: query.query,
      type: query.briefType,
      priority: query.opportunityScore,
      result: null,
      success: false,
      error: 'Circuit breaker fallback',
      timestamp: Date.now(),
      briefType: query.briefType,
      analysis: this.getFallbackAnalysis(query)
    };
  }

  private getFallbackAnalysis(query: RefinedQuery): BriefAnalysisResult {
    return {
      clarityScore: 0.5,
      completenessScore: 0.5,
      structureScore: 0.5,
      recommendations: ['Improve content structure', 'Add more details'],
      missingElements: ['Key information missing'],
      enhancedContent: `Fallback content for ${query.query}`
    };
  }

  private getFallbackAnalysisFromRequest(request: BriefAnalysisRequest): BriefAnalysisResult {
    return {
      clarityScore: 0.6,
      completenessScore: 0.6,
      structureScore: 0.6,
      recommendations: [
        `Improve ${request.briefType} brief structure`,
        'Add more specific details',
        'Enhance clarity and flow'
      ],
      missingElements: [
        'Clear objectives',
        'Success criteria',
        'Implementation timeline'
      ],
      enhancedContent: `Enhanced ${request.briefType} brief content`
    };
  }

  private estimateImpact(analysis: BriefAnalysisResult): string {
    const score = (analysis.clarityScore + analysis.completenessScore + analysis.structureScore) / 3;
    
    if (score > 0.8) return 'High impact expected';
    if (score > 0.6) return 'Medium impact expected';
    return 'Low impact expected';
  }

  private generateRecommendedAction(analysis: BriefAnalysisResult, briefType: string): string {
    const recommendations = analysis.recommendations;
    if (recommendations.length > 0) {
      return `Focus on: ${recommendations[0]}`;
    }
    return `Improve ${briefType} brief quality`;
  }

  private calculatePriority(analysis: BriefAnalysisResult, briefType: string): number {
    const basePriority = (analysis.clarityScore + analysis.completenessScore + analysis.structureScore) / 3;
    
    // Adjust priority based on brief type
    const typeMultiplier = {
      'executive': 1.2,
      'creative': 1.0,
      'technical': 1.1,
      'marketing': 1.0
    }[briefType] || 1.0;
    
    return basePriority * typeMultiplier;
  }
}

class RetryWrapper {
  private maxRetries: number = 3;
  private baseDelay: number = 1000;
  private maxDelay: number = 10000;

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCondition?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          throw lastError;
        }
        
        if (retryCondition && !retryCondition(lastError)) {
          throw lastError;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

export const parallelProcessor = new ParallelBriefProcessor();
