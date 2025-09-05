// Core Interfaces for Query Fan-Out System

export interface FanOutRequest {
  mainContent: string;
  targetAudience: string;
  contentType: 'brief' | 'article' | 'social' | 'email' | 'proposal';
  analysisType: 'single' | 'bulk' | 'deep';
  concurrencyLimit?: number;
  language?: string;
  industry?: string;
}

export interface SemanticContext {
  mainTopic: string;
  entities: Entity[];
  intent: UserIntent;
  context: ContentContext;
  semanticField: string;
  focusArea?: string;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'product';
  relevance: number;
  confidence: number;
}

export interface UserIntent {
  primary: 'informational' | 'transactional' | 'navigational' | 'commercial';
  secondary: string[];
  confidence: number;
}

export interface ContentContext {
  industry: string;
  audience: string;
  purpose: string;
  tone: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface RefinedQuery {
  query: string;
  competitionLevel: 'low' | 'medium' | 'high';
  opportunityScore: number;
  searchVolume: number;
  difficulty: number;
  semanticRelevance: number;
  briefType: 'executive' | 'creative' | 'technical' | 'marketing';
}

export interface SemanticContentGap {
  topic: string;
  gapType: 'missing' | 'insufficient' | 'outdated';
  priority: 'high' | 'medium' | 'low';
  opportunity: number;
  suggestedContent: string;
}

export interface BriefRecommendation {
  type: 'executive' | 'creative' | 'technical' | 'marketing';
  priority: number;
  title: string;
  description: string;
  keyPoints: string[];
  estimatedEffort: string;
}

export interface ProcessingMetadata {
  startTime: number;
  endTime: number;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  cacheHits: number;
  apiCalls: number;
  processingTime: number;
}

export interface FanOutResult {
  enhancedContent: string;
  semanticQueries: RefinedQuery[];
  contentGaps: SemanticContentGap[];
  briefRecommendations: BriefRecommendation[];
  metadata: ProcessingMetadata;
}

// Circuit Breaker Interfaces
export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface CachedResult {
  data: any;
  timestamp: number;
  ttl: number;
}

// Brief Analysis Interfaces
export interface BriefAnalysisRequest {
  content: string;
  briefType: 'executive' | 'creative' | 'technical' | 'marketing';
  targetAudience: string;
  objectives: string[];
  constraints: string[];
}

export interface BriefAnalysisResult {
  clarityScore: number;
  completenessScore: number;
  structureScore: number;
  recommendations: string[];
  missingElements: string[];
  enhancedContent: string;
}

// Industry Context Interfaces
export interface IndustryContext {
  industry: string;
  trends: string[];
  bestPractices: string[];
  commonPitfalls: string[];
  targetAudience: AudienceProfile[];
}

export interface AudienceProfile {
  segment: string;
  characteristics: string[];
  painPoints: string[];
  preferences: string[];
}

// Competitor Analysis Interfaces
export interface BriefCompetitorData {
  company: string;
  briefType: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  bestPractices: string[];
}

// Query Result Interfaces
export interface QueryResult {
  query: string;
  type: string;
  priority: number;
  result: any;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface BriefQueryResult extends QueryResult {
  briefType: string;
  analysis: BriefAnalysisResult;
}

export interface BriefOpportunity {
  query: string;
  briefType: string;
  opportunityScore: number;
  estimatedImpact: string;
  recommendedAction: string;
  priority: number;
}
