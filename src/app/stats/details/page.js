'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

function StatDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const statKey = searchParams.get('stat');
  const gameType = searchParams.get('gameType');
  
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statInfo, setStatInfo] = useState(null);

  // Stat metadata
  const statMetadata = {
    patientGuy: { title: 'Patient Guy', subtitle: 'Games with Drops', icon: '🧘' },
    strategist: { title: 'Strategist', subtitle: 'Finals Reached', icon: '♟️' },
    finalHero: { title: 'Final Hero', subtitle: 'Final Wins', icon: '🎖️' },
    warrior: { title: 'Warrior', subtitle: 'Final Losses', icon: '⚔️' },
    consistent: { title: 'Consistent', subtitle: 'Finals Reached', icon: '🎯' },
    consecutiveWinner: { title: 'On Fire!', subtitle: 'Match Wins', icon: '🔥' },
    consecutiveRoundWinner: { title: 'Round Dominator', subtitle: 'Games with Round Wins', icon: '⚡' },
    eightyClub: { title: '80 Club', subtitle: 'Games with 80s', icon: '💥' },
    roundWinChampion: { title: 'Round Win Champion', subtitle: 'Games with Round Wins', icon: '👑' },
    bravePlayer: { title: 'Brave Player', subtitle: 'Games Played', icon: '🦁' },
    earliestElimination: { title: 'Early Exit', subtitle: 'Earliest Elimination Game', icon: '⏰' },
    maxRoundsInSingleGame: { title: 'Marathon Player', subtitle: 'Marathon Game', icon: '🏃' }
  };

  useEffect(() => {
    const fetchStatDetails = async () => {
      if (!user || !statKey || !gameType) return;
      
      setLoading(true);
      try {
        // Fetch stats with game IDs
        const response = await fetch(`/api/interesting-stats?gameType=${gameType}&userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          
          // Get the game IDs for this stat
          const gameIds = data.currentUserGameIds?.[statKey] || [];
          
          // Fetch each game's details
          const gamePromises = gameIds.map(id => 
            fetch(`/api/games/${id}`).then(r => r.ok ? r.json() : null)
          );
          
          const fetchedGames = await Promise.all(gamePromises);
          let validGames = fetchedGames.filter(g => g !== null);
          
          // Sort by date (newest first)
          validGames = validGames.sort((a, b) => 
            new Date(b.createdAt || b.completedAt) - new Date(a.createdAt || a.completedAt)
          );
          
          setGames(validGames);
          setStatInfo(statMetadata[statKey]);
        }
      } catch (error) {
        console.error('Failed to fetch stat details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatDetails();
  }, [user, statKey, gameType]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate specific stat details for a game
  const getGameStatDetails = (game) => {
    if (!game || !user) return null;

    const details = {};

    switch (statKey) {
      case 'roundWinChampion':
      case 'consecutiveRoundWinner':
      case 'roundWinChampion':
        // Count rounds won by user
        let roundWins = 0;
        let maxStreak = 0;
        let currentStreak = 0;
        
        if (game.rounds) {
          game.rounds.forEach(round => {
            if (round.winners && round.winners[user.id]) {
              roundWins++;
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          });
        }
        
        details.roundWins = roundWins;
        details.maxStreak = maxStreak;
        break;

      case 'strategist':
      case 'consistent':
        // Check if user reached finals
        if (game.rounds && game.rounds.length > 0) {
          const lastRound = game.rounds[game.rounds.length - 1];
          const userInLastRound = lastRound.scores && lastRound.scores[user.id] !== undefined;
          const userDropped = lastRound.drops && lastRound.drops[user.id];
          const userDoubleDropped = lastRound.doubleDrops && lastRound.doubleDrops[user.id];
          
          details.reachedFinal = userInLastRound && !userDropped && !userDoubleDropped;
          details.won = game.winner === user.id;
        }
        break;

      case 'finalHero':
        // User won the finals
        details.won = game.winner === user.id;
        if (game.rounds && game.rounds.length > 0) {
          const lastRound = game.rounds[game.rounds.length - 1];
          details.reachedFinal = lastRound.scores && lastRound.scores[user.id] !== undefined;
        }
        break;

      case 'warrior':
        // User reached finals but lost
        details.won = game.winner === user.id;
        if (game.rounds && game.rounds.length > 0) {
          const lastRound = game.rounds[game.rounds.length - 1];
          details.reachedFinal = lastRound.scores && lastRound.scores[user.id] !== undefined;
          details.lost = details.reachedFinal && !details.won;
        }
        break;

      case 'patientGuy':
        // Count drops
        let drops = 0;
        if (game.rounds) {
          game.rounds.forEach(round => {
            if ((round.drops && round.drops[user.id]) || 
                (round.doubleDrops && round.doubleDrops[user.id])) {
              drops++;
            }
          });
        }
        details.drops = drops;
        break;

      case 'eightyClub':
        // Count 80s
        let eightyCount = 0;
        if (game.rounds) {
          game.rounds.forEach(round => {
            if (round.scores && round.scores[user.id] === 80) {
              eightyCount++;
            }
          });
        }
        details.eightyCount = eightyCount;
        break;

      case 'consecutiveWinner':
        // Match win
        details.won = game.winner === user.id;
        break;

      case 'bravePlayer':
        // Count rounds played (not dropped)
        let roundsPlayed = 0;
        if (game.rounds) {
          game.rounds.forEach(round => {
            const scored = round.scores && round.scores[user.id] !== undefined;
            const dropped = round.drops && round.drops[user.id];
            const doubleDropped = round.doubleDrops && round.doubleDrops[user.id];
            
            if (scored && !dropped && !doubleDropped) {
              roundsPlayed++;
            }
          });
        }
        details.roundsPlayed = roundsPlayed;
        break;

      default:
        break;
    }

    return details;
  };

  if (authLoading || loading) {
    return (
      <div className={styles.statDetailsPage}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!statKey || !gameType || !statInfo) {
    return (
      <div className={styles.statDetailsPage}>
        <div className="container">
          <div className="card">
            <p>Invalid stat or game type</p>
            <button className="btn btn-primary" onClick={() => router.push('/stats')}>
              Back to Stats
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statDetailsPage}>
      <div className="container">
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => router.push('/stats')}
          >
            ← Back to Stats
          </button>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              {statInfo.icon} {statInfo.title}
            </h1>
            <p className={styles.subtitle}>
              {gameType} • {statInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className={styles.sectionTitle}>
            Games ({games.length})
          </h2>
          
          {games.length === 0 ? (
            <div className={styles.empty}>
              <p>No games found for this stat.</p>
            </div>
          ) : (
            <div className={styles.gamesGrid}>
              {games.map((game) => {
                const statDetails = getGameStatDetails(game);
                
                return (
                  <div 
                    key={game.id} 
                    className={styles.gameCard}
                    onClick={() => router.push(`/game/${game.id}`)}
                  >
                    <div className={styles.gameHeader}>
                      <h3 className={styles.gameTitle}>{game.title}</h3>
                      <span className={`badge ${
                        game.status === 'completed' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {game.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    
                    <div className={styles.gameDate}>
                      {formatDate(game.createdAt)}
                    </div>
                    
                    {/* Stat-specific details */}
                    {statDetails && (
                      <div className={styles.statDetails}>
                        {statDetails.roundWins !== undefined && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🏆</span>
                            <span className={styles.statDetailText}>
                              {statDetails.roundWins} round win{statDetails.roundWins !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {statDetails.maxStreak !== undefined && statDetails.maxStreak > 1 && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🔥</span>
                            <span className={styles.statDetailText}>
                              {statDetails.maxStreak} max streak
                            </span>
                          </div>
                        )}
                        
                        {statDetails.reachedFinal && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🎯</span>
                            <span className={styles.statDetailText}>
                              Reached Final{statDetails.won ? ' ✓ Won' : statDetails.lost ? ' ✗ Lost' : ''}
                            </span>
                          </div>
                        )}
                        
                        {statDetails.drops !== undefined && statDetails.drops > 0 && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🧘</span>
                            <span className={styles.statDetailText}>
                              {statDetails.drops} drop{statDetails.drops !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {statDetails.eightyCount !== undefined && statDetails.eightyCount > 0 && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>💥</span>
                            <span className={styles.statDetailText}>
                              {statDetails.eightyCount} × 80
                            </span>
                          </div>
                        )}
                        
                        {statDetails.roundsPlayed !== undefined && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🎮</span>
                            <span className={styles.statDetailText}>
                              {statDetails.roundsPlayed} round{statDetails.roundsPlayed !== 1 ? 's' : ''} played
                            </span>
                          </div>
                        )}
                        
                        {statDetails.won === true && !statDetails.reachedFinal && (
                          <div className={styles.statDetailBadge}>
                            <span className={styles.statDetailIcon}>🏆</span>
                            <span className={styles.statDetailText}>Won</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {game.status === 'completed' && (game.winner || (game.winners && game.winners.length > 0)) && (
                      <div className={styles.gameWinner}>
                        <span className={styles.winnerLabel}>
                          🏆 {game.winners && game.winners.length > 1 ? 'Winners:' : 'Winner:'}
                        </span>
                        <span className={styles.winnerName}>
                          {game.winners && game.winners.length > 1 
                            ? game.winners.map(id => game.players.find(p => p.id === id)?.name).join(', ')
                            : game.players.find(p => p.id === (game.winners?.[0] || game.winner))?.name
                          }
                        </span>
                      </div>
                    )}
                    
                    <div className={styles.gamePlayers}>
                      <div className={styles.playersLabel}>Players:</div>
                      <div className={styles.playersList}>
                        {game.players.slice(0, 4).map(player => (
                          <div key={player.id} className={styles.playerChip}>
                            {player.profilePhoto ? (
                              <img 
                                src={player.profilePhoto} 
                                alt={player.name}
                                className={styles.playerAvatar}
                              />
                            ) : (
                              <span className="avatar" style={{ fontSize: '14px' }}>
                                {player.avatar}
                              </span>
                            )}
                            <span>{player.name}</span>
                          </div>
                        ))}
                        {game.players.length > 4 && (
                          <span className={styles.morePlayerstext}>
                            +{game.players.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.viewDetails}>
                      View Game →
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatDetailsPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
          refresh
        </span>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading...</p>
      </div>
    }>
      <StatDetailsContent />
    </Suspense>
  );
}

