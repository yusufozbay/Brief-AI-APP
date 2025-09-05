import { geminiAIService } from './geminiAI';
import { 
  SemanticContext, 
  RefinedQuery, 
  SemanticContentGap, 
  Entity, 
  UserIntent, 
  ContentContext 
} from '../types/queryFanout';

export class SemanticKeywordExpander {
  private geminiService = geminiAIService;

  /**
   * Analyzes semantic context from topic and content
   */
  async analyzeSemanticContext(topic: string, content: string): Promise<SemanticContext> {
    try {
      // Use Gemini AI for semantic context analysis
      const response = await this.geminiService.generateContentStrategy(topic, [], {});
      const entities = this.extractEntities(topic, content);
      const intent = this.analyzeUserIntent(topic, content);
      const context = this.analyzeContentContext(topic, content);

      return {
        mainTopic: topic,
        entities,
        intent,
        context,
        semanticField: this.determineSemanticField(topic),
        focusArea: this.identifyFocusArea(topic, content)
      };
    } catch (error) {
      console.warn('Failed to analyze semantic context with AI, using fallback:', error);
      return this.getFallbackSemanticContext(topic, content);
    }
  }

  /**
   * Generates semantic queries based on context
   */
  async generateSemanticQueries(context: SemanticContext): Promise<RefinedQuery[]> {
    const queries: RefinedQuery[] = [];

    // Generate queries for each brief type
    const executiveQueries = await this.generateExecutiveBriefQueries(context);
    const creativeQueries = await this.generateCreativeBriefQueries(context);
    const technicalQueries = await this.generateTechnicalBriefQueries(context);
    const marketingQueries = await this.generateMarketingBriefQueries(context);

    queries.push(...executiveQueries, ...creativeQueries, ...technicalQueries, ...marketingQueries);

    // Remove duplicates and sort by relevance
    return this.deduplicateAndRankQueries(queries);
  }

  /**
   * Expands brief topics into comprehensive topic list
   */
  async expandBriefTopics(topic: string, briefType: string): Promise<string[]> {
    const baseTopics = [topic];
    
    // Add type-specific expansions
    switch (briefType) {
      case 'executive':
        baseTopics.push(
          `${topic} strategy`,
          `${topic} overview`,
          `${topic} key metrics`,
          `${topic} decision points`,
          `${topic} risk analysis`
        );
        break;
      case 'creative':
        baseTopics.push(
          `${topic} brand voice`,
          `${topic} visual identity`,
          `${topic} messaging`,
          `${topic} creative direction`,
          `${topic} target audience`
        );
        break;
      case 'technical':
        baseTopics.push(
          `${topic} specifications`,
          `${topic} implementation`,
          `${topic} requirements`,
          `${topic} architecture`,
          `${topic} testing`
        );
        break;
      case 'marketing':
        baseTopics.push(
          `${topic} market analysis`,
          `${topic} positioning`,
          `${topic} channels`,
          `${topic} metrics`,
          `${topic} campaign strategy`
        );
        break;
    }

    return baseTopics;
  }

  /**
   * Identifies content gaps from main content and queries
   */
  async identifyContentGaps(mainContent: string, queries: RefinedQuery[]): Promise<SemanticContentGap[]> {
    const gaps: SemanticContentGap[] = [];
    
    // Analyze content coverage
    const coveredTopics = this.extractTopicsFromContent(mainContent);
    const queryTopics = queries.map(q => q.query.toLowerCase());

    // Find missing topics
    queryTopics.forEach(query => {
      if (!this.isTopicCovered(query, coveredTopics)) {
        gaps.push({
          topic: query,
          gapType: 'missing',
          priority: this.calculateGapPriority(query),
          opportunity: this.calculateOpportunityScore(query),
          suggestedContent: this.generateContentSuggestion(query)
        });
      }
    });

    return gaps.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generates executive brief specific queries
   */
  async generateExecutiveBriefQueries(context: SemanticContext): Promise<RefinedQuery[]> {
    const queries = [
      'strategic objectives and KPIs',
      'stakeholder impact analysis',
      'resource allocation requirements',
      'timeline and milestones',
      'risk assessment and mitigation',
      'success metrics and measurement'
    ];

    return this.processQueriesForBriefType(queries, 'executive', context);
  }

  /**
   * Generates creative brief specific queries
   */
  async generateCreativeBriefQueries(context: SemanticContext): Promise<RefinedQuery[]> {
    const queries = [
      'brand voice and tone guidelines',
      'visual identity requirements',
      'target audience personas',
      'creative constraints and opportunities',
      'messaging hierarchy and key points',
      'call-to-action strategies'
    ];

    return this.processQueriesForBriefType(queries, 'creative', context);
  }

  /**
   * Generates technical brief specific queries
   */
  async generateTechnicalBriefQueries(context: SemanticContext): Promise<RefinedQuery[]> {
    const queries = [
      'technical specifications and requirements',
      'implementation methodology',
      'technology stack and tools',
      'performance metrics and benchmarks',
      'integration requirements',
      'testing and quality assurance'
    ];

    return this.processQueriesForBriefType(queries, 'technical', context);
  }

  /**
   * Generates marketing brief specific queries
   */
  async generateMarketingBriefQueries(context: SemanticContext): Promise<RefinedQuery[]> {
    const queries = [
      'market analysis and competitive landscape',
      'target audience segmentation',
      'positioning and value proposition',
      'marketing channels and tactics',
      'budget allocation and ROI',
      'campaign timeline and milestones'
    ];

    return this.processQueriesForBriefType(queries, 'marketing', context);
  }

  // Private helper methods

  private extractEntities(topic: string, content: string): Entity[] {
    // Simple entity extraction - in production, use NLP libraries
    const entities: Entity[] = [];
    
    // Extract common entity patterns
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const organizationPattern = /\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Group)\b/g;
    
    const people = content.match(personPattern) || [];
    const organizations = content.match(organizationPattern) || [];

    people.forEach(name => {
      entities.push({
        name,
        type: 'person',
        relevance: 0.8,
        confidence: 0.7
      });
    });

    organizations.forEach(org => {
      entities.push({
        name: org,
        type: 'organization',
        relevance: 0.9,
        confidence: 0.8
      });
    });

    return entities;
  }

