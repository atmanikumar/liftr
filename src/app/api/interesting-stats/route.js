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
            
            // Check if they won the finals
            if (game.winner === gamePlayer.id) {
              playerStats.finalWins++;
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
          isWinner: game.winner === player.id
        });
      });
      
      // Process rounds for round-level stats with player point tracking
      if (game.rounds) {
        // Track each player's total points as we go through rounds
        const playerPointsAtRound = {};
        game.players.forEach(p => {
          playerPointsAtRound[p.id] = 0;
        });
        
        game.rounds.forEach((round, roundIndex) => {
          if (!round.scores) return;
          
          Object.keys(round.scores).forEach(playerId => {
            const stats = initPlayer(playerId);
            
            // Count drops and double drops
            if (round.drops && round.drops[playerId]) {
              stats.drops++;
            }
            if (round.doubleDrops && round.doubleDrops[playerId]) {
              stats.doubleDrops++;
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
      }
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
    
    const stats = {
      patientGuy: findTop('totalDrops'), // Most drops (single + double)
      strategist: findTop('finals'), // Most finals reached
      finalHero: findTop('finalWins'), // Most final wins
      consecutiveWinner: findTop('consecutiveMatchWins'), // Most consecutive match wins
      consecutiveRoundWinner: consecutiveRoundWinnerStat, // Most consecutive round wins (with game link)
      eightyClub: findTop('scores80'), // Most 80s (avoidable only)
      roundWinChampion: findTop('roundWins') // Most round wins
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

