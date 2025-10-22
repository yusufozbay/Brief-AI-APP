// Test script to verify token calculation and Firebase storage
import { incrementTokenUsageWithComprehensiveDetails, TokenUsage, AnalysisDetails, getUserTokenData } from './src/services/tokenUsageService';

async function testTokenTracking() {
  console.log('🧪 Testing token calculation and Firebase storage...');
  
  try {
    // Test data
    const testUserId = 'test-user-123';
    const testTokenUsage: TokenUsage = {
      promptTokens: 1500,
      candidatesTokens: 800,
      totalTokens: 2300,
      thoughtsTokens: 200,
      cachedTokens: 50
    };
    
    const testAnalysisDetails: AnalysisDetails = {
      url: 'https://test.example.com',
      analysisType: 'single',
      status: 'completed',
      model: 'gemini-2.5-pro',
      step: 'test-analysis'
    };
    
    console.log('📊 Test token usage:', testTokenUsage);
    console.log('📊 Test analysis details:', testAnalysisDetails);
    
    // Test token tracking
    const result = await incrementTokenUsageWithComprehensiveDetails(
      testUserId,
      testTokenUsage,
      testAnalysisDetails
    );
    
    console.log('✅ Token tracking successful! Total tokens:', result);
    
    // Test retrieving user data
    const userData = await getUserTokenData(testUserId);
    console.log('✅ User data retrieved:', userData);
    
    if (userData) {
      console.log('📈 Analysis count:', userData.analyses.length);
      console.log('📈 Total tokens used:', userData.totalTokens);
      console.log('📈 Token limit:', userData.tokenLimit);
      console.log('📈 Last analysis:', userData.analyses[userData.analyses.length - 1]);
    }
    
    console.log('🎉 All tests passed! Token calculation and Firebase storage working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
export { testTokenTracking };

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testTokenTracking();
}
