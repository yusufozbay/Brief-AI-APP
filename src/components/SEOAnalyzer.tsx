import React, { useState } from 'react';
import { Search, Target, Users, TrendingUp, FileText, CheckCircle, Lightbulb, BarChart3, ArrowRight, Share2, Copy, ExternalLink, Zap } from 'lucide-react';
import ReferralCodeInput from './ReferralCodeInput';
import { CompetitorSelection } from '../types/serp';
import { geminiAIService } from '../services/geminiAI';
import { firebaseService } from '../services/firebase';
import { referralService } from '../services/referralService';
import { incrementTokenUsageWithComprehensiveDetails, TokenUsage, AnalysisDetails } from '../services/tokenUsageService';
import { QueryFanoutResult } from '../services/queryFanout';
import { queryFanoutService } from '../services/queryFanout';
import { dataForSEOService } from '../services/dataForSEO';

interface AnalysisResult {
  topic: string;
  userIntent: string;
  competitorTone: string;
  uniqueValue: string;
  competitorAnalysisSummary: string;
  competitorStrengths: string[];
  contentGaps: string[];
  dominantTone: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleSuggestions: {
    clickFocused: string;
    seoFocused: string;
  };
  metaDescription: string;
  keyTakeaways: string[];
  contentOutline: OutlineSection[];
  faqSection: FAQ[];
  schemaStrategy: {
    mainSchema: string;
    supportingSchemas: string[];
    reasoning: string;
  };
  qualityChecklist: Array<{
    item: string;
    status: boolean;
    note: string;
  }>;
  competitorAnalysis?: {
    competitorCount: number;
    averageWordCount: number;
    commonHeadings: string[];
    dominantTone: string;
    competitorStrengths: string[];
    competitorWeaknesses: string[];
    contentGaps: string[];
    recommendedUVP: string;
  };
  // QFO Enhancement properties
  qfoEnhanced?: boolean;
  qfoInsights?: {
    semanticQueries: any[];
    contentGaps: any[];
    briefRecommendations: any[];
    processingMetadata: any;
  };
  enhancedContent?: string;
}

interface OutlineSection {
  level: 'H1' | 'H2' | 'H3';
  title: string;
  content: string;
  keyInfo?: string;
  storytelling?: string;
  imagePrompt?: string;
  icebreakerIdeas?: string[];
}

interface FAQ {
  question: string;
  answer: string;
}

