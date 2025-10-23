import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore';

// Collection name for token usage data
const COLLECTION = 'tokenUsage';
const DEFAULT_TOKEN_LIMIT = 1_000_000;

// Token usage interface
export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  thoughtsTokens?: number;
  cachedTokens?: number;
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
  thoughtsTokens?: number;
  cachedTokens?: number;
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
 * Main comprehensive token tracking system
 * Note: This function assumes totalTokens has already been updated by referralService.useCredits()
 */
export async function incrementTokenUsageWithComprehensiveDetails(
  userId: string,
  tokenUsage: TokenUsage,
  analysisDetails: AnalysisDetails
): Promise<number> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);

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
    thoughtsTokens: tokenUsage.thoughtsTokens || 0,
    cachedTokens: tokenUsage.cachedTokens || 0,
    error: analysisDetails.error || null,
    model: analysisDetails.model || 'unknown',
    step: analysisDetails.step || 'unknown'
  };

  if (!snap.exists()) {
    // This shouldn't happen if referralService.useCredits() was called first
    console.warn('Document does not exist, creating with comprehensive tracking');
    const newUserData = {
      totalTokens: tokenUsage.totalTokens,
      tokenLimit: DEFAULT_TOKEN_LIMIT,
      analyses: [newAnalysis],
      dailyUsage: {
        [getCurrentDate()]: tokenUsage.totalTokens
      },
      monthlyUsage: {
        [getCurrentMonth()]: tokenUsage.totalTokens
      },
      lastUpdated: serverTimestamp()
    };

    await setDoc(ref, newUserData);
    return tokenUsage.totalTokens;
  }

  // Update existing user - only add analysis details, don't modify totalTokens
  const data = snap.data();
  
  // Calculate current daily and monthly usage
  const currentDate = getCurrentDate();
  const currentMonth = getCurrentMonth();
  const currentDaily = (data.dailyUsage?.[currentDate] || 0) + tokenUsage.totalTokens;
  const currentMonthly = (data.monthlyUsage?.[currentMonth] || 0) + tokenUsage.totalTokens;

  // Prepare updates - only add analysis tracking, don't modify totalTokens
  const updates: any = {
    lastUpdated: serverTimestamp(),
    [`dailyUsage.${getCurrentDate()}`]: currentDaily,
    [`monthlyUsage.${getCurrentMonth()}`]: currentMonthly
  };

  // Only add analyses array if it doesn't exist or if we want to track detailed analysis
  if (data.analyses && Array.isArray(data.analyses)) {
    // Document has analyses array, add to it
    updates.analyses = arrayUnion(newAnalysis);
  } else {
    // Document doesn't have analyses array, create it
    updates.analyses = [newAnalysis];
  }

  await updateDoc(ref, updates);
  return data.totalTokens || 0;
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
