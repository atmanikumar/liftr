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
    
    // Fetch users to merge profile photos into all games
    const users = await getUsers();
    
    // Merge profile photos into game players and add runner-up info for Rummy
    games = games.map(game => {
      // Merge profile photos into all players
      const playersWithPhotos = game.players ? game.players.map(player => {
        const user = users.find(u => u.id === player.id);
        return {
          ...player,
          profilePhoto: user?.profilePhoto || null
        };
      }) : [];
      
      // Add runner-up information for completed Rummy games
      if (game.type.toLowerCase() === 'rummy' && game.status === 'completed' && 
          game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        const runners = [];
        
        playersWithPhotos.forEach(gamePlayer => {
          if (gamePlayer.isLost && lastRound.scores && lastRound.scores[gamePlayer.id] !== 0) {
            runners.push(gamePlayer);
          }
        });
        
        return { ...game, players: playersWithPhotos, runners };
      }
      
      return { ...game, players: playersWithPhotos };
    });
    
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
    
    // For new games, verify the createdBy matches the current user
    if (game.createdBy && game.createdBy !== user.id) {
      return NextResponse.json({ success: false, error: 'Cannot create game on behalf of another user' }, { status: 403 });
    }
    
    const result = await updateGameInDB(game); // Uses INSERT OR REPLACE under the hood
    
    if (!result) {
      return NextResponse.json({ success: false, error: 'Create failed' }, { status: 500 });
    }
    
    // Broadcast the update to all connected SSE clients (non-blocking)
    (async () => {
      try {
        const completeGame = await getGameById(game.id);
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
      } catch (error) {
        console.error('[API /games POST] Broadcast failed:', error.message);
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


