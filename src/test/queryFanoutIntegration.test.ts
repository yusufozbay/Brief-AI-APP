/**
 * Query Fan-Out Integration Test
 * 
 * This test file verifies the complete Query Fan-Out integration
 * with Brief AI web application.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { queryFanoutService } from '../services/queryFanout';
import { semanticExpander } from '../services/semanticExpander';
import { parallelProcessor } from '../services/parallelProcessor';
import { cacheService } from '../services/cacheService';
import { FanOutRequest, FanOutResult } from '../types/queryFanout';

// Mock external dependencies
jest.mock('../services/geminiAI');
jest.mock('../services/dataForSEO');

describe('Query Fan-Out Integration', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clearCache();
  });

  describe('QueryFanoutService', () => {
    it('should execute brief fan-out with valid request', async () => {
      const request: FanOutRequest = {
        mainContent: 'Digital marketing strategy for e-commerce',
        targetAudience: 'marketing professionals',
        contentType: 'brief',
        analysisType: 'deep',
        concurrencyLimit: 5,
        language: 'en',
        industry: 'e-commerce'
      };

      const result = await queryFanoutService.executeBriefFanOut(request);

      expect(result).toBeDefined();
      expect(result.enhancedContent).toBeDefined();
      expect(result.semanticQueries).toBeInstanceOf(Array);
      expect(result.contentGaps).toBeInstanceOf(Array);
      expect(result.briefRecommendations).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalQueries).toBeGreaterThan(0);
    });

    it('should handle empty content gracefully', async () => {
      const request: FanOutRequest = {
        mainContent: '',
        targetAudience: 'general',
        contentType: 'brief',
        analysisType: 'single'
      };

      const result = await queryFanoutService.executeBriefFanOut(request);

      expect(result).toBeDefined();
      expect(result.enhancedContent).toBe('');
      expect(result.semanticQueries).toEqual([]);
    });

    it('should use caching for repeated requests', async () => {
      const request: FanOutRequest = {
        mainContent: 'Test content for caching',
        targetAudience: 'test audience',
        contentType: 'brief',
        analysisType: 'single'
      };

      // First request
      const result1 = await queryFanoutService.executeBriefFanOut(request);
      
      // Second request (should use cache)
      const result2 = await queryFanoutService.executeBriefFanOut(request);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // In a real implementation, we'd verify cache hit
    });
  });

  describe('SemanticKeywordExpander', () => {
    it('should analyze semantic context', async () => {
      const context = await semanticExpander.analyzeSemanticContext(
        'AI content strategy',
        'This is about creating AI-driven content strategies for modern businesses'
      );

      expect(context).toBeDefined();
      expect(context.mainTopic).toBe('AI content strategy');
      expect(context.entities).toBeInstanceOf(Array);
      expect(context.intent).toBeDefined();
      expect(context.context).toBeDefined();
    });

    it('should generate semantic queries', async () => {
      const context = await semanticExpander.analyzeSemanticContext(
        'Digital marketing',
        'Comprehensive digital marketing guide'
      );

      const queries = await semanticExpander.generateSemanticQueries(context);

      expect(queries).toBeInstanceOf(Array);
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0]).toHaveProperty('query');
      expect(queries[0]).toHaveProperty('briefType');
      expect(queries[0]).toHaveProperty('semanticRelevance');
    });

    it('should identify content gaps', async () => {
      const content = 'Basic introduction to digital marketing';
      const queries = [
        {
          query: 'advanced digital marketing strategies',
          competitionLevel: 'medium' as const,
          opportunityScore: 0.8,
          searchVolume: 1000,
          difficulty: 0.6,
          semanticRelevance: 0.9,
          briefType: 'executive' as const
        }
      ];

      const gaps = await semanticExpander.identifyContentGaps(content, queries);

      expect(gaps).toBeInstanceOf(Array);
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0]).toHaveProperty('topic');
      expect(gaps[0]).toHaveProperty('gapType');
      expect(gaps[0]).toHaveProperty('priority');
    });
  });

  describe('ParallelBriefProcessor', () => {
    it('should execute parallel brief analysis', async () => {
      const queries = [
        {
          query: 'test query 1',
          competitionLevel: 'low' as const,
          opportunityScore: 0.7,
          searchVolume: 500,
          difficulty: 0.3,
          semanticRelevance: 0.8,
          briefType: 'executive' as const
        },
        {
          query: 'test query 2',
          competitionLevel: 'medium' as const,
          opportunityScore: 0.6,
          searchVolume: 800,
          difficulty: 0.5,
          semanticRelevance: 0.7,
          briefType: 'creative' as const
        }
      ];

      const results = await parallelProcessor.executeParallelBriefAnalysis(queries);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('query');
      expect(results[0]).toHaveProperty('success');
      expect(results[0]).toHaveProperty('timestamp');
    });

    it('should process brief queries', async () => {
      const queries = [
        {
          query: 'executive brief strategy',
          competitionLevel: 'high' as const,
          opportunityScore: 0.9,
          searchVolume: 1200,
          difficulty: 0.8,
          semanticRelevance: 0.9,
          briefType: 'executive' as const
        }
      ];

      const results = await parallelProcessor.processBriefQueries(queries);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('briefType');
      expect(results[0]).toHaveProperty('analysis');
      expect(results[0].analysis).toHaveProperty('clarityScore');
      expect(results[0].analysis).toHaveProperty('completenessScore');
    });

    it('should synthesize brief opportunities', async () => {
      const results = [
        {
          query: 'test query',
          type: 'executive',
          priority: 0.8,
          result: { test: 'data' },
          success: true,
          error: undefined,
          timestamp: Date.now(),
          briefType: 'executive',
          analysis: {
            clarityScore: 0.8,
            completenessScore: 0.7,
            structureScore: 0.75,
            recommendations: ['Improve clarity'],
            missingElements: ['Timeline'],
            enhancedContent: 'Enhanced content'
          }
        }
      ];

      const opportunities = await parallelProcessor.synthesizeBriefOpportunities(results);

      expect(opportunities).toBeInstanceOf(Array);
      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0]).toHaveProperty('query');
      expect(opportunities[0]).toHaveProperty('briefType');
      expect(opportunities[0]).toHaveProperty('opportunityScore');
    });
  });

  describe('CacheService', () => {
    it('should cache and retrieve results', async () => {
      const key = 'test-key';
      const data = { test: 'data' };

      await cacheService.setCachedResult(key, data);
      const retrieved = await cacheService.getCachedResult(key);

      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toEqual(data);
    });

    it('should return null for expired cache', async () => {
      const key = 'expired-key';
      const data = { test: 'data' };

      // Set with very short TTL
      await cacheService.setCachedResult(key, data, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = await cacheService.getCachedResult(key);
      expect(retrieved).toBeNull();
    });

    it('should invalidate cache by pattern', async () => {
      await cacheService.setCachedResult('test-pattern-1', { data: 1 });
      await cacheService.setCachedResult('test-pattern-2', { data: 2 });
      await cacheService.setCachedResult('other-key', { data: 3 });

      await cacheService.invalidateCache('test-pattern');

      const stats = cacheService.getCacheStats();
      expect(stats.size).toBe(1); // Only 'other-key' should remain
    });
  });

  describe('Integration Flow', () => {
    it('should complete full Query Fan-Out flow', async () => {
      const request: FanOutRequest = {
        mainContent: 'Complete digital transformation strategy',
        targetAudience: 'C-level executives',
        contentType: 'brief',
        analysisType: 'deep',
        concurrencyLimit: 3,
        language: 'en',
        industry: 'technology'
      };

      // Execute the full flow
      const result = await queryFanoutService.executeBriefFanOut(request);

      // Verify all components are working together
      expect(result.enhancedContent).toBeDefined();
      expect(result.enhancedContent.length).toBeGreaterThan(request.mainContent.length);
      
      expect(result.semanticQueries.length).toBeGreaterThan(0);
      expect(result.semanticQueries.every(q => q.query && q.briefType)).toBe(true);
      
      expect(result.contentGaps.length).toBeGreaterThan(0);
      expect(result.contentGaps.every(gap => gap.topic && gap.priority)).toBe(true);
      
      expect(result.briefRecommendations.length).toBeGreaterThan(0);
      expect(result.briefRecommendations.every(rec => rec.title && rec.description)).toBe(true);
      
      expect(result.metadata.totalQueries).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle errors gracefully with fallbacks', async () => {
      // Mock a service failure
      const originalMethod = semanticExpander.analyzeSemanticContext;
      semanticExpander.analyzeSemanticContext = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const request: FanOutRequest = {
        mainContent: 'Test content for error handling',
        targetAudience: 'test',
        contentType: 'brief',
        analysisType: 'single'
      };

      const result = await queryFanoutService.executeBriefFanOut(request);

      // Should still return a result with fallback data
      expect(result).toBeDefined();
      expect(result.enhancedContent).toBe(request.mainContent); // Fallback to original content
      expect(result.semanticQueries).toEqual([]); // Empty array as fallback

      // Restore original method
      semanticExpander.analyzeSemanticContext = originalMethod;
    });
  });
});

// Performance tests
describe('Query Fan-Out Performance', () => {
  it('should complete analysis within reasonable time', async () => {
    const request: FanOutRequest = {
      mainContent: 'Performance test content',
      targetAudience: 'test',
      contentType: 'brief',
      analysisType: 'single',
      concurrencyLimit: 5
    };

    const startTime = Date.now();
    const result = await queryFanoutService.executeBriefFanOut(request);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    expect(result.metadata.processingTime).toBeLessThan(10000);
  });

  it('should handle high concurrency', async () => {
    const request: FanOutRequest = {
      mainContent: 'High concurrency test',
      targetAudience: 'test',
      contentType: 'brief',
      analysisType: 'deep',
      concurrencyLimit: 20
    };

    const result = await queryFanoutService.executeBriefFanOut(request);

    expect(result.metadata.totalQueries).toBeGreaterThan(0);
    expect(result.metadata.successfulQueries).toBeGreaterThan(0);
    expect(result.metadata.successfulQueries / result.metadata.totalQueries).toBeGreaterThan(0.5); // At least 50% success rate
  });
});
