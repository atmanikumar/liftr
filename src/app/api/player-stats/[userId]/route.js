import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET player stats for all game types with rank
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    
    const games = await getGames();
    const users = await getUsers();
    
    const player = users.find(u => u.id === userId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    const gameTypes = ['Rummy', 'Chess', 'Ace'];
    const playerStats = {};
    
    // Calculate stats for each game type
    for (const gameType of gameTypes) {
      const completedGames = games.filter(g => 
        g.type.toLowerCase() === gameType.toLowerCase() && 
        g.status === 'completed'
      );
      
      // Calculate stats for ALL players to determine ranks
      const allPlayerStats = {};
      
      completedGames.forEach(game => {
        game.players.forEach(gamePlayer => {
          if (!allPlayerStats[gamePlayer.id]) {
            allPlayerStats[gamePlayer.id] = {
              id: gamePlayer.id,
              wins: 0,
              draws: 0,
              totalGames: 0,
              finals: 0
            };
          }
          
          allPlayerStats[gamePlayer.id].totalGames += 1;
          
          // Check for wins
          const isWinner = game.winners && game.winners.length > 0
            ? game.winners.includes(gamePlayer.id)
            : game.winner === gamePlayer.id;
          
          if (isWinner) {
            allPlayerStats[gamePlayer.id].wins += 1;
          }
          
          // Chess draws
          if (game.type.toLowerCase() === 'chess' && !game.winner) {
            allPlayerStats[gamePlayer.id].draws += 1;
          }
          
          // Rummy finals
          if (game.type.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
            const lastRound = game.rounds[game.rounds.length - 1];
            if (lastRound.scores && (lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost)) {
              allPlayerStats[gamePlayer.id].finals += 1;
            }
          }
        });
      });
      
      // Calculate win percentages for all players
      const rankedPlayers = Object.values(allPlayerStats).map(p => {
        let totalPoints = 0;
        
        if (gameType.toLowerCase() === 'chess') {
          totalPoints = (p.wins * 1) + (p.draws * 0.5);
        } else if (gameType.toLowerCase() === 'rummy') {
          const finalsWithoutWins = p.finals - p.wins;
          totalPoints = (p.wins * 1) + (finalsWithoutWins * 0.25);
        } else {
          totalPoints = p.wins * 1;
        }
        
        return {
          ...p,
          winPercentage: p.totalGames > 0 
            ? Math.round((totalPoints / p.totalGames) * 100)
            : 0
        };
      }).sort((a, b) => {
        if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalGames - a.totalGames;
      });
      
      // Find rank for this player
      const playerRank = rankedPlayers.findIndex(p => p.id === userId) + 1;
      const currentPlayerStats = allPlayerStats[userId];
      
      playerStats[gameType] = {
        totalGames: currentPlayerStats?.totalGames || 0,
        wins: currentPlayerStats?.wins || 0,
        draws: currentPlayerStats?.draws || 0,
        finals: currentPlayerStats?.finals || 0,
        losses: (currentPlayerStats?.totalGames || 0) - (currentPlayerStats?.wins || 0) - (currentPlayerStats?.draws || 0),
        winPercentage: rankedPlayers.find(p => p.id === userId)?.winPercentage || 0,
        rank: playerRank > 0 ? playerRank : null,
        totalPlayers: rankedPlayers.length
      };
    }
    
    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        username: player.username,
        profilePhoto: player.profilePhoto
      },
      stats: playerStats
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}

