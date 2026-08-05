import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';

// Collection name for token usage data
const COLLECTION = 'tokenUsage';
const DEFAULT_TOKEN_LIMIT = 1_000_000;

// Token usage interface
export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  thoughtsTokens: number;
  cachedTokens: number;
  toolUseTokens: number;
}

// Analysis details interface
export interface AnalysisDetails {
  url: string;
  analysisType: 'single' | 'bulk';
  status: 'completed' | 'failed';
  error?: string;
  model?: string;
  step?: string;
}

// User token data interface
export interface UserTokenData {
  totalTokens: number;
  tokenLimit: number;
  analyses: AnalysisRecord[];
  dailyUsage: { [date: string]: number };
  monthlyUsage: { [month: string]: number };
  lastUpdated: any; // Firebase timestamp
}

// Analysis record interface
export interface AnalysisRecord {
  id: string;
  timestamp: string;
  url: string;
  analysisType: 'single' | 'bulk';
  status: 'completed' | 'failed';
  tokensUsed: number;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  cachedTokens: number;
  toolUseTokens: number;
  error?: string | null;
  model?: string;
  step?: string;
}

/**
 * Generate a unique analysis ID
 */
function generateAnalysisId(): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return `analysis_${timestamp}_${randomId}`;
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Basic token increment function
 */
export async function incrementTokenUsage(userId: string, tokens: number): Promise<number> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      totalTokens: tokens,
      tokenLimit: DEFAULT_TOKEN_LIMIT,
      lastUpdated: serverTimestamp()
    });
    return tokens;
  }

  const data = snap.data();
  const limit = data.tokenLimit || DEFAULT_TOKEN_LIMIT;

  if ((data.totalTokens + tokens) > limit) {
    throw new Error('Token limit reached. Please pay');
  }

  await updateDoc(ref, {
    totalTokens: increment(tokens),
    lastUpdated: serverTimestamp()
  });

  return data.totalTokens + tokens;
}

/**
 * Check if user can use tokens
 */
export async function canUseTokens(userId: string, tokens: number): Promise<boolean> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return true;

  const data = snap.data();
  const limit = data.tokenLimit || DEFAULT_TOKEN_LIMIT;

  return (data.totalTokens + tokens) <= limit;
}

/**
 * Records one provider-reported Gemini call and applies its total to every aggregate once.
 */
export async function incrementTokenUsageWithComprehensiveDetails(
  userId: string,
  tokenUsage: TokenUsage,
  analysisDetails: AnalysisDetails
): Promise<number> {
  const ref = doc(db, COLLECTION, userId);

  // Create new analysis record
  const newAnalysis: AnalysisRecord = {
    id: generateAnalysisId(),
    timestamp: new Date().toISOString(),
    url: analysisDetails.url,
    analysisType: analysisDetails.analysisType,
    status: analysisDetails.status,
    tokensUsed: tokenUsage.totalTokens,
    promptTokens: tokenUsage.promptTokens,
    candidatesTokens: tokenUsage.candidatesTokens,
    thoughtsTokens: tokenUsage.thoughtsTokens,
    cachedTokens: tokenUsage.cachedTokens,
    toolUseTokens: tokenUsage.toolUseTokens,
    error: analysisDetails.error || null,
    model: analysisDetails.model || 'unknown',
    step: analysisDetails.step || 'unknown'
  };

  return runTransaction(db, async transaction => {
    const currentSnapshot = await transaction.get(ref);
    const currentDate = getCurrentDate();
    const currentMonth = getCurrentMonth();

    if (!currentSnapshot.exists()) {
      transaction.set(ref, {
        totalTokens: tokenUsage.totalTokens,
        tokenLimit: DEFAULT_TOKEN_LIMIT,
        analyses: [newAnalysis],
        dailyUsage: { [currentDate]: tokenUsage.totalTokens },
        monthlyUsage: { [currentMonth]: tokenUsage.totalTokens },
        lastUpdated: serverTimestamp()
      });
      return tokenUsage.totalTokens;
    }

    const currentData = currentSnapshot.data();
    const currentTotal = Number(currentData.totalTokens) || 0;
    const tokenLimit = Number(currentData.tokenLimit) || DEFAULT_TOKEN_LIMIT;
    const nextTotal = currentTotal + tokenUsage.totalTokens;

    if (nextTotal > tokenLimit) {
      throw new Error('Token limit reached. Please pay');
    }

    const analyses = Array.isArray(currentData.analyses)
      ? [...currentData.analyses, newAnalysis]
      : [newAnalysis];

    transaction.update(ref, {
      totalTokens: nextTotal,
      analyses,
      [`dailyUsage.${currentDate}`]: (Number(currentData.dailyUsage?.[currentDate]) || 0) + tokenUsage.totalTokens,
      [`monthlyUsage.${currentMonth}`]: (Number(currentData.monthlyUsage?.[currentMonth]) || 0) + tokenUsage.totalTokens,
      lastUpdated: serverTimestamp()
    });

    return nextTotal;
  });
}

/**
 * Get user token usage data
 */
export async function getUserTokenData(userId: string): Promise<UserTokenData | null> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as UserTokenData;
}

/**
 * Update user token limit
 */
export async function updateUserTokenLimit(userId: string, newLimit: number): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  await updateDoc(ref, {
    tokenLimit: newLimit,
    lastUpdated: serverTimestamp()
  });
}

/**
 * Get token usage statistics
 */
export async function getTokenUsageStats(userId: string): Promise<{
  totalTokens: number;
  tokenLimit: number;
  remainingTokens: number;
  dailyUsage: number;
  monthlyUsage: number;
  analysisCount: number;
  lastAnalysisDate?: string;
}> {
  const userData = await getUserTokenData(userId);
  
  if (!userData) {
    return {
      totalTokens: 0,
      tokenLimit: DEFAULT_TOKEN_LIMIT,
      remainingTokens: DEFAULT_TOKEN_LIMIT,
      dailyUsage: 0,
      monthlyUsage: 0,
      analysisCount: 0
    };
  }

  const currentDate = getCurrentDate();
  const currentMonth = getCurrentMonth();
  const lastAnalysis = userData.analyses
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return {
    totalTokens: userData.totalTokens,
    tokenLimit: userData.tokenLimit,
    remainingTokens: userData.tokenLimit - userData.totalTokens,
    dailyUsage: userData.dailyUsage?.[currentDate] || 0,
    monthlyUsage: userData.monthlyUsage?.[currentMonth] || 0,
    analysisCount: userData.analyses.length,
    lastAnalysisDate: lastAnalysis?.timestamp
  };
}

/**
 * Reset user token usage (admin function)
 */
export async function resetUserTokenUsage(userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  await updateDoc(ref, {
    totalTokens: 0,
    dailyUsage: {},
    monthlyUsage: {},
    lastUpdated: serverTimestamp()
  });
}
