import { NextResponse } from 'next/server';
import { getGames, saveGames, updateGameInDB, getUsers, getGameById } from '@/lib/storage';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { broadcastToClients, initializeSSE, getConnectedClientsCount } from '@/lib/sseBroadcaster';

// Initialize SSE on module load
initializeSSE();

// GET games with optional filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const limit = searchParams.get('limit');
    const recent = searchParams.get('recent') === 'true';
    
    let games = await getGames();
    
    // Filter by game type if specified
    if (gameType && gameType !== 'All') {
      games = games.filter(game => 
        game.type.toLowerCase() === gameType.toLowerCase()
      );
    }
    
    // Sort by creation date (most recent first) if recent flag is set
    if (recent) {
      games = games.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    
    // Limit results if specified
    if (limit) {
      games = games.slice(0, parseInt(limit));
    }
    
    // Add runner-up information for Rummy games
    if (gameType === 'Rummy' || (!gameType)) {
      const users = await getUsers();
      games = games.map(game => {
        if (game.type.toLowerCase() === 'rummy' && game.status === 'completed' && 
            game.rounds && game.rounds.length > 0 && game.winner) {
          const lastRound = game.rounds[game.rounds.length - 1];
          const runners = [];
          
          game.players.forEach(gamePlayer => {
            if (gamePlayer.isLost && lastRound.scores && lastRound.scores[gamePlayer.id] !== 0) {
              const user = users.find(u => u.id === gamePlayer.id);
              runners.push({
                ...gamePlayer,
                profilePhoto: user?.profilePhoto || null
              });
            }
          });
          
          return { ...game, runners };
        }
        return game;
      });
    }
    
    return NextResponse.json(games, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Create a new game (INSERT)
export async function POST(request) {
  try {
    const game = await request.json();
    
    console.log('[API /games POST] Received game:', {
      id: game.id,
      type: game.type,
      createdBy: game.createdBy,
      status: game.status
    });
    
    if (!game.id || !game.type) {
      console.error('[API /games POST] Missing game ID or type');
      return NextResponse.json({ success: false, error: 'Game ID and type required' }, { status: 400 });
    }
    
    // Verify user is authenticated and is the game creator
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token'); // Changed from 'token' to 'auth-token'
    console.log('[API /games POST] Auth token:', token ? 'Found' : 'Not found');
    
    if (!token) {
      console.error('[API /games POST] No auth-token found in cookies');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token.value);
    if (!user) {
      console.error('[API /games POST] Invalid token');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('[API /games POST] User verified:', { userId: user.id, gameCreatedBy: game.createdBy });
    
    // For new games, verify the createdBy matches the current user
    if (game.createdBy && game.createdBy !== user.id) {
      console.error('[API /games POST] CreatedBy mismatch:', { userId: user.id, gameCreatedBy: game.createdBy });
      return NextResponse.json({ success: false, error: 'Cannot create game on behalf of another user' }, { status: 403 });
    }
    
    const result = await updateGameInDB(game); // Uses INSERT OR REPLACE under the hood
    
    if (!result) {
      console.error('[API /games POST] Database insert failed');
      return NextResponse.json({ success: false, error: 'Create failed' }, { status: 500 });
    }
    
    // Broadcast the update to all connected SSE clients (non-blocking)
    (async () => {
      try {
        console.log('[API /games POST] 📡 Starting broadcast for game:', game.id);
        const completeGame = await getGameById(game.id);
        console.log('[API /games POST] 📦 Complete game data retrieved:', {
          id: completeGame.id,
          type: completeGame.type,
          status: completeGame.status,
          players: completeGame.players?.length || 0
        });
        
        await broadcastToClients({
          type: 'game_created',
          payload: {
            gameId: game.id,
            gameType: game.type,
            status: game.status,
            timestamp: new Date().toISOString(),
            game: completeGame
          }
        });
        console.log('[API /games POST] ✅ Broadcast completed successfully');
      } catch (error) {
        console.error('[API /games POST] ❌ Broadcast failed:', error.message);
      }
    })();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /games POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a specific game (alias for PATCH)
export async function PUT(request) {
  return PATCH(request);
}

// PATCH - Update a specific game
export async function PATCH(request) {
  try {
    const game = await request.json();
    
    if (!game.id || !game.type) {
      return NextResponse.json({ success: false, error: 'Game ID and type required' }, { status: 400 });
    }
    
    // Verify user is authenticated
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token'); // Changed from 'token' to 'auth-token'
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token.value);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    
    // Get existing game to verify creator
    const existingGame = await getGameById(game.id);
    if (!existingGame) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }
    
    // Only the game creator can update the game (even admins cannot)
    if (existingGame.createdBy !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the game creator can edit this game' }, { status: 403 });
    }
    
    const result = await updateGameInDB(game);
    
    if (!result) {
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }
    
    // Broadcast the update to all connected SSE clients (non-blocking)
    (async () => {
      try {
        const completeGame = await getGameById(game.id);
        await broadcastToClients({
          type: 'game_updated',
          payload: {
            gameId: game.id,
            gameType: game.type,
            status: game.status,
            timestamp: new Date().toISOString(),
            game: completeGame
          }
        });
      } catch (error) {
        console.error('[API /games PATCH] Broadcast failed:', error.message);
      }
    })();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


