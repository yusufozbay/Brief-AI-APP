import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  query,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface ReferralCode {
  id: string;
  code: string;
  clientName: string;
  clientEmail: string;
  creditLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

export interface GeneratedBrief {
  id: string;
  referralCode: string;
  topic: string;
  primaryKeyword: string;
  briefData: any;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface BriefUsage {
  id: string;
  referralCode: string;
  briefId: string;
  topic: string;
  creditsUsed: number;
  createdAt: Date;
  ipAddress?: string;
}

class ReferralService {
  
  /**
   * Generate a unique referral code
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new referral code for a client
   */
  async createReferralCode(
    clientName: string, 
    clientEmail: string, 
    creditLimit: number = 10
  ): Promise<ReferralCode> {
    try {
      let code: string;
      let isUnique = false;
      
      // Generate unique code
      while (!isUnique) {
        code = this.generateReferralCode();
        const existingDoc = await getDoc(doc(db, 'referral-codes', code));
        isUnique = !existingDoc.exists();
      }

      const referralCode: ReferralCode = {
        id: code!,
        code: code!,
        clientName,
        clientEmail,
        creditLimit,
        creditsUsed: 0,
        creditsRemaining: creditLimit,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'referral-codes', code!), {
        ...referralCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Referral code created:', code);
      return referralCode;
    } catch (error) {
      console.error('❌ Error creating referral code:', error);
      throw new Error('Referral code creation failed');
    }
  }

  /**
   * Validate and get referral code information
   */
  async validateReferralCode(code: string): Promise<ReferralCode | null> {
    try {
      // Try both collections: tokenUsage (existing) and referral-codes (new)
      let docRef = doc(db, 'tokenUsage', code);
      let docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Try referral-codes collection as fallback
        docRef = doc(db, 'referral-codes', code);
        docSnap = await getDoc(docRef);
      }
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      
      // Handle both data structures
      if (data.tokenLimit !== undefined) {
        // Existing tokenUsage structure
        return {
          id: docSnap.id,
          code: docSnap.id,
          clientName: 'Client',
          clientEmail: 'client@example.com',
          creditLimit: data.tokenLimit || 1000000,
          creditsUsed: data.totalTokens || 0,
          creditsRemaining: (data.tokenLimit || 1000000) - (data.totalTokens || 0),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as ReferralCode;
      } else {
        // New referral-codes structure
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastUsedAt: data.lastUsedAt?.toDate()
        } as ReferralCode;
      }
    } catch (error) {
      console.error('❌ Error validating referral code:', error);
      return null;
    }
  }

  /**
   * Check if referral code has remaining credits
   */
  async checkCredits(code: string): Promise<{ hasCredits: boolean; remaining: number }> {
    try {
      const referralCode = await this.validateReferralCode(code);
      
      if (!referralCode || !referralCode.isActive) {
        return { hasCredits: false, remaining: 0 };
      }

      return { 
        hasCredits: referralCode.creditsRemaining > 0, 
        remaining: referralCode.creditsRemaining 
      };
    } catch (error) {
      console.error('❌ Error checking credits:', error);
      return { hasCredits: false, remaining: 0 };
    }
  }

  /**
   * Use credits for a brief generation
   */
  async useCredits(code: string, creditsUsed: number = 1): Promise<boolean> {
    try {
      const referralCode = await this.validateReferralCode(code);
      
      if (!referralCode || !referralCode.isActive || referralCode.creditsRemaining < creditsUsed) {
        return false;
      }

      // Try to update in tokenUsage collection first (existing structure)
      try {
        const tokenDocRef = doc(db, 'tokenUsage', code);
        await updateDoc(tokenDocRef, {
          totalTokens: increment(creditsUsed)
        });
        console.log('✅ Credits used in tokenUsage for referral code:', code);
        return true;
      } catch (tokenError) {
        console.log('TokenUsage update failed, trying referral-codes collection...');
        
        // Fallback to referral-codes collection
        const docRef = doc(db, 'referral-codes', code);
        await updateDoc(docRef, {
          creditsUsed: increment(creditsUsed),
          creditsRemaining: increment(-creditsUsed),
          lastUsedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Credits used in referral-codes for referral code:', code);
        return true;
      }
    } catch (error) {
      console.error('❌ Error using credits:', error);
      return false;
    }
  }

  /**
   * Store generated brief
   */
  async storeGeneratedBrief(
    referralCode: string,
    topic: string,
    primaryKeyword: string,
    briefData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const briefDoc = {
        referralCode,
        topic,
        primaryKeyword,
        briefData,
        createdAt: serverTimestamp(),
        ipAddress,
        userAgent
      };

      const docRef = await addDoc(collection(db, 'generated-briefs'), briefDoc);
      
      // Record usage
      await this.recordBriefUsage(referralCode, docRef.id, topic, 1, ipAddress);
      
      console.log('✅ Brief stored with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error storing brief:', error);
      throw new Error('Failed to store brief');
    }
  }

  /**
   * Record brief usage for analytics
   */
  private async recordBriefUsage(
    referralCode: string,
    briefId: string,
    topic: string,
    creditsUsed: number,
    ipAddress?: string
  ): Promise<void> {
    try {
      const usageDoc = {
        referralCode,
        briefId,
        topic,
        creditsUsed,
        createdAt: serverTimestamp(),
        ipAddress
      };

      await addDoc(collection(db, 'brief-usage'), usageDoc);
    } catch (error) {
      console.error('❌ Error recording brief usage:', error);
    }
  }

  /**
   * Get usage statistics for a referral code
   */
  async getUsageStats(code: string): Promise<{
    totalBriefs: number;
    recentBriefs: GeneratedBrief[];
    usageHistory: BriefUsage[];
  }> {
    try {
      // Get generated briefs
      const briefsQuery = query(
        collection(db, 'generated-briefs'),
        where('referralCode', '==', code)
      );
      const briefsSnapshot = await getDocs(briefsQuery);
      
      const recentBriefs: GeneratedBrief[] = briefsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as GeneratedBrief));

      // Get usage history
      const usageQuery = query(
        collection(db, 'brief-usage'),
        where('referralCode', '==', code)
      );
      const usageSnapshot = await getDocs(usageQuery);
      
      const usageHistory: BriefUsage[] = usageSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as BriefUsage));

      return {
        totalBriefs: recentBriefs.length,
        recentBriefs: recentBriefs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        usageHistory: usageHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      };
    } catch (error) {
      console.error('❌ Error getting usage stats:', error);
      return {
        totalBriefs: 0,
        recentBriefs: [],
        usageHistory: []
      };
    }
  }

  /**
   * Get client IP address (for analytics)
   */
  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not get client IP:', error);
      return 'unknown';
    }
  }
}

export const referralService = new ReferralService();
