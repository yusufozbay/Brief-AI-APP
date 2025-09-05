# Query Fan-Out Integration for Brief AI

## Overview

This document describes the comprehensive Query Fan-Out (QFO) integration implemented in the Brief AI web application. The integration provides advanced semantic analysis, parallel processing, and AI-powered content enhancement capabilities.

## Architecture

### Core Components

1. **QueryFanOutService** - Main service orchestrating the entire QFO process
2. **SemanticKeywordExpander** - Handles semantic analysis and query generation
3. **ParallelBriefProcessor** - Manages parallel processing with circuit breaker protection
4. **BriefCacheService** - Provides intelligent caching for performance optimization
5. **QueryFanOutPanel** - React UI component for user interaction

### Data Flow

```
User Input → QueryFanOutService → SemanticKeywordExpander → ParallelBriefProcessor → CacheService → UI Display
```

## Features

### 🚀 Enhanced Query Fan-Out Service
- **Semantic Query Expansion**: Generates contextually relevant queries using AI
- **Parallel Processing**: Executes multiple queries concurrently with rate limiting
- **Circuit Breaker Pattern**: Ensures reliability with automatic fallback mechanisms
- **Intelligent Caching**: Reduces API calls and improves response times
- **Brief-Specific Analysis**: Tailored for executive, creative, technical, and marketing briefs

### 🎯 Semantic Analysis
- **Context Understanding**: Analyzes content semantics and user intent
- **Entity Extraction**: Identifies key people, organizations, and concepts
- **Content Gap Detection**: Finds missing or insufficient content areas
- **Opportunity Scoring**: Ranks content opportunities by potential impact

### ⚡ Performance Optimizations
- **Concurrent Processing**: Up to 10 parallel queries with configurable limits
- **Smart Caching**: 1-hour TTL with pattern-based invalidation
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breaker**: Prevents cascade failures with automatic recovery

### 🎨 User Interface
- **Interactive Panel**: Real-time processing status and results
- **Tabbed Results**: Overview, queries, gaps, and recommendations
- **Visual Indicators**: Success rates, processing times, and priority levels
- **Responsive Design**: Works seamlessly across all device sizes

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Gemini AI API key
- Optional: OpenAI API key, DataForSEO credentials

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Required
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_DATAFORSEO_LOGIN=your_dataforseo_login
VITE_DATAFORSEO_PASSWORD=your_dataforseo_password

# Configuration
VITE_QUERY_FANOUT_ENABLED=true
VITE_CONCURRENCY_LIMIT=10
VITE_CACHE_TTL=3600000
VITE_MAX_RETRIES=3
VITE_CIRCUIT_BREAKER_THRESHOLD=5
VITE_CIRCUIT_BREAKER_TIMEOUT=60000
```

### Installation

```bash
# Install dependencies
npm install

# Install additional dependencies for QFO
npm install uuid @types/uuid

# Start development server
npm run dev
```

## Usage

### Basic Usage

```typescript
import { queryFanoutService } from './services/queryFanout';

const request = {
  mainContent: 'Digital marketing strategy for e-commerce',
  targetAudience: 'marketing professionals',
  contentType: 'brief',
  analysisType: 'deep',
  concurrencyLimit: 10,
  language: 'en',
  industry: 'e-commerce'
};

const result = await queryFanoutService.executeBriefFanOut(request);
console.log(result.enhancedContent);
console.log(result.semanticQueries);
console.log(result.contentGaps);
console.log(result.briefRecommendations);
```

### React Component Usage

```tsx
import QueryFanOutPanel from './components/QueryFanOutPanel';

