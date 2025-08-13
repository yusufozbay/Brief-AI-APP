import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { saveSharedAnalysis, getSharedAnalysis } from '../../../../lib/firebase-service';

// Fallback in-memory storage for when Firebase is unavailable
interface FallbackAnalysisData {
  id: string;
  query: string;
  subtitles: string;
  competitors: string[];
  brief: string;
}

const fallbackStorage = new Map<string, FallbackAnalysisData>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, subtitles, competitors, brief } = body;

    if (!query || !brief) {
      return NextResponse.json(
        { error: 'Query and brief are required' },
        { status: 400 }
      );
    }

    // Generate unique share ID
    const shareId = nanoid(10);

    // Store the analysis data in Firebase
    const analysisData = {
      id: shareId,
      query,
      subtitles: subtitles || '',
      competitors: competitors || [],
      brief,
    };

    try {
      await saveSharedAnalysis(analysisData);
      console.log('✅ Analysis shared with ID:', shareId);
    } catch (firebaseError) {
      console.error('❌ Firebase error:', firebaseError);
      // Fallback to in-memory storage
      fallbackStorage.set(shareId, analysisData);
      console.log('⚠️ Using fallback storage for ID:', shareId);
    }

    return NextResponse.json({
      shareId,
      shareUrl: `/share/${shareId}`,
    });
  } catch (error) {
    console.error('❌ Error sharing analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');

  if (!shareId) {
    return NextResponse.json(
      { error: 'Share ID is required' },
      { status: 400 }
    );
  }

  try {
    let analysisData = null;
    
    // Try Firebase first
    try {
      analysisData = await getSharedAnalysis(shareId);
    } catch (firebaseError) {
      console.error('❌ Firebase retrieval error:', firebaseError);
      // Try fallback storage
      analysisData = fallbackStorage.get(shareId) || null;
      if (analysisData) {
        console.log('✅ Retrieved from fallback storage:', shareId);
      }
    }

    if (!analysisData) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('❌ Error retrieving shared analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
