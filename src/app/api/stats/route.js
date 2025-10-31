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

    // Calculate detailed stats for WPR calculation
    const statsArray = Object.values(playerStatsMap).map(player => {
      // Calculate basic win percentage first
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
      
      const winPercentage = player.totalGames > 0 
        ? Math.round((totalPoints / player.totalGames) * 100)
        : 0;
      
      // Calculate additional stats needed for WPR
      let dropPercentage = 0;
      let roundWins = 0;
      let totalRounds = 0;
      
      // Process games to calculate drop percentage and round wins
      filteredGames.forEach(game => {
        const gamePlayer = game.players.find(gp => gp.id === player.id);
        if (!gamePlayer || !game.rounds) return;
        
        game.rounds.forEach(round => {
          if (round.scores && round.scores[player.id] !== undefined) {
            totalRounds++;
            
            // Count drops
            if (round.drops && round.drops[player.id]) {
              // Single drop counts as 1
            }
            if (round.doubleDrops && round.doubleDrops[player.id]) {
              // Double drop counts as 1 (already dropped)
            }
            
            // Count round wins (0 points)
            if (round.winners && round.winners[player.id]) {
              roundWins++;
            }
          }
        });
      });
      
      // Calculate drop percentage (inverse for bonus - lower drops = higher bonus)
      const totalDrops = filteredGames.reduce((sum, game) => {
        const gamePlayer = game.players.find(gp => gp.id === player.id);
        if (!gamePlayer || !game.rounds) return sum;
        
        return sum + game.rounds.filter(round => 
          (round.drops && round.drops[player.id]) || 
          (round.doubleDrops && round.doubleDrops[player.id])
        ).length;
      }, 0);
      
      dropPercentage = totalRounds > 0 ? (totalDrops / totalRounds) * 100 : 0;
      const roundWinRate = totalRounds > 0 ? (roundWins / totalRounds) * 100 : 0;
      
      // Calculate Rating based on game type
      let wpr = 0;
      if (player.totalGames > 0) {
        if (gameType.toLowerCase() === 'rummy') {
          // Rummy: Weighted Performance Rating (WPR)
          // WPR = (Wins × 100 + Finals × 25 + (1 - Drop%) × 50 + RoundWins × 2) / TotalGames
          // Cap at 100 to keep it on a 0-100 scale
          const winsScore = player.wins * 100;
          const finalsScore = player.finals * 25;
          const braveBonus = (1 - (dropPercentage / 100)) * 50;
          const roundWinsScore = roundWins * 2;
          
          const rating = (winsScore + finalsScore + braveBonus + roundWinsScore) / player.totalGames;
          wpr = Math.min(100, Math.round(rating));
        } else if (gameType.toLowerCase() === 'chess') {
          // Chess: Win-based with draw bonus
          // Rating = (Wins × 100 + Draws × 50) / TotalGames
          const winsScore = player.wins * 100;
          const drawsScore = player.draws * 50;
          
          wpr = Math.round((winsScore + drawsScore) / player.totalGames);
        } else {
          // Ace: Simple win-based rating
          // Rating = (Wins × 100) / TotalGames
          wpr = Math.round((player.wins * 100) / player.totalGames);
        }
      }
      
      return {
        ...player,
        winPercentage,
        wpr,
        dropPercentage: Math.round(dropPercentage),
        roundWins,
        totalRounds,
        roundWinRate: Math.round(roundWinRate)
      };
    });
    
    // Sort by WPR (Weighted Performance Rating), then by wins, then by total games
    const topPlayers = statsArray
      .sort((a, b) => {
        if (b.wpr !== a.wpr) return b.wpr - a.wpr;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalGames - a.totalGames;
      })
      .slice(0, 10); // Top 10 players
    
    return NextResponse.json({
      gameType,
      topPlayers
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
