import { NextResponse } from 'next/server';
import { getGames, getUserById } from '@/lib/storage';

// Calculate WPR for a player based on their stats up to a certain point
function calculateWPR(stats, gameType) {
  if (stats.totalGames === 0) return 0;
  
  if (gameType.toLowerCase() === 'rummy') {
    // Rummy: WPR = (Wins × 100 + Finals × 25 + Brave Bonus + RoundWins × 2) / TotalGames
    const winsScore = stats.wins * 100;
    const finalsScore = stats.finals * 25;
    const braveBonus = (1 - (stats.dropRate / 100)) * 50;
    const roundWinsScore = stats.roundWins * 2;
    
    return Math.round((winsScore + finalsScore + braveBonus + roundWinsScore) / stats.totalGames);
  } else if (gameType.toLowerCase() === 'chess') {
    // Chess: Rating = (Wins × 100 + Draws × 50) / TotalGames
    const winsScore = stats.wins * 100;
    const drawsScore = stats.draws * 50;
    
    return Math.round((winsScore + drawsScore) / stats.totalGames);
  } else {
    // Ace: Rating = (Wins × 100) / TotalGames
    return Math.round((stats.wins * 100) / stats.totalGames);
  }
}

// GET rating history for a player
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
    
    // Filter completed games by type where player participated
    const playerGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.players.some(p => p.id === userId) &&
      g.status === 'completed'
    );
    
    if (playerGames.length === 0) {
      return NextResponse.json({
        player: {
          id: player.id,
          name: player.name,
          profilePhoto: player.profilePhoto
        },
        gameType,
        history: [],
        currentRating: 0
      });
    }
    
    // Sort by date (oldest first for chronological calculation)
    const sortedGames = playerGames.sort((a, b) => 
      new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt)
    );
    
    // Calculate cumulative stats after each game
    const history = [];
    const cumulativeStats = {
      totalGames: 0,
      wins: 0,
      draws: 0,
      finals: 0,
      roundWins: 0,
      totalRounds: 0,
      totalDrops: 0
    };
    
    sortedGames.forEach((game, index) => {
      const playerInGame = game.players.find(p => p.id === userId);
      cumulativeStats.totalGames++;
      
      // Check if winner
      const isWinner = game.winner === userId || (game.winners && game.winners.includes(userId));
      if (isWinner) {
        cumulativeStats.wins++;
      }
      
      // Check for draws (Chess)
      if (gameType.toLowerCase() === 'chess' && !game.winner) {
        cumulativeStats.draws++;
      }
      
      // Check finals (Rummy)
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        const lastRound = game.rounds[game.rounds.length - 1];
        if (lastRound.scores && (lastRound.scores[userId] !== 0 || !playerInGame?.isLost)) {
          cumulativeStats.finals++;
        }
      }
      
      // Count rounds and drops
      if (game.rounds) {
        game.rounds.forEach(round => {
          if (round.scores && round.scores[userId] !== undefined) {
            cumulativeStats.totalRounds++;
            
            const isDropped = (round.drops && round.drops[userId]) || (round.doubleDrops && round.doubleDrops[userId]);
            if (isDropped) {
              cumulativeStats.totalDrops++;
            }
            
            if (round.winners && round.winners[userId]) {
              cumulativeStats.roundWins++;
            }
          }
        });
      }
      
      // Calculate drop rate
      const dropRate = cumulativeStats.totalRounds > 0 ? 
        (cumulativeStats.totalDrops / cumulativeStats.totalRounds) * 100 : 0;
      
      // Calculate rating or win rate at this point
      const rating = calculateWPR({
        ...cumulativeStats,
        dropRate
      }, gameType);
      
      // For Chess and Ace, also calculate simple win rate
      const winRate = cumulativeStats.totalGames > 0 
        ? Math.round((cumulativeStats.wins / cumulativeStats.totalGames) * 100)
        : 0;
      
      // Add to history (only store every game or every 5th game for large datasets)
      const shouldRecord = index < 20 || index % 5 === 0 || index === sortedGames.length - 1;
      
      if (shouldRecord) {
        history.push({
          gameNumber: cumulativeStats.totalGames,
          date: game.completedAt || game.createdAt,
          rating,
          winRate, // Add win rate for Chess/Ace
          isWin: isWinner,
          gameId: game.id,
          gameTitle: game.title
        });
      }
    });
    
    // Always include the last game if not already included
    if (history[history.length - 1]?.gameNumber !== cumulativeStats.totalGames) {
      const lastGame = sortedGames[sortedGames.length - 1];
      const isWinner = lastGame.winner === userId || (lastGame.winners && lastGame.winners.includes(userId));
      const dropRate = cumulativeStats.totalRounds > 0 ? 
        (cumulativeStats.totalDrops / cumulativeStats.totalRounds) * 100 : 0;
      
      const winRate = cumulativeStats.totalGames > 0 
        ? Math.round((cumulativeStats.wins / cumulativeStats.totalGames) * 100)
        : 0;
      
      history.push({
        gameNumber: cumulativeStats.totalGames,
        date: lastGame.completedAt || lastGame.createdAt,
        rating: calculateWPR({ ...cumulativeStats, dropRate }, gameType),
        winRate,
        isWin: isWinner,
        gameId: lastGame.id,
        gameTitle: lastGame.title
      });
    }
    
    const currentRating = history[history.length - 1]?.rating || 0;
    const currentWinRate = history[history.length - 1]?.winRate || 0;
    
    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        profilePhoto: player.profilePhoto
      },
      gameType,
      history,
      currentRating,
      currentWinRate, // For Chess/Ace
      totalGames: cumulativeStats.totalGames
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching rating history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rating history' },
      { status: 500 }
    );
  }
}