const SEOAnalyzer: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [entities, setEntities] = useState('');
  const [currentStep, setCurrentStep] = useState<'input' | 'qfo' | 'results'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorSelection[]>([]);
  const [queryFanoutResult, setQueryFanoutResult] = useState<QueryFanoutResult | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
  
  // Referral code state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isCodeValidated, setIsCodeValidated] = useState(false);

  const proceedToAnalysis = async () => {
    if (!topic.trim() || !isCodeValidated) return;
    
    setIsAnalyzing(true);
    setCurrentStep('qfo'); // Show loading UI immediately
    
    try {
      // Automatically fetch and select competitors
      const competitors = await dataForSEOService.fetchSERPResults(topic);
      setSelectedCompetitors(competitors);
      
      // Start the actual analysis
      await generateFinalAnalysisWithQFO(undefined, undefined, competitors);
      
    } catch (error) {
      console.error('Error during analysis:', error);
      alert(error instanceof Error ? error.message : 'Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      setCurrentStep('input'); // Go back to input on error
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReferralCodeValidated = (code: string) => {
    setReferralCode(code);
    setIsCodeValidated(true);
  };

  const handleReferralCodeInvalid = () => {
    setIsCodeValidated(false);
    setReferralCode(null);
  };


  const goBackToInput = () => {
    setCurrentStep('input');
    setResult(null);
    setSelectedCompetitors([]);
    setQueryFanoutResult(null);
  };

    const generateFinalAnalysis = async (competitorData?: any, competitors: CompetitorSelection[] = selectedCompetitors) => {
    if (!referralCode) {
      alert('Referans kodu gerekli!');
      return;
    }

    setCurrentStep('results');
    setIsAnalyzing(true);
    
    try {
      // Use Gemini AI for actual content strategy generation
      const geminiResult = await geminiAIService.generateContentStrategy(
        topic,
        competitors,
        competitorData
      );
      
      // Extract actual token usage from Gemini response
      const actualTokenUsage = geminiResult.tokenUsage?.totalTokens || 1000; // Fallback to 1000 if not available
      console.log('📊 Actual token usage from Gemini:', actualTokenUsage);
      
      // Use credits for the analysis with actual token usage
      const creditsUsed = await referralService.useCredits(referralCode, actualTokenUsage);
      if (!creditsUsed) {
        alert('Yetersiz kredi! Lütfen referans kodunuzu kontrol edin.');
        setIsAnalyzing(false);
        return;
      }

      console.log('✅ Credits used successfully for referral code:', referralCode, 'Tokens:', actualTokenUsage);
      
      // Track comprehensive token usage in Firebase
      if (geminiResult.tokenUsage && geminiResult.tokenUsage.totalTokens > 0) {
        try {
          const tokenUsage: TokenUsage = {
            promptTokens: geminiResult.tokenUsage.promptTokens,
            candidatesTokens: geminiResult.tokenUsage.candidatesTokens,
            totalTokens: geminiResult.tokenUsage.totalTokens,
            thoughtsTokens: geminiResult.tokenUsage.thoughtsTokens,
            cachedTokens: geminiResult.tokenUsage.cachedTokens
          };

          const analysisDetails: AnalysisDetails = {
            url: window.location.href,
            analysisType: 'single',
            status: 'completed',
            model: 'gemini-2.5-pro',
            step: 'comprehensive-analysis'
          };

          // Use referral code as userId for token tracking
          await incrementTokenUsageWithComprehensiveDetails(referralCode, tokenUsage, analysisDetails);
          console.log('✅ Token usage tracked successfully in Firebase');
        } catch (tokenError) {
          console.error('❌ Error tracking token usage:', tokenError);
          // Don't fail the entire analysis if token tracking fails
        }
      }
      
      // Convert Gemini result to our AnalysisResult format
      const analysisResult: AnalysisResult = {
        topic: geminiResult.topic,
        userIntent: geminiResult.userIntent,
        competitorTone: geminiResult.competitorTone,
        uniqueValue: geminiResult.uniqueValue,
        competitorAnalysisSummary: geminiResult.competitorAnalysisSummary,
        competitorStrengths: geminiResult.competitorStrengths,
        contentGaps: geminiResult.contentGaps,
        dominantTone: geminiResult.dominantTone,
        primaryKeyword: geminiResult.primaryKeyword,
        secondaryKeywords: geminiResult.secondaryKeywords,
        titleSuggestions: geminiResult.titleSuggestions,
        metaDescription: geminiResult.metaDescription,
        keyTakeaways: geminiResult.keyTakeaways,
        contentOutline: geminiResult.contentOutline,
        faqSection: geminiResult.faqSection,
        schemaStrategy: geminiResult.schemaStrategy,
        qualityChecklist: geminiResult.qualityChecklist,
      };

      // Enhance with Query Fan-out insights if available
      if (queryFanoutResult) {
        // Merge Query Fan-out insights with AI-generated content gaps
        const enhancedContentGaps = [
          ...geminiResult.contentGaps,
          ...queryFanoutResult.aggregatedData.insights.contentGaps
        ];
        
        // Remove duplicates and limit to top insights
        analysisResult.contentGaps = [...new Set(enhancedContentGaps)].slice(0, 8);
        
        // Add Query Fan-out specific insights to the analysis
        (analysisResult as any).queryFanoutInsights = {
          expandedQueries: queryFanoutResult.expandedQueries,
          queryTypePerformance: queryFanoutResult.aggregatedData.queryTypeAnalysis,
          recommendedStrategy: queryFanoutResult.aggregatedData.insights.recommendedStrategy,
          competitiveAdvantages: queryFanoutResult.aggregatedData.insights.competitiveAdvantages
        };
      }
      
      if (competitorData) {
        analysisResult.competitorAnalysis = competitorData;
      }
      
      setResult(analysisResult);
      
      // Store the generated brief
      try {
        console.log('📤 Storing generated brief for referral code:', referralCode);
        const clientIP = await referralService.getClientIP();
        const briefId = await referralService.storeGeneratedBrief(
          referralCode,
          topic,
          analysisResult.primaryKeyword || topic,
          analysisResult,
          clientIP,
          navigator.userAgent
        );
        console.log('✅ Brief stored successfully with ID:', briefId);
      } catch (error) {
        console.error('❌ Error storing brief:', error);
        // Don't fail the analysis if storage fails, but log it
        alert('Brief oluşturuldu ancak kaydedilemedi. Lütfen tekrar deneyin.');
      }
      
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Gemini AI analysis failed:', error);
      
      // Track failed analysis in Firebase
      if (referralCode) {
        try {
          const tokenUsage: TokenUsage = {
            promptTokens: 0,
            candidatesTokens: 0,
            totalTokens: 0,
            thoughtsTokens: 0,
            cachedTokens: 0
          };

          const analysisDetails: AnalysisDetails = {
            url: window.location.href,
            analysisType: 'single',
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            model: 'gemini-2.5-pro',
            step: 'comprehensive-analysis'
          };

          await incrementTokenUsageWithComprehensiveDetails(referralCode, tokenUsage, analysisDetails);
          console.log('✅ Failed analysis tracked in Firebase');
        } catch (tokenError) {
          console.error('❌ Error tracking failed analysis:', tokenError);
        }
      }
      
      alert('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      setIsAnalyzing(false);
    }
  };

  /**
   * Enhanced final analysis with integrated Query Fan-Out
   */
  const generateFinalAnalysisWithQFO = async (
    competitorData?: any,
    qfoData?: QueryFanoutResult,
    competitors: CompetitorSelection[] = selectedCompetitors
  ) => {
    setCurrentStep('results');
    setIsAnalyzing(true);
    
    try {
      console.log('🚀 Starting enhanced analysis with integrated Query Fan-Out...');
      
      // Execute Query Fan-Out analysis in parallel with main analysis
      const qfoRequest = {
        mainContent: topic,
        targetAudience: 'general',
        contentType: 'brief' as const,
        analysisType: 'deep' as const,
        concurrencyLimit: 8,
        language: 'tr',
        industry: 'general'
      };

      // Run QFO analysis in parallel
      const qfoPromise = queryFanoutService.executeBriefFanOut(qfoRequest);
      
      // Prepare enhanced competitor data with QFO insights
      const enhancedCompetitorData = {
        ...competitorData,
        qfoInsights: qfoData ? {
          expandedQueries: qfoData.expandedQueries,
          queryTypePerformance: qfoData.aggregatedData?.queryTypeAnalysis || {},
          contentGaps: qfoData.aggregatedData?.insights?.contentGaps || [],
          commonThemes: qfoData.aggregatedData?.insights?.commonThemes || [],
          recommendedStrategy: qfoData.aggregatedData?.insights?.recommendedStrategy || '',
          competitiveAdvantages: qfoData.aggregatedData?.insights?.competitiveAdvantages || [],
          uniqueResults: qfoData.aggregatedData?.uniqueResults || 0,
          successRate: qfoData.successRate || 0
        } : null
      };

      // Generate main analysis with QFO insights
      const analysisResult = await geminiAIService.generateContentStrategy(
        topic,
        competitors,
        enhancedCompetitorData
      );
      
      console.log('✅ Main analysis completed, tracking token usage...');
      
      // Track token usage for main analysis
      if (analysisResult.tokenUsage && analysisResult.tokenUsage.totalTokens > 0 && referralCode) {
        try {
          const tokenUsage: TokenUsage = {
            promptTokens: analysisResult.tokenUsage.promptTokens,
            candidatesTokens: analysisResult.tokenUsage.candidatesTokens,
            totalTokens: analysisResult.tokenUsage.totalTokens,
            thoughtsTokens: analysisResult.tokenUsage.thoughtsTokens,
            cachedTokens: analysisResult.tokenUsage.cachedTokens
          };

          const analysisDetails: AnalysisDetails = {
            url: window.location.href,
            analysisType: 'single',
            status: 'completed',
            model: 'gemini-2.5-pro',
            step: 'enhanced-analysis-with-qfo'
          };

          await incrementTokenUsageWithComprehensiveDetails(referralCode, tokenUsage, analysisDetails);
          console.log('✅ Enhanced analysis token usage tracked successfully in Firebase');
        } catch (tokenError) {
          console.error('❌ Error tracking enhanced analysis token usage:', tokenError);
        }
      }

      // Wait for QFO results and enhance the analysis
      const qfoResult = await qfoPromise;
      
      // Create enhanced result with QFO data
      const enhancedResult = {
        ...analysisResult,
        qfoEnhanced: true,
        qfoInsights: {
          semanticQueries: qfoResult.semanticQueries,
          contentGaps: qfoResult.contentGaps,
          briefRecommendations: qfoResult.briefRecommendations,
          processingMetadata: qfoResult.metadata
        },
        enhancedContent: qfoResult.enhancedContent,
        // Add QFO insights to existing analysis
        contentOutline: analysisResult.contentOutline.map((section, index) => ({
          ...section,
          qfoInsights: qfoResult.semanticQueries
            .filter((q: any) => q.semanticRelevance > 0.7)
            .slice(index * 2, (index + 1) * 2)
            .map((q: any) => ({
              query: q.query,
              briefType: q.briefType,
              opportunityScore: q.opportunityScore
            }))
        })),
        secondaryKeywords: [
          ...analysisResult.secondaryKeywords,
          ...qfoResult.semanticQueries
            .filter((q: any) => q.semanticRelevance > 0.8)
            .map((q: any) => q.query)
        ].slice(0, 12), // Limit to 12 keywords total
        // Enhance FAQ with QFO insights
        faqSection: [
          ...analysisResult.faqSection,
          ...qfoResult.contentGaps
            .filter((gap: any) => gap.priority >= 2)
            .slice(0, 3)
            .map((gap: any) => ({
              question: `How to address ${gap.topic}?`,
              answer: gap.suggestedContent
            }))
        ]
      };
      
      setResult(enhancedResult);
      console.log('✅ Enhanced analysis with QFO completed successfully');
    } catch (error) {
      console.error('❌ Enhanced analysis failed:', error);
      
      // Track failed enhanced analysis in Firebase
      if (referralCode) {
        try {
          const tokenUsage: TokenUsage = {
            promptTokens: 0,
            candidatesTokens: 0,
            totalTokens: 0,
            thoughtsTokens: 0,
            cachedTokens: 0
          };

          const analysisDetails: AnalysisDetails = {
            url: window.location.href,
            analysisType: 'single',
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            model: 'gemini-2.5-pro',
            step: 'enhanced-analysis-with-qfo'
          };

          await incrementTokenUsageWithComprehensiveDetails(referralCode, tokenUsage, analysisDetails);
          console.log('✅ Failed enhanced analysis tracked in Firebase');
        } catch (tokenError) {
          console.error('❌ Error tracking failed enhanced analysis:', tokenError);
        }
      }
      
      // Fallback to regular analysis
      generateFinalAnalysis(competitorData, competitors);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Legacy QFO integration method (kept for backward compatibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateFinalAnalysisWithQFO_Legacy = async (competitorData?: any, qfoData?: QueryFanoutResult) => {
    setCurrentStep('results');
    setIsAnalyzing(true);
    
    try {
      console.log('🚀 Starting enhanced analysis with QFO data integration...');
      
      // Prepare enhanced data for Gemini AI
      const enhancedCompetitorData = {
        ...competitorData,
        qfoInsights: qfoData ? {
          expandedQueries: qfoData.expandedQueries,
          queryTypePerformance: qfoData.aggregatedData.queryTypeAnalysis,
          contentGaps: qfoData.aggregatedData.insights.contentGaps,
          commonThemes: qfoData.aggregatedData.insights.commonThemes,
          recommendedStrategy: qfoData.aggregatedData.insights.recommendedStrategy,
          competitiveAdvantages: qfoData.aggregatedData.insights.competitiveAdvantages,
          uniqueResults: qfoData.aggregatedData.uniqueResults,
          successRate: qfoData.successRate
        } : null
      };

      console.log('📊 Enhanced competitor data with QFO insights:', enhancedCompetitorData);
      
      // Use Gemini AI with enhanced QFO data for superior content strategy generation
      const geminiResult = await geminiAIService.generateContentStrategy(
        topic,
        selectedCompetitors,
        enhancedCompetitorData
      );
      
      console.log('✅ Gemini AI analysis completed with QFO integration');
      
      // Convert Gemini result to our AnalysisResult format
      const analysisResult: AnalysisResult = {
        topic: geminiResult.topic,
        userIntent: geminiResult.userIntent,
        competitorTone: geminiResult.competitorTone,
        uniqueValue: geminiResult.uniqueValue,
        competitorAnalysisSummary: geminiResult.competitorAnalysisSummary,
        competitorStrengths: geminiResult.competitorStrengths,
        contentGaps: geminiResult.contentGaps,
        dominantTone: geminiResult.dominantTone,
        primaryKeyword: geminiResult.primaryKeyword,
        secondaryKeywords: geminiResult.secondaryKeywords,
        titleSuggestions: geminiResult.titleSuggestions,
        metaDescription: geminiResult.metaDescription,
        keyTakeaways: geminiResult.keyTakeaways,
        contentOutline: geminiResult.contentOutline,
        faqSection: geminiResult.faqSection,
        schemaStrategy: geminiResult.schemaStrategy,
        qualityChecklist: geminiResult.qualityChecklist,
      };

      // Enhanced integration of QFO insights
      if (qfoData) {
        console.log('🔗 Integrating QFO insights into final analysis...');
        
        // Merge and enhance content gaps with QFO data
        const enhancedContentGaps = [
          ...geminiResult.contentGaps,
          ...qfoData.aggregatedData.insights.contentGaps
        ];
        
        // Remove duplicates and prioritize QFO insights
        const uniqueGaps = [...new Set(enhancedContentGaps)];
        analysisResult.contentGaps = uniqueGaps.slice(0, 10);
        
        // Enhance secondary keywords with QFO query insights
        if (qfoData.expandedQueries.length > 0) {
          const qfoKeywords = qfoData.expandedQueries
            .filter(query => query !== topic)
            .map(query => query.replace(topic, '').trim())
            .filter(keyword => keyword.length > 0);
          
          analysisResult.secondaryKeywords = [
            ...analysisResult.secondaryKeywords,
            ...qfoKeywords
          ].slice(0, 15); // Limit to top 15 keywords
        }
        
        // Add comprehensive QFO insights to the analysis
        (analysisResult as any).queryFanoutInsights = {
          expandedQueries: qfoData.expandedQueries,
          queryTypePerformance: qfoData.aggregatedData.queryTypeAnalysis,
          recommendedStrategy: qfoData.aggregatedData.insights.recommendedStrategy,
          competitiveAdvantages: qfoData.aggregatedData.insights.competitiveAdvantages,
          contentGaps: qfoData.aggregatedData.insights.contentGaps,
          commonThemes: qfoData.aggregatedData.insights.commonThemes,
          executionMetrics: {
            totalQueries: qfoData.aggregatedData.totalQueries,
            successfulQueries: qfoData.aggregatedData.successfulQueries,
            successRate: qfoData.successRate,
            executionTime: qfoData.executionTime
          }
        };
        
        console.log('✅ QFO insights successfully integrated');
      }
      
      if (competitorData) {
        analysisResult.competitorAnalysis = competitorData;
      }
      
      setResult(analysisResult);
      setIsAnalyzing(false);
      
      console.log('🎉 Enhanced analysis with QFO integration completed successfully');
      
    } catch (error) {
      console.error('❌ Enhanced analysis with QFO failed:', error);
      setIsAnalyzing(false);
      
      // Fallback to basic analysis if enhanced analysis fails
      console.log('🔄 Falling back to basic analysis...');
      generateFinalAnalysis(competitorData);
    }
  };

  const resetAnalysis = () => {
    setCurrentStep('input');
    setTopic('');
    setEntities('');
    setResult(null);
    setSelectedCompetitors([]);
    setQueryFanoutResult(null);
    setShareUrl(null);
    setShowShareModal(false);
  };

  const handleShareBrief = async () => {
    if (!result) return;
    
    setIsSharing(true);
    try {
      // Validate that we have essential data before sharing
      if (!result.topic || !result.primaryKeyword) {
        alert('Brief eksik veriler içeriyor. Lütfen analizi tamamlayın.');
        return;
      }
      
      console.log('📤 Preparing brief for sharing...', {
        topic: result.topic,
        hasKeywords: !!result.secondaryKeywords?.length,
        hasOutline: !!result.contentOutline?.length,
        hasFAQ: !!result.faqSection?.length,
        referralCode: referralCode
      });
      
      const briefId = await firebaseService.shareBrief({
        topic: result.topic || 'Untitled Brief',
        userIntent: result.userIntent || '',
        competitorTone: result.competitorTone || '',
        uniqueValue: result.uniqueValue || '',
        competitorAnalysisSummary: result.competitorAnalysisSummary || '',
        competitorStrengths: result.competitorStrengths || [],
        contentGaps: result.contentGaps || [],
        dominantTone: result.dominantTone || '',
        primaryKeyword: result.primaryKeyword || '',
        secondaryKeywords: result.secondaryKeywords || [],
        titleSuggestions: result.titleSuggestions || { clickFocused: '', seoFocused: '' },
        metaDescription: result.metaDescription || '',
        keyTakeaways: result.keyTakeaways || [],
        contentOutline: result.contentOutline || [],
        faqSection: result.faqSection || [],
        schemaStrategy: result.schemaStrategy || { mainSchema: '', supportingSchemas: [], reasoning: '' },
        qualityChecklist: result.qualityChecklist || [],
        competitorAnalysis: result.competitorAnalysis || null
      });
      
      const url = `${window.location.origin}/share/${briefId}`;
      setShareUrl(url);
      setShowShareModal(true);
      console.log('✅ Brief shared successfully:', url);
    } catch (error) {
      console.error('❌ Error sharing brief:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      alert('Paylaşım sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link kopyalandı!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Link kopyalanamadı. Lütfen manuel olarak kopyalayın.');
    }
  };

  const copyImagePrompt = async (imagePrompt: string, sectionIndex: number) => {
    try {
      await navigator.clipboard.writeText(imagePrompt);
      setCopiedPromptIndex(sectionIndex);
      window.setTimeout(() => setCopiedPromptIndex(currentIndex =>
        currentIndex === sectionIndex ? null : currentIndex
      ), 2000);
    } catch (error) {
      console.error('Image prompt could not be copied:', error);
    }
  };

  const getKeyTakeaways = (outline: OutlineSection[]) => {
    const suppliedTakeaways = result?.keyTakeaways?.filter(takeaway => takeaway.trim()) || [];
    if (suppliedTakeaways.length >= 3) return suppliedTakeaways.slice(0, 3);

    const derivedTakeaways = outline
      .filter(section => section.level === 'H2')
      .slice(0, 3)
      .map(section => `${section.title} ile daha bilinçli seçimler yapın ve uygulanabilir sonuçlar elde edin.`);

    while (derivedTakeaways.length < 3) {
      derivedTakeaways.push(`${result?.topic || 'Konu'} hakkında güvenilir bilgilerle etkili ve sürdürülebilir kararlar verin.`);
    }

    return derivedTakeaways;
  };

  const getImagePrompt = (section: OutlineSection) => section.imagePrompt ||
    `Cinematic premium editorial image illustrating ${section.title} for ${result?.topic || 'this topic'}, sophisticated composition, rich tactile detail, dramatic natural lighting, photorealistic, high-end magazine photography, no text, no logo, no watermark`;

  const getIcebreakerIdeas = (section: OutlineSection) => {
    const suppliedIdeas = section.icebreakerIdeas?.filter(idea => idea.trim()).slice(0, 2) || [];
    const fallbackIdeas = [
      `${section.title} ilk bakışta basit görünebilir; doğru yaklaşım ise sonucu doğrudan değiştirir.`,
      `Peki, ${result?.topic || 'bu konu'} kapsamında bu başlık neden şimdi önem kazanıyor?`
    ];

    return [...suppliedIdeas, ...fallbackIdeas].slice(0, 2);
  };

  const keyTakeaways = result ? getKeyTakeaways(result.contentOutline) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Mosanta Brief AI</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create AI-Driven Content Briefs
          </p>
        </div>


        {/* Referral Code Input */}
        {currentStep === 'input' && (
          <ReferralCodeInput 
            onCodeValidated={handleReferralCodeValidated}
            onCodeInvalid={handleReferralCodeInvalid}
          />
        )}

        {/* Step 1: Input Form */}
        {currentStep === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-2" />
                  Ana Konu / Anahtar Kelime
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: dijital pazarlama, seo optimizasyonu, içerik pazarlaması"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  İlgili Varlıklar (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={entities}
                  onChange={(e) => setEntities(e.target.value)}
                  placeholder="Markalar, kişiler, yerler (virgülle ayırın)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={proceedToAnalysis}
              disabled={!topic.trim() || !isCodeValidated || isAnalyzing}
              className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Rakip Analizi Yapılıyor...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Analizi Başlat
                </>
              )}
            </button>
            
            {!isCodeValidated && (
              <p className="text-sm text-red-600 text-center mt-2">
                Devam etmek için geçerli bir referans kodu girmelisiniz
              </p>
            )}
          </div>
        )}

        {/* QFO Analysis Step */}
        {currentStep === 'qfo' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <Zap className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Gelişmiş Analiz Yapılıyor</h2>
                <p className="text-gray-600">
                  <strong>{topic}</strong> konusu için rakip analizi ve AI destekli içerik stratejisi oluşturuluyor...
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Rakip analizi tamamlandı</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">AI analizi yapılıyor...</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Bu işlem birkaç dakika sürebilir. Lütfen sayfayı kapatmayın.
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {currentStep === 'results' && (
          <div className="space-y-8">
            {/* Back Navigation and Share Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBackToInput}
                  className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Konu Girişine Geri Dön
                </button>
                <button
                  onClick={resetAnalysis}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  ← Yeni Analiz Başlat
                </button>
              </div>
              <div className="flex items-center space-x-4">
                {isAnalyzing && (
                  <div className="flex items-center text-indigo-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                    Strateji oluşturuluyor...
                  </div>
                )}
                {!isAnalyzing && result && (
                  <button
                    onClick={handleShareBrief}
                    disabled={isSharing}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {isSharing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Share2 className="w-4 h-4 mr-2" />
                    )}
                    Briefi Paylaş
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isAnalyzing && !result && (
              <div className="bg-white rounded-xl shadow-lg p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    🚀 Gelişmiş Analiz
                  </h2>
                  <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    AI modelimiz rakip analizinizi yapıyor ve size özel içerik stratejinizi hazırlıyor. 
                    Gelişmiş analiz teknikleri ile kapsamlı brief oluşturuyor.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">Rakip Analizi</h3>
                      <p className="text-sm text-gray-600">Seçilen rakiplerin içerik stratejileri detaylı olarak inceleniyor</p>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">AI Optimizasyonu</h3>
                      <p className="text-sm text-gray-600">Semantik sorgu genişletme ve paralel analiz yapıyoruz</p>
                    </div>
                    
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">AI Optimizasyonu</h3>
                      <p className="text-sm text-gray-600">QFO verileri ile gelişmiş brief stratejisi oluşturuyoruz</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-sm text-gray-700">
                      💡 <strong>İpucu:</strong> Bu süre zarfında sayfayı kapatmayın. Analiziniz tamamlandığında otomatik olarak sonuçlar görüntülenecek.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Content */}
            {result && (
              <>
                {/* Strategic Overview */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 text-indigo-600" />
                AI Destekli Stratejik Analiz
                {result.qfoEnhanced && (
                  <span className="ml-3 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                    QFO Enhanced
                  </span>
                )}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Kullanıcı Niyeti</h3>
                  <p className="text-gray-700">{result.userIntent}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Rakip Ton Analizi</h3>
                  <p className="text-gray-700">{result.competitorTone}</p>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                  Özgün Değer Teklifi (UVP)
                </h3>
                <p className="text-gray-700 mb-3"><strong>Rekabet Analizi:</strong> {result.competitorAnalysisSummary}</p>
                <p className="text-gray-700"><strong>Sizin Benzersiz Değeriniz:</strong> {result.uniqueValue}</p>
              </div>
            </div>

            {/* Competitor Analysis Results */}
            {result.competitorAnalysis && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Detaylı Rakip Analizi Sonuçları</h2>
                
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.competitorAnalysis.competitorCount}</div>
                    <div className="text-sm text-gray-600">Analiz Edilen Rakip</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.competitorAnalysis.averageWordCount}</div>
                    <div className="text-sm text-gray-600">Ortalama Kelime Sayısı</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{result.dominantTone}</div>
                    <div className="text-sm text-gray-600">Baskın İçerik Tonu</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rakiplerin Güçlü Yönleri</h3>
                    <ul className="space-y-2">
                      {result.competitorStrengths.slice(0, 5).map((strength: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Tespit Edilen İçerik Boşlukları</h3>
                    <ul className="space-y-2">
                      {result.contentGaps.map((gap: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <Lightbulb className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Query Fan-out Insights */}
            {(result as any).queryFanoutInsights && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-indigo-600" />
                  Query Fan-out Analiz Sonuçları
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-indigo-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3">Genişletilmiş Sorgular</h3>
                    <div className="space-y-2">
                      {(result as any).queryFanoutInsights.expandedQueries.map((query: string, index: number) => (
                        <div key={index} className="flex items-center text-sm text-gray-700">
                          <Search className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
                          {query}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3">Önerilen Strateji</h3>
                    <p className="text-gray-700 text-sm">
                      {(result as any).queryFanoutInsights.recommendedStrategy}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Sorgu Tipi Performansı</h3>
                    <div className="space-y-3">
                      {Object.entries((result as any).queryFanoutInsights.queryTypePerformance).map(([type, stats]: [string, any]) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700 capitalize">{type}</span>
                          <div className="text-sm text-gray-600">
                            <span className="mr-3">Başarı: {Math.round(stats.successRate * 100)}%</span>
                            <span>Sayı: {stats.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rekabet Avantajları</h3>
                    <ul className="space-y-2">
                      {(result as any).queryFanoutInsights.competitiveAdvantages.map((advantage: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords & Titles */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Anahtar Kelime ve Başlık Stratejisi</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Ana Anahtar Kelime</h3>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <span className="font-mono text-indigo-800">{result.primaryKeyword}</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-800 mb-3">İkincil Anahtar Kelimeler</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.secondaryKeywords.map((keyword, index) => (
                      <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 1 (Tıklama Odaklı)</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800">{result.titleSuggestions.clickFocused}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Başlık Önerisi 2 (SEO Odaklı)</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-800">{result.titleSuggestions.seoFocused}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">AI Tarafından Geliştirilen Özgün Değer Teklifi</h3>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-700">{result.metaDescription}</p>
                  <p className="text-sm text-gray-500 mt-2">Karakter sayısı: {result.metaDescription.length}/155</p>
                  {selectedCompetitors.length > 0 && (
                    <div className="mt-3">
                      <strong className="text-sm text-gray-700">Seçilen Rakipler:</strong>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                        {selectedCompetitors.map((competitor) => (
                          <a
                            key={competitor.url}
                            href={competitor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={competitor.domain}
                            className="inline-flex max-w-full items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 hover:underline"
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(competitor.domain)}&sz=32`}
                              alt=""
                              className="h-4 w-4 shrink-0"
                            />
                            <span>{competitor.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Outline */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-indigo-600" />
                Detaylı İçerik Planı
              </h2>

              <section className="mb-6 border-l-4 border-amber-400 bg-amber-50 p-4" aria-labelledby="key-takeaways-title">
                <h3 id="key-takeaways-title" className="font-semibold text-gray-800">📌 Key Takeaways (Önemli Çıkarımlar)</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                  {keyTakeaways.map((takeaway, index) => (
                    <li key={index}>{takeaway}</li>
                  ))}
                </ul>
              </section>
              
              <div className="space-y-6">
                {result.contentOutline.map((section, index) => (
                  <div key={index} className="border-l-4 border-indigo-400 pl-6">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-mono mr-3">
                        {section.level}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                    </div>
                    <p className="text-gray-700 mb-3">{section.content}</p>
                    {section.level === 'H2' && (
                      <div className="mb-3 border-l-4 border-indigo-200 bg-indigo-50 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-indigo-900">✍️ Giriş Fikirleri:</h4>
                        <div className="space-y-1 text-sm italic text-indigo-800">
                          {getIcebreakerIdeas(section).map((idea, ideaIndex) => (
                            <p key={ideaIndex}>"{idea}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {section.keyInfo && (
                      <div className="bg-yellow-50 p-3 rounded-lg mb-2 border-l-4 border-yellow-400">
                        <p className="text-sm"><strong>💡 Kilit Bilgi:</strong> {section.keyInfo}</p>
                      </div>
                    )}
                    
                    {section.storytelling && (
                      <div className="bg-[#F7F5FC] p-3 rounded-lg border-l-4 border-purple-400">
                        <p className="text-sm"><strong>✍️ Hikayeleştirme:</strong> {section.storytelling}</p>
                      </div>
                    )}

                    {section.level === 'H2' && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-[#B8BEC7] border-l-4 border-l-violet-400 bg-[#ECEDEF] text-slate-800">
                        <div className="flex items-center justify-between gap-3 border-b border-[#B8BEC7] bg-[#D9DDE2] px-3 py-2">
                          <h4 className="text-sm font-semibold text-violet-950">🎨 Görsel Prompt</h4>
                          <button
                            type="button"
                            onClick={() => copyImagePrompt(getImagePrompt(section), index)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-violet-300 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-200"
                          >
                            {copiedPromptIndex === index ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedPromptIndex === index ? 'Kopyalandı' : 'Kopyala'}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words p-3 text-sm leading-6">{getImagePrompt(section)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Sıkça Sorulan Sorular (SSS)</h2>
              <div className="space-y-4">
                {result.faqSection.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">{faq.question}</h3>
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Schema Strategy */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Yapısal Veri (Schema.org) Stratejisi</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Ana Schema</h3>
                  <div className="bg-indigo-100 p-4 rounded-lg">
                    <span className="font-mono text-indigo-800">{result.schemaStrategy.mainSchema}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Destekleyici Schemalar</h3>
                  <div className="space-y-2">
                    {result.schemaStrategy.supportingSchemas.map((schema, index) => (
                      <div key={index} className="bg-gray-100 p-2 rounded">
                        <span className="font-mono text-gray-700">{schema}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Gerekçe</h3>
                <p className="text-gray-700">{result.schemaStrategy.reasoning}</p>
              </div>
            </div>

            {/* Quality Checklist */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                Yayın Öncesi Kalite Kontrol Listesi
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {result.qualityChecklist.map((checkItem, index) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${checkItem.status ? 'text-green-500' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <span className="text-gray-700 font-medium">{checkItem.item}</span>
                      {checkItem.note && (
                        <p className="text-sm text-gray-600 mt-1">{checkItem.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              </>
            )}

            {/* Share Modal */}
            {showShareModal && shareUrl && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Brief Başarıyla Paylaşıldı!</h3>
                    <p className="text-gray-600 mb-6">Brief'iniz paylaşıma hazır. Aşağıdaki linki kopyalayarak istediğiniz kişilerle paylaşabilirsiniz.</p>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate flex-1 mr-2">{shareUrl}</span>
                        <button
                          onClick={() => copyToClipboard(shareUrl)}
                          className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Kopyala
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => window.open(shareUrl, '_blank')}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Önizle
                      </button>
                      <button
                        onClick={() => setShowShareModal(false)}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOAnalyzer;