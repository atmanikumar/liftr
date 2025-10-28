import { NextResponse } from 'next/server';
import { getGameById, getUsers } from '@/lib/storage';

// GET single game by ID
export async function GET(request, { params }) {
  try {
    const gameId = params.id;
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }
    
    const game = await getGameById(gameId);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    // Fetch all users to get profile photos
    const users = await getUsers();
    
    // Merge profile photos into game players
    if (game.players && users) {
      game.players = game.players.map(player => {
        const user = users.find(u => u.id === player.id);
        return {
          ...player,
          profilePhoto: user?.profilePhoto || null
        };
      });
    }
    
    // Return with no-cache headers to prevent PWA caching
    return NextResponse.json(game, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

