import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET momentum player (hero of last 10 games)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const users = await getUsers();
    
    // Filter completed games by type
    const completedGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.status === 'completed'
    );
    
    if (completedGames.length === 0) {
      return NextResponse.json({
        gameType,
        momentumPlayer: null,
        message: 'No completed games found'
      });
    }
    
    // Sort by completion date (newest first) and take last 10
    const last10Games = completedGames
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, 10);
    
    // Calculate performance for each player in last 10 games
    const playerPerformance = {};
    
    last10Games.forEach(game => {
      game.players.forEach(player => {
        if (!playerPerformance[player.id]) {
          const user = users.find(u => u.id === player.id);
          playerPerformance[player.id] = {
            id: player.id,
            name: player.name,
            profilePhoto: user?.profilePhoto || null,
            gamesPlayed: 0,
            wins: 0,
            finals: 0,
            totalPoints: 0,
            roundsWon: 0,
            gameIds: []
          };
        }
        
        playerPerformance[player.id].gamesPlayed++;
        playerPerformance[player.id].gameIds.push(game.id);
        
        // Check if winner
        const isWinner = game.winner === player.id || (game.winners && game.winners.includes(player.id));
        if (isWinner) {
          playerPerformance[player.id].wins++;
        }
        
        // Check if reached finals (Rummy only)
        if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
          const lastRound = game.rounds[game.rounds.length - 1];
          if (lastRound.scores && (lastRound.scores[player.id] !== 0 || !player.isLost)) {
            playerPerformance[player.id].finals++;
          }
        }
        
        // Add total points
        playerPerformance[player.id].totalPoints += player.totalPoints || 0;
        
        // Count round wins
        if (game.rounds) {
          game.rounds.forEach(round => {
            if (round.winners && round.winners[player.id]) {
              playerPerformance[player.id].roundsWon++;
            }
          });
        }
      });
    });
    
    // Calculate momentum score for each player
    // Momentum Score = (Wins × 10 + Finals × 5 + RoundWins × 1) / GamesPlayed
    const players = Object.values(playerPerformance).map(p => ({
      ...p,
      winRate: p.gamesPlayed > 0 ? (p.wins / p.gamesPlayed) * 100 : 0,
      finalsRate: p.gamesPlayed > 0 ? (p.finals / p.gamesPlayed) * 100 : 0,
      momentumScore: p.gamesPlayed > 0 ? 
        ((p.wins * 10) + (p.finals * 5) + (p.roundsWon * 1)) / p.gamesPlayed : 0
    }));
    
    // Filter players who played at least 3 of last 10 games
    const activePlayers = players.filter(p => p.gamesPlayed >= Math.min(3, last10Games.length));
    
    if (activePlayers.length === 0) {
      return NextResponse.json({
        gameType,
        momentumPlayer: null,
        message: 'Not enough active players'
      });
    }
    
    // Sort by momentum score
    const sortedPlayers = activePlayers.sort((a, b) => b.momentumScore - a.momentumScore);
    const momentumPlayer = sortedPlayers[0];
    
    return NextResponse.json({
      gameType,
      momentumPlayer: {
        ...momentumPlayer,
        winRate: Math.round(momentumPlayer.winRate),
        finalsRate: Math.round(momentumPlayer.finalsRate),
        momentumScore: Math.round(momentumPlayer.momentumScore * 10) / 10 // Round to 1 decimal
      },
      last10GamesCount: last10Games.length,
      totalActivePlayers: activePlayers.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching momentum player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch momentum player' },
      { status: 500 }
    );
  }
}

