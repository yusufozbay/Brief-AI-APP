import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "brief-ai-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "brief-ai-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "brief-ai-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export interface SharedBrief {
  id?: string;
  topic: string;
  userIntent: string;
  competitorTone: string;
  uniqueValue: string;
  competitorAnalysisSummary: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleSuggestions: {
    clickFocused: string;
    seoFocused: string;
  };
  metaDescription: string;
  contentOutline: Array<{
    level: 'H1' | 'H2' | 'H3';
    title: string;
    content: string;
    keyInfo?: string;
    storytelling?: string;
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

      // Create a clean brief object without circular references
      const briefToShare = {
        topic: briefData.topic,
        userIntent: briefData.userIntent,
        competitorTone: briefData.competitorTone,
        uniqueValue: briefData.uniqueValue,
        competitorAnalysisSummary: briefData.competitorAnalysisSummary,
        primaryKeyword: briefData.primaryKeyword,
        secondaryKeywords: Array.isArray(briefData.secondaryKeywords) ? briefData.secondaryKeywords : [],
        titleSuggestions: briefData.titleSuggestions || { clickFocused: '', seoFocused: '' },
        metaDescription: briefData.metaDescription,
        contentOutline: Array.isArray(briefData.contentOutline) ? briefData.contentOutline : [],
        faqSection: Array.isArray(briefData.faqSection) ? briefData.faqSection : [],
        schemaStrategy: briefData.schemaStrategy || { mainSchema: '', supportingSchemas: [], reasoning: '' },
        competitorAnalysis: briefData.competitorAnalysis ? JSON.parse(JSON.stringify(briefData.competitorAnalysis)) : null,
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