  private analyzeUserIntent(topic: string, content: string): UserIntent {
    // Simple intent analysis
    const informationalKeywords = ['what', 'how', 'why', 'when', 'where', 'guide', 'tutorial'];
    const transactionalKeywords = ['buy', 'purchase', 'order', 'price', 'cost'];
    const navigationalKeywords = ['login', 'sign in', 'account', 'dashboard'];
    const commercialKeywords = ['compare', 'review', 'best', 'top', 'vs'];

    const contentLower = content.toLowerCase();
    const topicLower = topic.toLowerCase();

    let primary: UserIntent['primary'] = 'informational';
    let confidence = 0.5;

    if (informationalKeywords.some(keyword => contentLower.includes(keyword) || topicLower.includes(keyword))) {
      primary = 'informational';
      confidence = 0.8;
    } else if (transactionalKeywords.some(keyword => contentLower.includes(keyword) || topicLower.includes(keyword))) {
      primary = 'transactional';
      confidence = 0.7;
    } else if (navigationalKeywords.some(keyword => contentLower.includes(keyword) || topicLower.includes(keyword))) {
      primary = 'navigational';
      confidence = 0.6;
    } else if (commercialKeywords.some(keyword => contentLower.includes(keyword) || topicLower.includes(keyword))) {
      primary = 'commercial';
      confidence = 0.7;
    }

    return {
      primary,
      secondary: [],
      confidence
    };
  }

  private analyzeContentContext(topic: string, content: string): ContentContext {
    // Simple context analysis
    return {
      industry: this.determineIndustry(topic),
      audience: this.determineAudience(topic, content),
      purpose: this.determinePurpose(topic, content),
      tone: this.determineTone(content),
      complexity: this.determineComplexity(content)
    };
  }

  private determineSemanticField(topic: string): string {
    // Simple semantic field determination
    if (topic.includes('marketing') || topic.includes('advertising')) return 'marketing';
    if (topic.includes('technology') || topic.includes('software')) return 'technology';
    if (topic.includes('business') || topic.includes('strategy')) return 'business';
    if (topic.includes('design') || topic.includes('creative')) return 'design';
    return 'general';
  }

  private identifyFocusArea(topic: string, content: string): string {
    // Simple focus area identification
    const focusKeywords = {
      'strategy': ['strategy', 'planning', 'roadmap'],
      'implementation': ['implementation', 'execution', 'deployment'],
      'analysis': ['analysis', 'research', 'study'],
      'optimization': ['optimization', 'improvement', 'enhancement']
    };

    const contentLower = content.toLowerCase();
    for (const [area, keywords] of Object.entries(focusKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return area;
      }
    }

    return 'general';
  }

  private processQueriesForBriefType(queries: string[], briefType: string, context: SemanticContext): RefinedQuery[] {
    return queries.map((query, index) => ({
      query: `${context.mainTopic} ${query}`,
      competitionLevel: this.calculateCompetitionLevel(query),
      opportunityScore: this.calculateOpportunityScore(query),
      searchVolume: this.estimateSearchVolume(query),
      difficulty: this.calculateDifficulty(query),
      semanticRelevance: this.calculateSemanticRelevance(query, context),
      briefType: briefType as RefinedQuery['briefType']
    }));
  }

