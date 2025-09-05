import React, { useState, useEffect } from 'react';
import { queryFanoutService } from '../services/queryFanout';
import { FanOutRequest, FanOutResult, RefinedQuery, SemanticContentGap, BriefRecommendation } from '../types/queryFanout';
import { Loader2, Zap, Target, Lightbulb, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface QueryFanOutPanelProps {
  content: string;
  targetAudience: string;
  contentType: 'brief' | 'article' | 'social' | 'email' | 'proposal';
  onEnhancedContent?: (content: string) => void;
  onRecommendations?: (recommendations: BriefRecommendation[]) => void;
}

export const QueryFanOutPanel: React.FC<QueryFanOutPanelProps> = ({
  content,
  targetAudience,
  contentType,
  onEnhancedContent,
  onRecommendations
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [fanOutResult, setFanOutResult] = useState<FanOutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'queries' | 'gaps' | 'recommendations'>('overview');

  const handleFanOutEnhancement = async () => {
    if (!content.trim()) {
      setError('Please provide content to enhance');
      return;
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const request: FanOutRequest = {
        mainContent: content,
        targetAudience,
        contentType,
        analysisType: 'deep',
        concurrencyLimit: 10,
        language: 'tr',
        industry: 'general'
      };

      const result = await queryFanoutService.executeBriefFanOut(request);
      setFanOutResult(result);

      // Notify parent components
      if (onEnhancedContent) {
        onEnhancedContent(result.enhancedContent);
      }
      if (onRecommendations) {
        onRecommendations(result.briefRecommendations);
      }
    } catch (err) {
      console.error('Query Fan-Out enhancement failed:', err);
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Query Fan-Out Enhancement</h3>
              <p className="text-sm text-gray-600">AI-powered semantic analysis and content optimization</p>
            </div>
          </div>
          <button
            onClick={handleFanOutEnhancement}
            disabled={isEnhancing || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enhancing...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Enhance with QFO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {fanOutResult && (
        <div className="p-6">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'queries', label: 'Semantic Queries', icon: Target },
              { id: 'gaps', label: 'Content Gaps', icon: Lightbulb },
              { id: 'recommendations', label: 'Recommendations', icon: CheckCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedTab(id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Processing Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Queries</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {fanOutResult.metadata.totalQueries}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className={`text-2xl font-semibold ${getSuccessRateColor(
                          fanOutResult.metadata.successfulQueries / Math.max(fanOutResult.metadata.totalQueries, 1)
                        )}`}>
                          {Math.round((fanOutResult.metadata.successfulQueries / Math.max(fanOutResult.metadata.totalQueries, 1)) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Processing Time</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatProcessingTime(fanOutResult.metadata.processingTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-sm text-gray-600">Content Gaps</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {fanOutResult.contentGaps.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Content Preview */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Enhanced Content Preview</h4>
                  <div className="text-sm text-blue-800 max-h-32 overflow-y-auto">
                    {fanOutResult.enhancedContent.substring(0, 500)}
                    {fanOutResult.enhancedContent.length > 500 && '...'}
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'queries' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Semantic Queries Generated</h4>
                <div className="grid gap-3">
                  {fanOutResult.semanticQueries.map((query, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{query.query}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-600">
                              Type: <span className="font-medium">{query.briefType}</span>
                            </span>
                            <span className="text-xs text-gray-600">
                              Competition: <span className={`font-medium ${
                                query.competitionLevel === 'high' ? 'text-red-600' :
                                query.competitionLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                              }`}>{query.competitionLevel}</span>
                            </span>
                            <span className="text-xs text-gray-600">
                              Relevance: <span className="font-medium">{Math.round(query.semanticRelevance * 100)}%</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {Math.round(query.opportunityScore * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Opportunity</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'gaps' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Identified Content Gaps</h4>
                <div className="grid gap-3">
                  {fanOutResult.contentGaps.map((gap, index) => (
                    <div key={index} className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-yellow-900">{gap.topic}</h5>
                          <p className="text-sm text-yellow-800 mt-1">{gap.suggestedContent}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              gap.priority === 'high' ? 'bg-red-100 text-red-800' :
                              gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {gap.priority} priority
                            </span>
                            <span className="text-xs text-yellow-700">
                              Gap: {gap.gapType}
                            </span>
                            <span className="text-xs text-yellow-700">
                              Opportunity: {Math.round(gap.opportunity * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'recommendations' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Brief Recommendations</h4>
                <div className="grid gap-4">
                  {fanOutResult.briefRecommendations.map((rec, index) => (
                    <div key={index} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="text-sm font-semibold text-green-900">{rec.title}</h5>
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                              Priority {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-green-800 mb-3">{rec.description}</p>
                          <div className="space-y-2">
                            <h6 className="text-xs font-semibold text-green-900">Key Points:</h6>
                            <ul className="text-xs text-green-800 space-y-1">
                              {rec.keyPoints.map((point, pointIndex) => (
                                <li key={pointIndex} className="flex items-start">
                                  <span className="text-green-600 mr-2">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-green-700 font-medium">{rec.estimatedEffort}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryFanOutPanel;
