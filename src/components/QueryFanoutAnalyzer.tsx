import React, { useState } from 'react';
import { Search, Target, Users, TrendingUp, FileText, CheckCircle, Lightbulb, BarChart3, ArrowRight, Share2, Copy, ExternalLink, Zap, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { queryFanoutService, QueryFanoutResult } from '../services/queryFanout';
import { CompetitorSelection } from '../types/serp';

interface QueryFanoutAnalyzerProps {
  topic: string;
  competitors: CompetitorSelection[];
  onAnalysisComplete: (fanoutResult: QueryFanoutResult) => void;
}

const QueryFanoutAnalyzer: React.FC<QueryFanoutAnalyzerProps> = ({
  topic,
  competitors,
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fanoutResult, setFanoutResult] = useState<QueryFanoutResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  const executeQueryFanout = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentPhase('Expanding queries...');
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      setCurrentPhase('Executing parallel queries...');
      
      const result = await queryFanoutService.executeQueryFanout(topic, competitors, {
        maxQueries: 8,
        includeSemantic: true,
        includeLongTail: true,
        includeCompetitorAnalysis: true
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setCurrentPhase('Analysis complete!');
      
      setFanoutResult(result);
      onAnalysisComplete(result);
      
      // Reset progress after a delay
      setTimeout(() => {
        setAnalysisProgress(0);
        setCurrentPhase('');
      }, 2000);
      
    } catch (error) {
      console.error('Query Fan-out analysis failed:', error);
      setCurrentPhase('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'primary': return <Target className="w-4 h-4 text-blue-600" />;
      case 'semantic': return <Search className="w-4 h-4 text-green-600" />;
      case 'longtail': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'competitor': return <Users className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getQueryTypeLabel = (type: string) => {
    switch (type) {
      case 'primary': return 'Primary Query';
      case 'semantic': return 'Semantic Variant';
      case 'longtail': return 'Long-tail Keyword';
      case 'competitor': return 'Competitor Analysis';
      default: return 'Other';
    }
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'semantic': return 'bg-green-100 text-green-800 border-green-200';
      case 'longtail': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'competitor': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Zap className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Query Fan-out Analysis</h3>
            <p className="text-sm text-gray-600">Expand and analyze multiple related queries in parallel</p>
          </div>
        </div>
        
        {!isAnalyzing && !fanoutResult && (
          <button
            onClick={executeQueryFanout}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Start Analysis</span>
          </button>
        )}
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{currentPhase}</span>
            <span className="text-sm text-gray-500">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Query Fan-out Results */}
      {fanoutResult && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{fanoutResult.expandedQueries.length}</div>
              <div className="text-sm text-blue-700">Total Queries</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{fanoutResult.aggregatedData.successfulQueries}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{fanoutResult.aggregatedData.uniqueResults}</div>
              <div className="text-sm text-purple-700">Unique Results</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(fanoutResult.successRate * 100)}%</div>
              <div className="text-sm text-orange-700">Success Rate</div>
            </div>
          </div>

          {/* Expanded Queries */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Expanded Queries
            </h4>
            <div className="space-y-2">
              {fanoutResult.parallelResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getQueryTypeIcon(result.type)}
                    <span className="text-sm font-medium text-gray-700">{result.query}</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getQueryTypeColor(result.type)}`}>
                      {getQueryTypeLabel(result.type)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-xs text-gray-500">
                      {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Query Type Analysis */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Query Type Performance
            </h4>
            <div className="space-y-3">
              {Object.entries(fanoutResult.aggregatedData.queryTypeAnalysis).map(([type, stats]: [string, any]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getQueryTypeIcon(type)}
                    <span className="font-medium text-gray-700">{getQueryTypeLabel(type)}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      Success: {Math.round(stats.successRate * 100)}%
                    </span>
                    <span className="text-gray-600">
                      Count: {stats.count}
                    </span>
                    <span className="text-gray-600">
                      Avg Priority: {stats.avgPriority.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              Generated Insights
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-800 mb-2">Content Gaps</h5>
                <ul className="space-y-1">
                  {fanoutResult.aggregatedData.insights.contentGaps.map((gap: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-2 text-orange-500" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-800 mb-2">Recommended Strategy</h5>
                <p className="text-sm text-gray-600">
                  {fanoutResult.aggregatedData.insights.recommendedStrategy}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Performance Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {fanoutResult.executionTime}ms
                </div>
                <div className="text-sm text-gray-600">Execution Time</div>
              </div>
              <div className="bg-white rounded-lg p-4 border text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fanoutResult.fallbackUsed ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-gray-600">Fallback Used</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => setFanoutResult(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset Analysis
            </button>
            <button
              onClick={() => executeQueryFanout()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Re-run Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!isAnalyzing && !fanoutResult && (
        <div className="text-center py-8">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">Ready to Analyze</h4>
          <p className="text-sm text-gray-500 mb-4">
            Click "Start Analysis" to begin the Query Fan-out process. This will expand your topic into multiple related queries and analyze them in parallel.
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Expands primary query into semantic variants</p>
            <p>• Generates long-tail keyword opportunities</p>
            <p>• Analyzes competitor-specific queries</p>
            <p>• Executes queries in parallel for efficiency</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryFanoutAnalyzer;
