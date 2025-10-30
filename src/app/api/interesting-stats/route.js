import { NextResponse } from 'next/server';
import { getGames, getUsers } from '@/lib/storage';

// GET interesting statistics for a game type
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') || 'Rummy';
    const currentUserId = searchParams.get('userId'); // Get current user ID if provided
    
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
        currentStreakGames: [], // Track games in current match win streak
        maxConsecutiveMatchWinGames: [], // Track games in max match win streak
        consecutiveRoundWins: 0,
        maxRoundWinStreak: 0,
        maxRoundWinStreakGameId: null, // Track which game had the max streak
        currentRoundStreak: 0,
        playedRounds: 0, // Rounds played (not dropped)
        totalRounds: 0, // Total rounds (including drops)
        earliestElimination: null, // Minimum round number at elimination
        earliestEliminationGameId: null, // Track which game
        maxRoundsInSingleGame: 0,
        maxRoundsInSingleGameId: null, // Track which game
        minRoundsToWin: null, // Minimum rounds to win a game
        minRoundsToWinGameId: null, // Game with least rounds to win
        consecutiveFinals: 0, // Consecutive finals streak
        currentFinalsStreak: 0, // Current finals streak
        maxConsecutiveFinals: 0, // Max consecutive finals
        gameHistory: [], // Track game order for streak calculation
        // Track game IDs for each stat category
        dropGameIds: [],
        finalGameIds: [],
        finalWinGameIds: [],
        finalLossGameIds: [],
        roundWinGameIds: [],
        scores80GameIds: [],
        matchWinGameIds: []
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
      
      // For Rummy: count finals (all players who participated in the last round, including winner)
      // Match the exact logic from /api/stats/route.js
      if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
        // Get the last round
        const lastRound = game.rounds[game.rounds.length - 1];
        
        // Check each player to see if they participated in the final
        game.players.forEach(gamePlayer => {
          // Check if this player scored in the last round (including winner)
          // Match exact logic: (lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost)
          if (lastRound.scores && (lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost)) {
            const playerStats = initPlayer(gamePlayer.id);
            playerStats.finals++;
            if (!playerStats.finalGameIds.includes(game.id)) {
              playerStats.finalGameIds.push(game.id);
            }
            playersInFinal.add(gamePlayer.id);
            
            // Check if they won the finals
            if (game.winner === gamePlayer.id) {
              playerStats.finalWins++;
              if (!playerStats.finalWinGameIds.includes(game.id)) {
                playerStats.finalWinGameIds.push(game.id);
              }
            } else {
              // They participated in final but didn't win = final loss
              playerStats.finalLosses++;
              if (!playerStats.finalLossGameIds.includes(game.id)) {
                playerStats.finalLossGameIds.push(game.id);
              }
            }
          }
        });
      }
      
      game.players.forEach(player => {
        const stats = initPlayer(player.id);
        
        // Track games played
        stats.gamesPlayed++;
        
        // Track match wins and streak - ONLY for games this player participated in
        if (game.winner === player.id) {
          stats.matchWins++;
          if (!stats.matchWinGameIds.includes(game.id)) {
            stats.matchWinGameIds.push(game.id);
          }
          stats.currentStreak++;
          stats.currentStreakGames.push(game.id);
          
          // Update max consecutive streak if current is higher
          if (stats.currentStreak > stats.consecutiveMatchWins) {
            stats.consecutiveMatchWins = stats.currentStreak;
            stats.maxConsecutiveMatchWinGames = [...stats.currentStreakGames];
          }
          
          // Track minimum rounds to win (Rummy only)
          if (gameType.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0) {
            const roundsInThisGame = game.rounds.length;
            if (stats.minRoundsToWin === null || roundsInThisGame < stats.minRoundsToWin) {
              stats.minRoundsToWin = roundsInThisGame;
              stats.minRoundsToWinGameId = game.id;
            }
          }
        } else {
          // Only reset streak if this player actually played (was in the game)
          stats.currentStreak = 0;
          stats.currentStreakGames = [];
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
        const playerRoundStreakInThisGame = {}; // Track round win streak per player in THIS game
        game.players.forEach(p => {
          playerPointsAtRound[p.id] = 0;
          playerRoundsInThisGame[p.id] = 0;
          playerRoundStreakInThisGame[p.id] = { current: 0, max: 0 };
        });
        
        game.rounds.forEach((round, roundIndex) => {
          if (!round.scores) return;
          
          Object.keys(round.scores).forEach(playerId => {
            const stats = initPlayer(playerId);
            
            // Count ALL rounds (including drops)
            stats.totalRounds++;
            
            // Count drops and double drops (Rummy only)
            const isDropped = round.drops && round.drops[playerId];
            const isDoubleDropped = round.doubleDrops && round.doubleDrops[playerId];
            
            if (isDropped) {
              stats.drops++;
              if (!stats.dropGameIds.includes(game.id)) {
                stats.dropGameIds.push(game.id);
              }
            }
            if (isDoubleDropped) {
              stats.doubleDrops++;
              if (!stats.dropGameIds.includes(game.id)) {
                stats.dropGameIds.push(game.id);
              }
            }
            
            // Count played rounds (not dropped) - Rummy only
            if (gameType.toLowerCase() === 'rummy') {
              if (!isDropped && !isDoubleDropped) {
                stats.playedRounds++;
                playerRoundsInThisGame[playerId]++;
              }
            }
            
            // Count round wins (0 points) - track streak within THIS game only
            if (round.winners && round.winners[playerId]) {
              stats.roundWins++;
              if (!stats.roundWinGameIds.includes(game.id)) {
                stats.roundWinGameIds.push(game.id);
              }
              
              // Track streak within this game
              if (!playerRoundStreakInThisGame[playerId]) {
                playerRoundStreakInThisGame[playerId] = { current: 0, max: 0 };
              }
              playerRoundStreakInThisGame[playerId].current++;
              playerRoundStreakInThisGame[playerId].max = Math.max(
                playerRoundStreakInThisGame[playerId].max,
                playerRoundStreakInThisGame[playerId].current
              );
            } else {
              // Reset streak within this game
              if (playerRoundStreakInThisGame[playerId]) {
                playerRoundStreakInThisGame[playerId].current = 0;
              }
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
                if (!stats.scores80GameIds.includes(game.id)) {
                  stats.scores80GameIds.push(game.id);
                }
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
        
        // After processing all rounds in this game, update max round win streak
        Object.keys(playerRoundStreakInThisGame).forEach(playerId => {
          const stats = initPlayer(playerId);
          const maxStreakInThisGame = playerRoundStreakInThisGame[playerId].max;
          if (maxStreakInThisGame > stats.maxRoundWinStreak) {
            stats.maxRoundWinStreak = maxStreakInThisGame;
            stats.maxRoundWinStreakGameId = game.id;
          }
        });
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
      let currentStreakGames = [];
      let maxStreakGames = [];
      
      // Sort game history by date to ensure chronological order
      const sortedHistory = [...player.gameHistory].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      sortedHistory.forEach((game, index) => {
        if (game.inFinal) {
          currentStreak++;
          currentStreakGames.push(game.gameId);
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            maxStreakGames = [...currentStreakGames];
          }
        } else {
          // Player participated but did NOT reach finals - breaks the streak
          currentStreak = 0;
          currentStreakGames = [];
        }
      });
      
      player.maxConsecutiveFinals = maxStreak;
      player.maxConsecutiveFinalsGameIds = maxStreakGames;
      
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
    
    // Calculate total drops (single + double drops) and percentages
    playerList.forEach(player => {
      player.totalDrops = player.drops + player.doubleDrops;
      
      // Calculate percentages
      player.winPercentage = player.gamesPlayed > 0 ? (player.matchWins / player.gamesPlayed) * 100 : 0;
      player.finalPercentage = player.gamesPlayed > 0 ? (player.finals / player.gamesPlayed) * 100 : 0;
      player.finalLossPercentage = player.gamesPlayed > 0 ? (player.finalLosses / player.gamesPlayed) * 100 : 0;
      player.roundWinPercentage = player.totalRounds > 0 ? (player.roundWins / player.totalRounds) * 100 : 0;
      player.dropPercentage = player.totalRounds > 0 ? (player.totalDrops / player.totalRounds) * 100 : 0;
      player.bravePlayerPercentage = player.totalRounds > 0 ? (player.playedRounds / player.totalRounds) * 100 : 0;
      player.scores80Percentage = player.gamesPlayed > 0 ? (player.scores80 / player.gamesPlayed) * 100 : 0;
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
    
    // Special handling for minRoundsToWin (find minimum, Rummy only)
    const minRoundsToWinStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 1 && p.minRoundsToWin !== null);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => a.minRoundsToWin - b.minRoundsToWin);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.minRoundsToWin,
        gameId: topPlayer.minRoundsToWinGameId || null
      };
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
    
    // Percentage-based stats
    const winPercentageStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 3 && p.winPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.winPercentage - a.winPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.winPercentage,
        matchWins: topPlayer.matchWins,
        gamesPlayed: topPlayer.gamesPlayed
      };
    })();
    
    const finalPercentageStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 3 && p.finalPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.finalPercentage - a.finalPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.finalPercentage,
        finals: topPlayer.finals,
        gamesPlayed: topPlayer.gamesPlayed
      };
    })();
    
    const roundWinPercentageStat = (() => {
      const filtered = playerList.filter(p => p.totalRounds >= 10 && p.roundWinPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.roundWinPercentage - a.roundWinPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.roundWinPercentage,
        roundWins: topPlayer.roundWins,
        totalRounds: topPlayer.totalRounds
      };
    })();
    
    const dropPercentageStat = (() => {
      const filtered = playerList.filter(p => p.totalRounds >= 10 && p.dropPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.dropPercentage - a.dropPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.dropPercentage,
        totalDrops: topPlayer.totalDrops,
        totalRounds: topPlayer.totalRounds
      };
    })();
    
    const bravePlayerPercentageStat = (() => {
      const filtered = playerList.filter(p => p.totalRounds >= 10 && p.bravePlayerPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.bravePlayerPercentage - a.bravePlayerPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.bravePlayerPercentage,
        playedRounds: topPlayer.playedRounds,
        totalRounds: topPlayer.totalRounds
      };
    })();
    
    const scores80PercentageStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 3 && p.scores80Percentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.scores80Percentage - a.scores80Percentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.scores80Percentage,
        scores80: topPlayer.scores80,
        gamesPlayed: topPlayer.gamesPlayed
      };
    })();
    
    const finalLossPercentageStat = (() => {
      const filtered = playerList.filter(p => p.gamesPlayed >= 3 && p.finalLossPercentage > 0);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => b.finalLossPercentage - a.finalLossPercentage);
      const topPlayer = sorted[0];
      
      return {
        player: {
          id: topPlayer.id,
          name: topPlayer.name,
          profilePhoto: topPlayer.profilePhoto
        },
        value: topPlayer.finalLossPercentage,
        finalLosses: topPlayer.finalLosses,
        gamesPlayed: topPlayer.gamesPlayed
      };
    })();
    
    const stats = {
      patientGuy: dropPercentageStat, // Drop Specialist - Drop percentage
      strategist: finalPercentageStat, // Final reached percentage
      finalHero: winPercentageStat, // Win percentage
      warrior: finalLossPercentageStat, // Final loss percentage
      consistent: findTop('maxConsecutiveFinals'), // Most consecutive finals
      consecutiveWinner: findTop('consecutiveMatchWins'), // Most consecutive match wins
      consecutiveRoundWinner: consecutiveRoundWinnerStat, // Most consecutive round wins (with game link)
      eightyClub: scores80PercentageStat, // 80s percentage (avoidable only, excludes must-play situations)
      roundWinChampion: roundWinPercentageStat, // Round win percentage
      bravePlayer: bravePlayerPercentageStat, // Percentage of rounds played without dropping
      earliestElimination: earliestEliminationStat, // Earliest elimination
      maxRoundsInSingleGame: maxRoundsInSingleGameStat, // Most rounds played in a single game (with game link)
      minRoundsToWin: minRoundsToWinStat // Least rounds to win a game (Rummy only, with game link)
    };
    
    // Get current user's stats if userId is provided
    let currentUserStats = null;
    let currentUserGameIds = null;
    if (currentUserId && playerStats[currentUserId]) {
      const userStats = playerStats[currentUserId];
      currentUserStats = {
        patientGuy: {
          value: userStats.dropPercentage,
          totalDrops: userStats.totalDrops,
          totalRounds: userStats.totalRounds
        },
        strategist: {
          value: userStats.finalPercentage,
          finals: userStats.finals,
          gamesPlayed: userStats.gamesPlayed
        },
        finalHero: {
          value: userStats.winPercentage,
          matchWins: userStats.matchWins,
          gamesPlayed: userStats.gamesPlayed
        },
        warrior: {
          value: userStats.finalLossPercentage,
          finalLosses: userStats.finalLosses,
          gamesPlayed: userStats.gamesPlayed
        },
        consistent: userStats.maxConsecutiveFinals,
        consecutiveWinner: userStats.consecutiveMatchWins,
        consecutiveRoundWinner: userStats.maxRoundWinStreak,
        eightyClub: {
          value: userStats.scores80Percentage,
          scores80: userStats.scores80,
          gamesPlayed: userStats.gamesPlayed
        },
        roundWinChampion: {
          value: userStats.roundWinPercentage,
          roundWins: userStats.roundWins,
          totalRounds: userStats.totalRounds
        },
        bravePlayer: {
          value: userStats.bravePlayerPercentage,
          playedRounds: userStats.playedRounds,
          totalRounds: userStats.totalRounds
        },
        earliestElimination: userStats.earliestElimination,
        maxRoundsInSingleGame: userStats.maxRoundsInSingleGame,
        minRoundsToWin: userStats.minRoundsToWin
      };
      currentUserGameIds = {
        patientGuy: userStats.dropGameIds,
        strategist: userStats.finalGameIds,
        finalHero: userStats.finalWinGameIds,
        warrior: userStats.finalLossGameIds,
        consistent: userStats.maxConsecutiveFinalsGameIds || [], // Games in the consecutive finals streak
        consecutiveWinner: userStats.maxConsecutiveMatchWinGames || [], // Games in the consecutive match win streak
        consecutiveRoundWinner: userStats.maxRoundWinStreakGameId ? [userStats.maxRoundWinStreakGameId] : [], // Single game with max streak
        eightyClub: userStats.scores80GameIds,
        roundWinChampion: userStats.roundWinGameIds,
        bravePlayer: userStats.matchWinGameIds, // Games where they played rounds
        earliestElimination: userStats.earliestEliminationGameId ? [userStats.earliestEliminationGameId] : [],
        maxRoundsInSingleGame: userStats.maxRoundsInSingleGameId ? [userStats.maxRoundsInSingleGameId] : [],
        minRoundsToWin: userStats.minRoundsToWinGameId ? [userStats.minRoundsToWinGameId] : [] // Single game with least rounds to win
      };
    }
    
    return NextResponse.json({
      gameType,
      stats,
      currentUserStats,
      currentUserGameIds,
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

