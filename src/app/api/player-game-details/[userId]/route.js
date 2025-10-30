import { NextResponse } from 'next/server';
import { getGames, getUserById } from '@/lib/storage';

// GET detailed game history for a specific player
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const player = await getUserById(userId);
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    // Filter games by type and where player participated
    const playerGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.players.some(p => p.id === userId) &&
      g.status === 'completed'
    );
    
    // Sort by date (newest first)
    const sortedGames = playerGames.sort((a, b) => 
      new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
    );
    
    // Calculate detailed stats for each game
    const gameDetails = sortedGames.map(game => {
      const playerInGame = game.players.find(p => p.id === userId);
      const isWinner = game.winner === userId || (game.winners && game.winners.includes(userId));
      const totalPlayers = game.players.length;
      
      // Calculate player's rank in this game
      const sortedPlayers = [...game.players].sort((a, b) => a.totalPoints - b.totalPoints);
      const rank = sortedPlayers.findIndex(p => p.id === userId) + 1;
      
      // Count rounds played (not dropped)
      let roundsPlayed = 0;
      let roundsWon = 0;
      let drops = 0;
      let totalPointsScored = 0;
      
      if (game.rounds) {
        game.rounds.forEach(round => {
          if (round.scores && round.scores[userId] !== undefined) {
            const isDropped = (round.drops && round.drops[userId]) || (round.doubleDrops && round.doubleDrops[userId]);
            if (!isDropped) {
              roundsPlayed++;
            }
            if (isDropped) {
              drops++;
            }
            if (round.winners && round.winners[userId]) {
              roundsWon++;
            }
            totalPointsScored += round.scores[userId] || 0;
          }
        });
      }
      
      // Check if reached finals (for Rummy)
      let reachedFinals = false;
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        if (lastRound.scores && (lastRound.scores[userId] !== 0 || !playerInGame?.isLost)) {
          reachedFinals = true;
        }
      }
      
      return {
        gameId: game.id,
        gameTitle: game.title,
        date: game.completedAt || game.createdAt,
        isWinner,
        rank,
        totalPlayers,
        totalPoints: playerInGame?.totalPoints || 0,
        totalRounds: game.rounds ? game.rounds.length : 0,
        roundsPlayed,
        roundsWon,
        drops,
        totalPointsScored,
        reachedFinals,
        avgPointsPerRound: roundsPlayed > 0 ? Math.round(totalPointsScored / roundsPlayed) : 0
      };
    });
    
    // Calculate aggregate stats
    const totalGames = gameDetails.length;
    const wins = gameDetails.filter(g => g.isWinner).length;
    const finals = gameDetails.filter(g => g.reachedFinals).length;
    const totalRoundsPlayed = gameDetails.reduce((sum, g) => sum + g.roundsPlayed, 0);
    const totalRoundsWon = gameDetails.reduce((sum, g) => sum + g.roundsWon, 0);
    const totalDrops = gameDetails.reduce((sum, g) => sum + g.drops, 0);
    const totalPointsScored = gameDetails.reduce((sum, g) => sum + g.totalPointsScored, 0);
    
    // Get recent form (last 10 games)
    const recentGames = gameDetails.slice(0, 10);
    const recentWins = recentGames.filter(g => g.isWinner).length;
    
    // Get best and worst games
    const bestGame = gameDetails.length > 0 ? 
      [...gameDetails].sort((a, b) => a.totalPoints - b.totalPoints)[0] : null;
    const worstGame = gameDetails.length > 0 ? 
      [...gameDetails].sort((a, b) => b.totalPoints - a.totalPoints)[0] : null;
    
    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        profilePhoto: player.profilePhoto
      },
      gameType,
      summary: {
        totalGames,
        wins,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
        finals,
        finalsRate: totalGames > 0 ? Math.round((finals / totalGames) * 100) : 0,
        totalRoundsPlayed,
        totalRoundsWon,
        roundWinRate: totalRoundsPlayed > 0 ? Math.round((totalRoundsWon / totalRoundsPlayed) * 100) : 0,
        totalDrops,
        dropRate: (totalRoundsPlayed + totalDrops) > 0 ? Math.round((totalDrops / (totalRoundsPlayed + totalDrops)) * 100) : 0,
        avgPointsPerRound: totalRoundsPlayed > 0 ? Math.round(totalPointsScored / totalRoundsPlayed) : 0,
        recentForm: {
          last10Games: recentGames.length,
          wins: recentWins,
          winRate: recentGames.length > 0 ? Math.round((recentWins / recentGames.length) * 100) : 0
        }
      },
      games: gameDetails,
      bestGame,
      worstGame
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching player game details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player game details' },
      { status: 500 }
    );
  }
}

