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
      const briefToShare: Omit<SharedBrief, 'id'> = {
        ...briefData,
        createdAt: new Date(),
        sharedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'shared-briefs'), briefToShare);
      return docRef.id;
    } catch (error) {
      console.error('Error sharing brief:', error);
      throw new Error('Failed to share brief');
    }
  }

  async getBrief(briefId: string): Promise<SharedBrief | null> {
    try {
      const docRef = doc(db, 'shared-briefs', briefId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SharedBrief;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting brief:', error);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();
