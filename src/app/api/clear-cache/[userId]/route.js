import { NextResponse } from 'next/server';

/**
 * Clear profile insights cache for a specific user
 * 
 * Usage:
 *   DELETE /api/clear-cache/admin-1                    (clears all game types)
 *   DELETE /api/clear-cache/admin-1?gameType=Rummy     (clears only Rummy)
 * 
 * This endpoint sets expired cookies to clear the browser cache
 */
export async function DELETE(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Determine which caches to clear
    const gameTypes = gameType ? [gameType] : ['Rummy', 'Chess', 'Ace'];
    const clearedCookies = gameTypes.map(type => `insights_${userId}_${type}`);
    
    // Create response with expired cookies to clear them
    const response = NextResponse.json({
      success: true,
      message: `Cache cleared for user: ${userId}`,
      clearedCookies,
      gameTypes,
      note: 'Cookies have been expired and will be removed by your browser'
    });
    
    // Set expired cookies to clear them
    gameTypes.forEach(type => {
      const cookieName = `insights_${userId}_${type}`;
      response.cookies.set(cookieName, '', {
        expires: new Date(0), // Expire immediately
        path: '/',
        sameSite: 'strict'
      });
    });
    
    console.log(`[Cache Clear] Cleared ${clearedCookies.length} cache(s) for user ${userId}`);
    
    return response;
    
  } catch (error) {
    console.error('[Cache Clear] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check cache status
 */
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const gameTypes = gameType ? [gameType] : ['Rummy', 'Chess', 'Ace'];
    const cacheKeys = gameTypes.map(type => ({
      gameType: type,
      cookieName: `insights_${userId}_${type}`,
      status: 'unknown (check browser cookies)'
    }));
    
    return NextResponse.json({
      userId,
      cacheKeys,
      howToClear: `DELETE /api/clear-cache/${userId}${gameType ? `?gameType=${gameType}` : ''}`
    });
    
  } catch (error) {
    console.error('[Cache Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check cache' },
      { status: 500 }
    );
  }
}

