import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface SharedAnalysisData {
  id: string;
  query: string;
  subtitles: string;
  competitors: string[];
  brief: string;
  createdAt: Timestamp | string;
}

const COLLECTION_NAME = 'shared-analyses';

export async function saveSharedAnalysis(data: Omit<SharedAnalysisData, 'createdAt'>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, data.id);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    console.log('✅ Analysis saved to Firebase with ID:', data.id);
  } catch (error) {
    console.error('❌ Error saving analysis to Firebase:', error);
    throw error;
  }
}

export async function getSharedAnalysis(shareId: string): Promise<SharedAnalysisData | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, shareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as SharedAnalysisData;
      console.log('✅ Analysis retrieved from Firebase:', shareId);
      return {
        ...data,
        createdAt: typeof data.createdAt === 'string' 
          ? data.createdAt 
          : data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    } else {
      console.log('❌ Analysis not found in Firebase:', shareId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving analysis from Firebase:', error);
    throw error;
  }
}
