import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const env = import.meta.env as Record<string, string | undefined>;

const getEnvValue = (primary: string, fallback: string): string | undefined => {
  return env[primary] || env[fallback];
};

const firebaseConfig = {
  apiKey: getEnvValue('FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'),
  authDomain: getEnvValue('FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID')
};

// Check if Firebase is properly configured
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'demo-api-key') {
  console.error('❌ Firebase not properly configured! Check environment variables.');
  console.error('❌ Current config:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'NOT SET',
    authDomain: firebaseConfig.authDomain ? 'SET' : 'NOT SET',
    projectId: firebaseConfig.projectId ? 'SET' : 'NOT SET',
    storageBucket: firebaseConfig.storageBucket ? 'SET' : 'NOT SET',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'NOT SET',
    appId: firebaseConfig.appId ? 'SET' : 'NOT SET'
  });
} else {
  console.log('✅ Firebase configuration loaded successfully');
  console.log('✅ Project ID:', firebaseConfig.projectId);
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export interface SharedBrief {
  id?: string;
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
  keyTakeaways?: string[];
  contentOutline: Array<{
    level: 'H1' | 'H2' | 'H3';
    title: string;
    content: string;
    keyInfo?: string;
    storytelling?: string;
    imagePrompt?: string;
    icebreakerIdeas?: string[];
  }>;
  faqSection: Array<{
    question: string;
    answer: string;
  }>;
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
  competitorAnalysis?: any;
  createdAt: Date;
  sharedAt: Date;
}

class FirebaseService {
  async shareBrief(briefData: Omit<SharedBrief, 'id' | 'createdAt' | 'sharedAt'>): Promise<string> {
    try {
      console.log('🔥 Starting Firebase share operation...');
      
      // Check if Firebase is properly initialized
      if (!db) {
        console.error('❌ Firebase database not initialized');
        throw new Error('Firebase not configured');
      }

      // Helper function to safely serialize objects and remove circular references
      const sanitizeData = (obj: any, visited = new WeakSet()): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;
        if (obj instanceof Date) return obj;
        
        // Check for circular references
        if (visited.has(obj)) {
          console.warn('Circular reference detected, skipping object');
          return '[Circular Reference]';
        }
        
        visited.add(obj);
        
        try {
          if (Array.isArray(obj)) {
            return obj.map(item => sanitizeData(item, visited));
          }
          
          const sanitized: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              try {
                const value = obj[key];
                if (typeof value === 'function') continue; // Skip functions
                if (typeof value === 'symbol') continue; // Skip symbols
                sanitized[key] = sanitizeData(value, visited);
              } catch (error) {
                console.warn(`Skipping property ${key} due to serialization error:`, error);
              }
            }
          }
          return sanitized;
        } finally {
          visited.delete(obj);
        }
      };

      // Create a clean brief object without circular references
      const briefToShare = {
        topic: briefData.topic || '',
        userIntent: briefData.userIntent || '',
        competitorTone: briefData.competitorTone || '',
        uniqueValue: briefData.uniqueValue || '',
        competitorAnalysisSummary: briefData.competitorAnalysisSummary || '',
        competitorStrengths: Array.isArray(briefData.competitorStrengths) ? briefData.competitorStrengths : [],
        contentGaps: Array.isArray(briefData.contentGaps) ? briefData.contentGaps : [],
        dominantTone: briefData.dominantTone || '',
        primaryKeyword: briefData.primaryKeyword || '',
        secondaryKeywords: Array.isArray(briefData.secondaryKeywords) ? briefData.secondaryKeywords : [],
        titleSuggestions: briefData.titleSuggestions || { clickFocused: '', seoFocused: '' },
        metaDescription: briefData.metaDescription || '',
        keyTakeaways: Array.isArray(briefData.keyTakeaways) ? briefData.keyTakeaways : [],
        contentOutline: Array.isArray(briefData.contentOutline) ? sanitizeData(briefData.contentOutline) : [],
        faqSection: Array.isArray(briefData.faqSection) ? sanitizeData(briefData.faqSection) : [],
        schemaStrategy: briefData.schemaStrategy || { mainSchema: '', supportingSchemas: [], reasoning: '' },
        qualityChecklist: Array.isArray(briefData.qualityChecklist) ? sanitizeData(briefData.qualityChecklist) : [],
        competitorAnalysis: briefData.competitorAnalysis ? sanitizeData(briefData.competitorAnalysis) : null,
        createdAt: new Date(),
        sharedAt: new Date()
      };

      console.log('🔥 Adding document to Firestore...');
      const docRef = await addDoc(collection(db, 'shared-briefs'), briefToShare);
      console.log('✅ Brief shared successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error sharing brief:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw new Error('Paylaşım sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  async getBrief(briefId: string): Promise<SharedBrief | null> {
    try {
      console.log('🔥 Getting shared brief with ID:', briefId);
      
      if (!db) {
        console.error('❌ Firebase database not initialized');
        throw new Error('Firebase not configured');
      }

      if (!briefId || briefId.trim() === '') {
        console.error('❌ Invalid brief ID provided');
        return null;
      }

      const docRef = doc(db, 'shared-briefs', briefId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Brief found and retrieved successfully');
        return {
          id: docSnap.id,
          ...data
        } as SharedBrief;
      } else {
        console.log('ℹ️ Brief not found with ID:', briefId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting brief:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      throw new Error('Brief yüklenirken bir hata oluştu.');
    }
  }
}

export const firebaseService = new FirebaseService();
