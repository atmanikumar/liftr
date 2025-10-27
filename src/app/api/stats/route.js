import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET top player stats with pre-calculated win percentages
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const users = await getUsers();
    
    // Filter games by type and completed status
    const filteredGames = games.filter(game => 
      game.type.toLowerCase() === gameType.toLowerCase() && 
      game.status === 'completed'
    );
    
    // Calculate stats for each player in filtered games
    const playerStatsMap = {};
    
    filteredGames.forEach(game => {
      game.players.forEach(gamePlayer => {
        if (!playerStatsMap[gamePlayer.id]) {
          const user = users.find(u => u.id === gamePlayer.id);
          playerStatsMap[gamePlayer.id] = {
            id: gamePlayer.id,
            name: gamePlayer.name,
            avatar: gamePlayer.avatar,
            profilePhoto: user?.profilePhoto || null,
            wins: 0,
            draws: 0,
            totalGames: 0,
            finals: 0,
            winPercentage: 0
          };
        }
        
        playerStatsMap[gamePlayer.id].totalGames += 1;
        
        // Check for multiple winners (Ace games) or single winner
        const isWinner = game.winners && game.winners.length > 0
          ? game.winners.includes(gamePlayer.id)
          : game.winner === gamePlayer.id;
        
        if (isWinner) {
          playerStatsMap[gamePlayer.id].wins += 1;
        }
        
        // For Chess: count draws (games with no winner)
        if (game.type.toLowerCase() === 'chess' && !game.winner) {
          playerStatsMap[gamePlayer.id].draws += 1;
        }
        
        // For Rummy: count finals (all players who participated in the last round, including winner)
        if (game.type.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
          // Get the last round
          const lastRound = game.rounds[game.rounds.length - 1];
          
          // Check if this player scored in the last round (including winner)
          if (lastRound.scores && (lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost)) {
            // This player participated in the final
            playerStatsMap[gamePlayer.id].finals += 1;
          }
        }
      });
    });

    // Calculate win percentages and sort
    const statsArray = Object.values(playerStatsMap).map(player => {
      let totalPoints = 0;
      
      if (gameType.toLowerCase() === 'chess') {
        // Chess: Win = 1 point, Draw = 0.5 point, Loss = 0 point
        totalPoints = (player.wins * 1) + (player.draws * 0.5);
      } else if (gameType.toLowerCase() === 'rummy') {
        // Rummy: Win = 1 point, Final (without win) = 0.25 point
        const finalsWithoutWins = player.finals - player.wins;
        totalPoints = (player.wins * 1) + (finalsWithoutWins * 0.25);
      } else {
        // Ace: Simple win rate (wins only)
        totalPoints = player.wins * 1;
      }
      
      return {
        ...player,
        winPercentage: player.totalGames > 0 
          ? Math.round((totalPoints / player.totalGames) * 100)
          : 0
      };
    });
    
    // Sort by win percentage, then by wins, then by total games
    const topPlayers = statsArray
      .sort((a, b) => {
        if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalGames - a.totalGames;
      })
      .slice(0, 5); // Top 5 only
    
    return NextResponse.json({
      gameType,
      topPlayers
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
