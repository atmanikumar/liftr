import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET interesting statistics for a game type
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    
    const games = await getGames();
    const users = await getUsers();
    
    // Filter games by type and status
    const completedGames = games.filter(g => 
      g.type.toLowerCase() === gameType.toLowerCase() && 
      g.status === 'completed'
    );
    
    if (completedGames.length === 0) {
      return NextResponse.json({
        gameType,
        stats: {}
      });
    }
    
    // Initialize stats tracking
    const playerStats = {};
    
    // Helper to initialize player stats
    const initPlayer = (playerId) => {
      if (!playerStats[playerId]) {
        const user = users.find(u => u.id === playerId);
        playerStats[playerId] = {
          id: playerId,
          name: user?.name || 'Unknown',
          profilePhoto: user?.profilePhoto || null,
          drops: 0,
          doubleDrops: 0,
          finals: 0,
          finalWins: 0,
          finalLosses: 0,
          roundWins: 0,
          scores80: 0,
          matchWins: 0,
          gamesPlayed: 0,
          consecutiveMatchWins: 0,
          currentStreak: 0,
          consecutiveRoundWins: 0,
          maxRoundWinStreak: 0,
          maxRoundWinStreakGameId: null, // Track which game had the max streak
          currentRoundStreak: 0,
          playedRounds: 0, // Rounds played (not dropped)
          earliestElimination: null, // Minimum round number at elimination
          earliestEliminationGameId: null, // Track which game
          maxRoundsInSingleGame: 0,
          maxRoundsInSingleGameId: null, // Track which game
          consecutiveFinals: 0, // Consecutive finals streak
          currentFinalsStreak: 0, // Current finals streak
          maxConsecutiveFinals: 0, // Max consecutive finals
          gameHistory: [] // Track game order for streak calculation
        };
      }
      return playerStats[playerId];
    };
    
    // Sort games by date to calculate streaks correctly
    const sortedGames = [...completedGames].sort((a, b) => 
      new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt)
    );
    
    // Process each game
    sortedGames.forEach(game => {
      if (!game.players) return;
      
      // Track which players participated in finals for this game
      const playersInFinal = new Set();
      
      // For Rummy: Count finals (all players who participated in the last round)
      // This mimics the logic from /api/stats
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        // Get the last round
        const lastRound = game.rounds[game.rounds.length - 1];
        
        // Check each player to see if they participated in the final
        game.players.forEach(gamePlayer => {
          // Player participated in final if they scored in last round OR are not lost
          if (lastRound.scores && (lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost)) {
            const playerStats = initPlayer(gamePlayer.id);
            playerStats.finals++;
            playersInFinal.add(gamePlayer.id);
            
            // Check if they won the finals
            if (game.winner === gamePlayer.id) {
              playerStats.finalWins++;
            } else {
              // They participated in final but didn't win = final loss
              playerStats.finalLosses++;
            }
          }
        });
      }
      
      game.players.forEach(player => {
        const stats = initPlayer(player.id);
        
        // Track games played
        stats.gamesPlayed++;
        
        // Track match wins
        if (game.winner === player.id) {
          stats.matchWins++;
          stats.currentStreak++;
          stats.consecutiveMatchWins = Math.max(stats.consecutiveMatchWins, stats.currentStreak);
        } else {
          stats.currentStreak = 0;
        }
        
        stats.gameHistory.push({
          gameId: game.id,
          date: game.completedAt || game.createdAt,
          isWinner: game.winner === player.id,
          inFinal: playersInFinal.has(player.id)
        });
      });
      
      // Process rounds for round-level stats with player point tracking
      if (game.rounds) {
        // Track each player's total points as we go through rounds
        const playerPointsAtRound = {};
        const playerRoundsInThisGame = {}; // Track rounds played per player in this game
        game.players.forEach(p => {
          playerPointsAtRound[p.id] = 0;
          playerRoundsInThisGame[p.id] = 0;
        });
        
        game.rounds.forEach((round, roundIndex) => {
          if (!round.scores) return;
          
          Object.keys(round.scores).forEach(playerId => {
            const stats = initPlayer(playerId);
            
            // Count drops and double drops (Rummy only)
            const isDropped = round.drops && round.drops[playerId];
            const isDoubleDropped = round.doubleDrops && round.doubleDrops[playerId];
            
            if (isDropped) {
              stats.drops++;
            }
            if (isDoubleDropped) {
              stats.doubleDrops++;
            }
            
            // Count played rounds (not dropped) - Rummy only
            if (gameType.toLowerCase() === 'rummy') {
              if (!isDropped && !isDoubleDropped) {
                stats.playedRounds++;
                playerRoundsInThisGame[playerId]++;
              }
            }
            
            // Count round wins (0 points)
            if (round.winners && round.winners[playerId]) {
              stats.roundWins++;
              stats.currentRoundStreak++;
              if (stats.currentRoundStreak > stats.maxRoundWinStreak) {
                stats.maxRoundWinStreak = stats.currentRoundStreak;
                stats.maxRoundWinStreakGameId = game.id; // Track which game had this streak
              }
            } else {
              stats.currentRoundStreak = 0;
            }
            
            // Count scores of 80 (only if avoidable)
            const score = round.scores[playerId];
            if (score === 80) {
              const pointsBeforeThisRound = playerPointsAtRound[playerId];
              const pointsAfterThisRound = pointsBeforeThisRound + 80;
              const maxPoints = game.maxPoints || 120;
              const pointsRemaining = maxPoints - pointsAfterThisRound;
              
              // Check if player had 3 consecutive drops (must play situation)
              const getConsecutiveDropsBeforeRound = () => {
                let consecutiveDrops = 0;
                // Check rounds from this round backwards
                for (let i = roundIndex - 1; i >= 0; i--) {
                  const prevRound = game.rounds[i];
                  if ((prevRound.drops && prevRound.drops[playerId]) || 
                      (prevRound.doubleDrops && prevRound.doubleDrops[playerId])) {
                    consecutiveDrops++;
                  } else {
                    break;
                  }
                }
                return consecutiveDrops;
              };
              
              const consecutiveDrops = getConsecutiveDropsBeforeRound();
              const wasMustPlay = consecutiveDrops >= 3;
              
              // Only count 80 if points remaining after this round > 20 and not must play
              if (pointsRemaining > 20 && !wasMustPlay) {
                stats.scores80++;
              }
            }
            
            // Update player's total points after this round
            playerPointsAtRound[playerId] = (playerPointsAtRound[playerId] || 0) + (round.scores[playerId] || 0);
          });
        });
        
        // After processing all rounds in this game, update max rounds in single game (Rummy only)
        if (gameType.toLowerCase() === 'rummy') {
          Object.keys(playerRoundsInThisGame).forEach(playerId => {
            const stats = initPlayer(playerId);
            const roundsInThisGame = playerRoundsInThisGame[playerId];
            if (roundsInThisGame > stats.maxRoundsInSingleGame) {
              stats.maxRoundsInSingleGame = roundsInThisGame;
              stats.maxRoundsInSingleGameId = game.id;
            }
          });
        }
      }
      
      // Track earliest elimination (for players who were eliminated) - Chess and Ace only
      if (gameType.toLowerCase() !== 'rummy' && game.rounds && game.rounds.length > 0) {
        game.players.forEach(player => {
          if (player.isLost) {
            const stats = initPlayer(player.id);
            // Find the round number where they were eliminated
            // They were eliminated after the round where their total reached maxPoints
            let eliminationRound = null;
            let totalPoints = 0;
            const maxPoints = game.maxPoints || 120;
            
            for (let i = 0; i < game.rounds.length; i++) {
              const round = game.rounds[i];
              if (round.scores && round.scores[player.id] !== undefined) {
                totalPoints += round.scores[player.id];
                if (totalPoints >= maxPoints) {
                  eliminationRound = i + 1; // 1-indexed
                  break;
                }
              }
            }
            
            if (eliminationRound !== null) {
              if (stats.earliestElimination === null || eliminationRound < stats.earliestElimination) {
                stats.earliestElimination = eliminationRound;
                stats.earliestEliminationGameId = game.id;
              }
            }
          }
        });
      }
    });
    
    // Calculate consecutive finals streaks for each player
    Object.values(playerStats).forEach(player => {
      let currentStreak = 0;
      let maxStreak = 0;
      
      player.gameHistory.forEach(game => {
        if (game.inFinal) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      
      player.maxConsecutiveFinals = maxStreak;
    });
    
    // Find top players for each category
    const playerList = Object.values(playerStats);
    
    const findTop = (statKey, minGames = 1) => {
      // Filter by games played (not wins) to include players who participated
      const filtered = playerList.filter(p => p.gamesPlayed >= minGames && p[statKey] > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b[statKey] - a[statKey]);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer[statKey]
      };
    };
    
    // Calculate total drops (single + double drops)
    playerList.forEach(player => {
      player.totalDrops = player.drops + player.doubleDrops;
    });
    
    // Special handling for consecutiveRoundWinner to include gameId
    const consecutiveRoundWinnerStat = (() => {
      const result = findTop('maxRoundWinStreak');
      if (result) {
        const topPlayer = playerList.find(p => p.id === result.player.id);
        return {
          ...result,
          gameId: topPlayer?.maxRoundWinStreakGameId || null
        };
      }
      return result;
    })();
    
    // Special handling for maxRoundsInSingleGame to include gameId
    const maxRoundsInSingleGameStat = (() => {
      const result = findTop('maxRoundsInSingleGame');
      if (result) {
        const topPlayer = playerList.find(p => p.id === result.player.id);
        return {
          ...result,
          gameId: topPlayer?.maxRoundsInSingleGameId || null
        };
      }
      return result;
    })();
    
    // Special handling for earliestElimination (find minimum, not maximum)
    const earliestEliminationStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 1 && p.earliestElimination !== null);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => a.earliestElimination - b.earliestElimination);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.earliestElimination,
        gameId: topPlayer.earliestEliminationGameId || null
      };
    })();
    
    const stats = {
      patientGuy: findTop('totalDrops'), // Most drops (single + double)
      strategist: findTop('finals'), // Most finals reached
      finalHero: findTop('finalWins'), // Most final wins
      warrior: findTop('finalLosses'), // Most final losses
      consistent: findTop('maxConsecutiveFinals'), // Most consecutive finals
      consecutiveWinner: findTop('consecutiveMatchWins'), // Most consecutive match wins
      consecutiveRoundWinner: consecutiveRoundWinnerStat, // Most consecutive round wins (with game link)
      eightyClub: findTop('scores80'), // Most 80s (avoidable only)
      roundWinChampion: findTop('roundWins'), // Most round wins
      bravePlayer: findTop('playedRounds'), // Most played rounds (not dropped)
      earliestElimination: earliestEliminationStat, // Earliest elimination
      maxRoundsInSingleGame: maxRoundsInSingleGameStat // Most rounds played in a single game (with game link)
    };
    
    return NextResponse.json({
      gameType,
      stats,
      totalGames: completedGames.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching interesting stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