function MyComponent() {
  const handleEnhancedContent = (content: string) => {
    console.log('Enhanced content:', content);
  };

  const handleRecommendations = (recommendations: BriefRecommendation[]) => {
    console.log('Recommendations:', recommendations);
  };

  return (
    <QueryFanOutPanel
      content="Your content here"
      targetAudience="your audience"
      contentType="brief"
      onEnhancedContent={handleEnhancedContent}
      onRecommendations={handleRecommendations}
    />
  );
}
```

## API Reference

### QueryFanOutService

#### `executeBriefFanOut(request: FanOutRequest): Promise<FanOutResult>`

Executes the complete Query Fan-Out process.

**Parameters:**
- `request.mainContent` (string): The content to enhance
- `request.targetAudience` (string): Target audience description
- `request.contentType` (string): Type of content ('brief', 'article', 'social', 'email', 'proposal')
- `request.analysisType` (string): Analysis depth ('single', 'bulk', 'deep')
- `request.concurrencyLimit` (number, optional): Maximum parallel queries (default: 10)
- `request.language` (string, optional): Content language (default: 'en')
- `request.industry` (string, optional): Industry context (default: 'general')

**Returns:**
- `enhancedContent` (string): AI-enhanced version of the content
- `semanticQueries` (RefinedQuery[]): Generated semantic queries
- `contentGaps` (SemanticContentGap[]): Identified content gaps
- `briefRecommendations` (BriefRecommendation[]): Brief-specific recommendations
- `metadata` (ProcessingMetadata): Processing statistics and timing

### SemanticKeywordExpander

#### `analyzeSemanticContext(topic: string, content: string): Promise<SemanticContext>`

Analyzes the semantic context of content.

#### `generateSemanticQueries(context: SemanticContext): Promise<RefinedQuery[]>`

Generates semantic queries based on context analysis.

#### `identifyContentGaps(mainContent: string, queries: RefinedQuery[]): Promise<SemanticContentGap[]>`

Identifies content gaps and opportunities.

### ParallelBriefProcessor

#### `executeParallelBriefAnalysis(queries: RefinedQuery[]): Promise<QueryResult[]>`

Executes multiple queries in parallel with circuit breaker protection.

#### `processBriefQueries(queries: RefinedQuery[]): Promise<BriefQueryResult[]>`

Processes brief-specific queries with analysis.

#### `synthesizeBriefOpportunities(results: BriefQueryResult[]): Promise<BriefOpportunity[]>`

Synthesizes opportunities from query results.

### BriefCacheService

#### `getCachedResult(key: string): Promise<CachedResult | null>`

Retrieves cached result if valid.

#### `setCachedResult(key: string, result: any, customTtl?: number): Promise<void>`

Caches result with optional custom TTL.

#### `invalidateCache(pattern: string): Promise<void>`

Invalidates cache entries matching pattern.

## Configuration

### Performance Tuning

```typescript
// Adjust concurrency based on API limits
VITE_CONCURRENCY_LIMIT=5  // Lower for rate-limited APIs

// Adjust cache TTL based on content volatility
VITE_CACHE_TTL=1800000    // 30 minutes for dynamic content

// Adjust retry settings for network conditions
VITE_MAX_RETRIES=5        // More retries for unstable networks
```

### Circuit Breaker Settings

```typescript
// Adjust failure threshold
VITE_CIRCUIT_BREAKER_THRESHOLD=3  // Lower threshold for critical systems

// Adjust timeout duration
VITE_CIRCUIT_BREAKER_TIMEOUT=30000  // 30 seconds for slower APIs
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run Query Fan-Out specific tests
npm test -- --testPathPattern=queryFanoutIntegration
```

### Integration Tests

The test suite covers:
- Service integration and data flow
- Error handling and fallback mechanisms
- Performance and concurrency testing
- Cache behavior and invalidation
- UI component functionality

### Manual Testing

1. **Basic Functionality**: Test with simple content
2. **Error Handling**: Test with invalid inputs and API failures
3. **Performance**: Test with high concurrency and large content
4. **Caching**: Test cache hit/miss scenarios
5. **UI Interaction**: Test all panel tabs and interactions

## Troubleshooting

### Common Issues

#### API Rate Limiting
**Problem**: "Rate limit exceeded" errors
**Solution**: Reduce `VITE_CONCURRENCY_LIMIT` or implement request queuing

#### Memory Issues
**Problem**: High memory usage with large content
**Solution**: Reduce `VITE_CACHE_TTL` or implement content chunking

#### Circuit Breaker Activation
**Problem**: Circuit breaker frequently opens
**Solution**: Check API health, increase `VITE_CIRCUIT_BREAKER_THRESHOLD`, or reduce concurrency

#### Cache Misses
**Problem**: Low cache hit rate
**Solution**: Review cache key generation or increase `VITE_CACHE_TTL`

### Debug Mode

Enable detailed logging:

```bash
VITE_DEBUG_MODE=true npm run dev
```

This provides:
- Query execution details
- Cache hit/miss information
- Circuit breaker state changes
- Performance metrics
- Error stack traces

## Performance Metrics

### Target Performance
- **Response Time**: < 5 seconds for single brief enhancement
- **Reliability**: 99.9% success rate with fallbacks
- **Concurrency**: Handle 10+ parallel brief enhancements
- **Cache Hit Rate**: > 80% for repeated queries

### Monitoring

Key metrics to monitor:
- Average processing time per request
- Success/failure rates by query type
- Cache hit/miss ratios
- Circuit breaker activation frequency
- Memory usage and garbage collection

## Future Enhancements

### Planned Features
1. **Real-time Collaboration**: Multiple users working on same brief
2. **Advanced Analytics**: Detailed performance and usage metrics
3. **Custom Models**: User-specific AI model training
4. **API Extensions**: Support for additional AI providers
5. **Mobile App**: Native mobile application

### Integration Opportunities
1. **CRM Systems**: Salesforce, HubSpot integration
2. **Project Management**: Jira, Asana, Trello integration
3. **Content Management**: WordPress, Drupal integration
4. **Analytics**: Google Analytics, Mixpanel integration

## Support

For technical support or feature requests:
- Create an issue in the project repository
- Contact the development team
- Check the troubleshooting guide above
- Review the test cases for usage examples

## License

This Query Fan-Out integration is part of the Brief AI project and follows the same licensing terms.
