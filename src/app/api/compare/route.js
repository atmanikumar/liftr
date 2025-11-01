import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET comprehensive player comparison data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const player1Id = searchParams.get('player1');
    const player2Id = searchParams.get('player2');
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    if (!player1Id || !player2Id) {
      return NextResponse.json(
        { error: 'Both player1 and player2 IDs are required' },
        { status: 400 }
      );
    }
    
    if (player1Id === player2Id) {
      return NextResponse.json(
        { error: 'Cannot compare same player with themselves' },
        { status: 400 }
      );
    }
    
    const games = await getGames();
    const users = await getUsers();
    
    // Get player info
    const player1 = users.find(u => u.id === player1Id);
    const player2 = users.find(u => u.id === player2Id);
    
    if (!player1 || !player2) {
      return NextResponse.json(
        { error: 'One or both players not found' },
        { status: 404 }
      );
    }
    
    // Filter games by type and status, and games where both players participated
    const relevantGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.status === 'completed' &&
      g.players.some(p => p.id === player1Id || p.id === player2Id)
    );
    
    // Calculate comprehensive stats for both players
    const calculatePlayerStats = (playerId) => {
      const stats = {
        totalGames: 0,
        wins: 0,
        finals: 0,
        roundWins: 0,
        totalRounds: 0,
        totalPoints: 0,
        drops: 0,
        doubleDrops: 0,
        scores80: 0,
        mustPlayRounds: 0,
        mustPlayWins: 0,
        consecutiveWins: 0,
        maxConsecutiveWins: 0,
        consecutiveFinals: 0,
        maxConsecutiveFinals: 0,
        headToHeadWins: 0, // Wins in games where both players participated
        headToHeadGames: 0,
        avgPointsPerGame: 0,
        avgPointsPerRound: 0,
        highestScore: 0,
        lowestScore: Infinity,
        perfectGames: 0, // Games won without getting any points
      };
      
      let currentWinStreak = 0;
      let currentFinalStreak = 0;
      
      const sortedGames = [...relevantGames]
        .filter(g => g.players.some(p => p.id === playerId))
        .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));
      
      sortedGames.forEach(game => {
        const playerInGame = game.players.find(p => p.id === playerId);
        if (!playerInGame) return;
        
        stats.totalGames++;
        
        // Check if both players in this game (head-to-head)
        const isHeadToHead = game.players.some(p => p.id === player1Id) && 
                            game.players.some(p => p.id === player2Id);
        if (isHeadToHead) {
          stats.headToHeadGames++;
          
          // For Ace: Head-to-head wins based on round wins comparison
          if (gameType.toLowerCase() === 'ace') {
            let player1RoundWins = 0;
            let player2RoundWins = 0;
            
            if (game.rounds && game.rounds.length > 0) {
              game.rounds.forEach(round => {
                if (round.winners) {
                  if (round.winners[player1Id] === true) player1RoundWins++;
                  if (round.winners[player2Id] === true) player2RoundWins++;
                }
              });
            }
            
            // Current player won if they have more round wins
            if (playerId === player1Id && player1RoundWins > player2RoundWins) {
              stats.headToHeadWins++;
            } else if (playerId === player2Id && player2RoundWins > player1RoundWins) {
              stats.headToHeadWins++;
            }
          } else {
            // For Chess/Rummy: Normal head-to-head win check
            if (game.winner === playerId) {
              stats.headToHeadWins++;
            }
          }
        }
        
        // Win tracking
        // For Ace: Count round wins, NOT match wins
        if (gameType.toLowerCase() === 'ace') {
          if (game.rounds && game.rounds.length > 0) {
            let roundWinsInGame = 0;
            game.rounds.forEach(round => {
              if (round.winners && round.winners[playerId] === true) {
                stats.wins++;
                roundWinsInGame++;
              }
            });
            
            // Track win streak based on whether player had any round wins in this game
            if (roundWinsInGame > 0) {
              currentWinStreak++;
              stats.maxConsecutiveWins = Math.max(stats.maxConsecutiveWins, currentWinStreak);
            } else {
              currentWinStreak = 0;
            }
          }
        } else {
          // For Chess/Rummy: Count match wins normally
          if (game.winner === playerId) {
            stats.wins++;
            currentWinStreak++;
            stats.maxConsecutiveWins = Math.max(stats.maxConsecutiveWins, currentWinStreak);
          } else {
            currentWinStreak = 0;
          }
        }
        
        // Finals tracking (Rummy)
        if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0) {
          const lastRound = game.rounds[game.rounds.length - 1];
          const inFinal = lastRound.scores && (lastRound.scores[playerId] !== 0 || !playerInGame?.isLost);
          
          if (inFinal) {
            stats.finals++;
            currentFinalStreak++;
            stats.maxConsecutiveFinals = Math.max(stats.maxConsecutiveFinals, currentFinalStreak);
          } else {
            currentFinalStreak = 0;
          }
        }
        
        // Process rounds
        if (game.rounds) {
          let gamePoints = 0;
          let playerPointsInGame = 0;
          
          // Track points for pressure detection
          const playerPointsAtRound = {};
          game.players.forEach(p => {
            playerPointsAtRound[p.id] = 0;
          });
          
          game.rounds.forEach((round, roundIndex) => {
            if (!round.scores || round.scores[playerId] === undefined) return;
            
            stats.totalRounds++;
            const score = round.scores[playerId] || 0;
            gamePoints += score;
            playerPointsInGame += score;
            
            // Track highest/lowest scores
            if (score > stats.highestScore) stats.highestScore = score;
            if (score < stats.lowestScore && score > 0) stats.lowestScore = score;
            
            // Round wins (0 points)
            if (round.winners && round.winners[playerId]) {
              stats.roundWins++;
            }
            
            // Drops (Rummy only)
            if (gameType.toLowerCase() === 'rummy') {
              const isDropped = round.drops && round.drops[playerId];
              const isDoubleDropped = round.doubleDrops && round.doubleDrops[playerId];
              
              if (isDropped) stats.drops++;
              if (isDoubleDropped) stats.doubleDrops++;
              
              // Must-play detection (only for non-dropped rounds)
              if (!isDropped && !isDoubleDropped) {
                // Check consecutive drops
                let consecutiveDrops = 0;
                for (let i = roundIndex - 1; i >= 0; i--) {
                  const prevRound = game.rounds[i];
                  if ((prevRound.drops && prevRound.drops[playerId]) || 
                      (prevRound.doubleDrops && prevRound.doubleDrops[playerId])) {
                    consecutiveDrops++;
                  } else {
                    break;
                  }
                }
                
                const mustPlayAfterDrops = consecutiveDrops >= 3;
                
                // Check pressure (< 20 points from max)
                const currentPoints = playerPointsAtRound[playerId] || 0;
                const maxPoints = game.maxPoints || 120;
                const pointsDiff = maxPoints - currentPoints;
                const underPressure = pointsDiff < 20;
                
                if (mustPlayAfterDrops || underPressure) {
                  stats.mustPlayRounds++;
                  if (round.winners && round.winners[playerId]) {
                    stats.mustPlayWins++;
                  }
                }
              }
            }
            
            // Count 80s (avoidable only)
            if (score === 80) {
              const pointsBeforeThisRound = playerPointsAtRound[playerId];
              const pointsAfterThisRound = pointsBeforeThisRound + 80;
              const maxPoints = game.maxPoints || 120;
              const pointsRemaining = maxPoints - pointsAfterThisRound;
              
              // Check if must-play (3 consecutive drops)
              let consecutiveDrops = 0;
              for (let i = roundIndex - 1; i >= 0; i--) {
                const prevRound = game.rounds[i];
                if ((prevRound.drops && prevRound.drops[playerId]) || 
                    (prevRound.doubleDrops && prevRound.doubleDrops[playerId])) {
                  consecutiveDrops++;
                } else {
                  break;
                }
              }
              
              const wasMustPlay = consecutiveDrops >= 3;
              
              if (pointsRemaining > 20 && !wasMustPlay) {
                stats.scores80++;
              }
            }
            
            // Update points tracker
            playerPointsAtRound[playerId] = (playerPointsAtRound[playerId] || 0) + score;
          });
          
          stats.totalPoints += gamePoints;
          
          // Perfect game (won with 0 points)
          if (game.winner === playerId && playerPointsInGame === 0) {
            stats.perfectGames++;
          }
        }
      });
      
      // Calculate averages and percentages
      stats.winPercentage = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
      stats.finalsPercentage = stats.totalGames > 0 ? (stats.finals / stats.totalGames) * 100 : 0;
      stats.roundWinPercentage = stats.totalRounds > 0 ? (stats.roundWins / stats.totalRounds) * 100 : 0;
      stats.dropPercentage = stats.totalRounds > 0 ? ((stats.drops + stats.doubleDrops) / stats.totalRounds) * 100 : 0;
      stats.clutchPercentage = stats.mustPlayRounds > 0 ? (stats.mustPlayWins / stats.mustPlayRounds) * 100 : 0;
      stats.scores80Percentage = stats.totalGames > 0 ? (stats.scores80 / stats.totalGames) * 100 : 0;
      stats.avgPointsPerGame = stats.totalGames > 0 ? stats.totalPoints / stats.totalGames : 0;
      stats.avgPointsPerRound = stats.totalRounds > 0 ? stats.totalPoints / stats.totalRounds : 0;
      stats.headToHeadWinPercentage = stats.headToHeadGames > 0 ? (stats.headToHeadWins / stats.headToHeadGames) * 100 : 0;
      
      if (stats.lowestScore === Infinity) stats.lowestScore = 0;
      
      // Calculate rating (WPR) - simplified
      if (gameType.toLowerCase() === 'rummy') {
        // Use simple win percentage for comparison
        stats.rating = Math.round(stats.winPercentage);
      } else if (gameType.toLowerCase() === 'chess') {
        // Chess includes draws (not implemented yet, so just win %)
        stats.rating = Math.round(stats.winPercentage);
      } else {
        stats.rating = Math.round(stats.winPercentage);
      }
      
      return stats;
    };
    
    const player1Stats = calculatePlayerStats(player1Id);
    const player2Stats = calculatePlayerStats(player2Id);
    
    return NextResponse.json({
      gameType,
      player1: {
        id: player1.id,
        name: player1.name,
        profilePhoto: player1.profilePhoto || null,
        stats: player1Stats
      },
      player2: {
        id: player2.id,
        name: player2.name,
        profilePhoto: player2.profilePhoto || null,
        stats: player2Stats
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error in compare API:', error);
    return NextResponse.json(
      { error: 'Failed to compare players' },
      { status: 500 }
    );
  }
}