  private calculateCompetitionLevel(query: string): 'low' | 'medium' | 'high' {
    // Simple competition level calculation
    const highCompetitionKeywords = ['best', 'top', 'review', 'compare'];
    const mediumCompetitionKeywords = ['how to', 'guide', 'tutorial'];
    
    const queryLower = query.toLowerCase();
    
    if (highCompetitionKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'high';
    } else if (mediumCompetitionKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private calculateOpportunityScore(query: string): number {
    // Simple opportunity score calculation (0-1)
    const baseScore = 0.5;
    const lengthBonus = Math.min(query.length / 100, 0.3);
    const specificityBonus = query.split(' ').length > 3 ? 0.2 : 0;
    
    return Math.min(baseScore + lengthBonus + specificityBonus, 1);
  }

  private estimateSearchVolume(query: string): number {
    // Simple search volume estimation
    const baseVolume = 1000;
    const wordCount = query.split(' ').length;
    const lengthMultiplier = Math.max(0.5, 1 - (wordCount - 2) * 0.1);
    
    return Math.round(baseVolume * lengthMultiplier);
  }

  private calculateDifficulty(query: string): number {
    // Simple difficulty calculation (0-1)
    const highDifficultyKeywords = ['advanced', 'expert', 'professional'];
    const mediumDifficultyKeywords = ['intermediate', 'guide', 'tutorial'];
    
    const queryLower = query.toLowerCase();
    
    if (highDifficultyKeywords.some(keyword => queryLower.includes(keyword))) {
      return 0.8;
    } else if (mediumDifficultyKeywords.some(keyword => queryLower.includes(keyword))) {
      return 0.5;
    }
    
    return 0.3;
  }

  private calculateSemanticRelevance(query: string, context: SemanticContext): number {
    // Simple semantic relevance calculation
    const topicWords = context.mainTopic.toLowerCase().split(' ');
    const queryWords = query.toLowerCase().split(' ');
    
    const commonWords = topicWords.filter(word => queryWords.includes(word));
    return commonWords.length / Math.max(topicWords.length, queryWords.length);
  }

  private deduplicateAndRankQueries(queries: RefinedQuery[]): RefinedQuery[] {
    // Remove duplicates and sort by relevance
    const unique = queries.filter((query, index, self) => 
      index === self.findIndex(q => q.query === query.query)
    );
    
    return unique.sort((a, b) => b.semanticRelevance - a.semanticRelevance);
  }

  private extractTopicsFromContent(content: string): string[] {
    // Simple topic extraction from content
    const sentences = content.split(/[.!?]+/);
    return sentences.slice(0, 10).map(sentence => sentence.trim().toLowerCase());
  }

  private isTopicCovered(query: string, coveredTopics: string[]): boolean {
    const queryWords = query.toLowerCase().split(' ');
    return coveredTopics.some(topic => 
      queryWords.some(word => topic.includes(word))
    );
  }

  private calculateGapPriority(query: string): 1 | 2 | 3 {
    // Simple priority calculation
    const highPriorityKeywords = ['strategy', 'implementation', 'analysis'];
    const mediumPriorityKeywords = ['guide', 'tutorial', 'overview'];
    
    const queryLower = query.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => queryLower.includes(keyword))) {
      return 3;
    } else if (mediumPriorityKeywords.some(keyword => queryLower.includes(keyword))) {
      return 2;
    }
    
    return 1;
  }

  private generateContentSuggestion(query: string): string {
    return `Create comprehensive content covering: ${query}`;
  }

  private determineIndustry(topic: string): string {
    // Simple industry determination
    if (topic.includes('tech') || topic.includes('software')) return 'technology';
    if (topic.includes('marketing') || topic.includes('advertising')) return 'marketing';
    if (topic.includes('finance') || topic.includes('banking')) return 'finance';
    if (topic.includes('health') || topic.includes('medical')) return 'healthcare';
    return 'general';
  }

  private determineAudience(topic: string, content: string): string {
    // Simple audience determination
    if (content.includes('executive') || content.includes('C-level')) return 'executives';
    if (content.includes('developer') || content.includes('engineer')) return 'technical';
    if (content.includes('marketer') || content.includes('marketing')) return 'marketing';
    if (content.includes('designer') || content.includes('creative')) return 'creative';
    return 'general';
  }

  private determinePurpose(topic: string, content: string): string {
    // Simple purpose determination
    if (content.includes('strategy') || content.includes('planning')) return 'strategic';
    if (content.includes('implementation') || content.includes('execution')) return 'operational';
    if (content.includes('analysis') || content.includes('research')) return 'analytical';
    return 'informational';
  }

  private determineTone(content: string): string {
    // Simple tone determination
    if (content.includes('urgent') || content.includes('critical')) return 'urgent';
    if (content.includes('professional') || content.includes('formal')) return 'professional';
    if (content.includes('friendly') || content.includes('casual')) return 'friendly';
    return 'neutral';
  }

  private determineComplexity(content: string): 'beginner' | 'intermediate' | 'advanced' {
    // Simple complexity determination
    const advancedKeywords = ['advanced', 'expert', 'complex', 'sophisticated'];
    const beginnerKeywords = ['basic', 'simple', 'introduction', 'beginner'];
    
    const contentLower = content.toLowerCase();
    
    if (advancedKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'advanced';
    } else if (beginnerKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'beginner';
    }
    
    return 'intermediate';
  }

  private getFallbackSemanticContext(topic: string, content: string): SemanticContext {
    return {
      mainTopic: topic,
      entities: [],
      intent: {
        primary: 'informational',
        secondary: [],
        confidence: 0.5
      },
      context: {
        industry: 'general',
        audience: 'general',
        purpose: 'informational',
        tone: 'neutral',
        complexity: 'intermediate'
      },
      semanticField: 'general',
      focusArea: 'general'
    };
  }
}

export const semanticExpander = new SemanticKeywordExpander();
