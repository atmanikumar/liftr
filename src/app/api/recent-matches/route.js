import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET recent matches with only display-needed data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 'completed' or 'in_progress'
    
    const games = await getGames();
    const users = await getUsers();
    
    // Filter by game type (if specified)
    let filteredGames = games;
    if (gameType) {
      filteredGames = filteredGames.filter(game => 
        game.type.toLowerCase() === gameType.toLowerCase()
      );
    }
    
    // Filter by status (if specified)
    if (status === 'completed') {
      filteredGames = filteredGames.filter(game => game.status === 'completed');
    } else if (status === 'in_progress') {
      filteredGames = filteredGames.filter(game => game.status !== 'completed');
    }
    
    // Sort by creation date (most recent first)
    const sortedGames = filteredGames.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Limit results
    const recentGames = sortedGames.slice(0, limit);
    
    // Return only what the table needs - minimal data
    const minimalMatches = recentGames.map(game => {
      // Add profile photos to players (only what's needed for display)
      const playersForDisplay = game.players.map(player => {
        const user = users.find(u => u.id === player.id);
        return {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          profilePhoto: user?.profilePhoto || null,
          isLost: player.isLost
        };
      });
      
      let runners = [];
      
      // Calculate runners for Rummy games
      if (game.type.toLowerCase() === 'rummy' && game.status === 'completed' && 
          game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        
        playersForDisplay.forEach(player => {
          if (player.isLost && lastRound.scores && lastRound.scores[player.id] !== 0) {
            runners.push({
              id: player.id,
              name: player.name,
              profilePhoto: player.profilePhoto
            });
          }
        });
      }
      
      // Return only fields needed for table display
      return {
        id: game.id,
        title: game.title,
        createdAt: game.createdAt,
        winner: game.winner,
        status: game.status,
        type: game.type,
        players: playersForDisplay,
        runners,
        roundsCount: game.rounds ? game.rounds.length : 0
      };
    });
    
    return NextResponse.json({
      gameType,
      matches: minimalMatches
    });
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent matches' },
      { status: 500 }
    );
  }
}

