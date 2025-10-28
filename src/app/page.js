'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { createGame, sseConnected, initializeSSE } = useGame();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [gameType, setGameType] = useState('rummy');
  const [filterGameType, setFilterGameType] = useState('Rummy'); // Filter for top players
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [maxPoints, setMaxPoints] = useState(120);
  const [topPlayersCache, setTopPlayersCache] = useState({}); // Cache by game type
  const [recentMatchesCache, setRecentMatchesCache] = useState({}); // Cache by game type
  const [interestingStatsCache, setInterestingStatsCache] = useState({}); // Cache by game type
  const [statsLoading, setStatsLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  // Derived state based on current filter
  const topPlayers = topPlayersCache[filterGameType] || [];
  const recentMatches = recentMatchesCache[filterGameType] || [];
  const interestingStats = interestingStatsCache[filterGameType] || null;
  
  // State for in-progress games with profile photos
  const [inProgressGames, setInProgressGames] = useState([]);

  // Fetch data for home page (optimized - only what we need!)
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setStatsLoading(true);
    try {
      const gameTypes = ['Rummy', 'Chess', 'Ace'];
      
      // Fetch all data in parallel
      const statsPromises = gameTypes.map(type =>
        fetch(`/api/stats?gameType=${type}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ type, data }))
      );
      
      const matchesPromises = gameTypes.map(type =>
        fetch(`/api/recent-matches?gameType=${type}&limit=10&status=completed`)
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ type, data }))
      );
      
      const interestingStatsPromises = gameTypes.map(type =>
        fetch(`/api/interesting-stats?gameType=${type}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ type, data }))
      );
      
      const inProgressPromise = fetch(`/api/recent-matches?limit=100&status=in_progress`)
        .then(res => res.ok ? res.json() : null);
      
      // Wait for all requests
      const [statsResults, matchesResults, interestingStatsResults, inProgressData] = await Promise.all([
        Promise.all(statsPromises),
        Promise.all(matchesPromises),
        Promise.all(interestingStatsPromises),
        inProgressPromise
      ]);
      
      // Build cache objects
      const statsCache = {};
      const matchesCache = {};
      const interestingCache = {};
      
      statsResults.forEach(({ type, data }) => {
        if (data) {
          statsCache[type] = data.topPlayers;
        }
      });
      
      matchesResults.forEach(({ type, data }) => {
        if (data) {
          matchesCache[type] = data.matches;
        }
      });
      
      interestingStatsResults.forEach(({ type, data }) => {
        if (data) {
          interestingCache[type] = data;
        }
      });
      
      setTopPlayersCache(statsCache);
      setRecentMatchesCache(matchesCache);
      setInterestingStatsCache(interestingCache);
      
      if (inProgressData) {
        setInProgressGames(inProgressData.matches);
      }
    } catch (error) {
      console.error('[Home] Failed to fetch data:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  // Initialize SSE (lightweight - doesn't load all games)
  useEffect(() => {
    if (user && initializeSSE) {
      initializeSSE();
    }
  }, [user, initializeSSE]);

  // Fetch data on mount
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Listen to SSE messages via GameContext to refresh data
  useEffect(() => {
    if (!sseConnected) return;

    // Set up custom event listener for SSE updates
    const handleSSEUpdate = () => {
      fetchData();
    };

    window.addEventListener('game_updated', handleSSEUpdate);
    window.addEventListener('game_created', handleSSEUpdate);

    return () => {
      window.removeEventListener('game_updated', handleSSEUpdate);
      window.removeEventListener('game_created', handleSSEUpdate);
    };
  }, [sseConnected, fetchData]);

  // Enable pull-to-refresh
  usePullToRefresh(fetchData, { enabled: !authLoading && !!user });

  // Fetch players only when New Game modal is opened
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!showNewGameModal || players.length > 0) return;
      
      setPlayersLoading(true);
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
      } finally {
        setPlayersLoading(false);
      }
    };
    
    fetchPlayers();
  }, [showNewGameModal, players.length]);

  // Show loading state - AFTER all hooks
  if (authLoading) {
    return (
      <div className={styles.home}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated - AFTER all hooks
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleNewGame = () => {
    setShowNewGameModal(true);
  };

  const handlePlayerToggle = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateGame = async () => {
    console.log('[Home handleCreateGame] Starting game creation...');
    console.log('[Home handleCreateGame] User:', { id: user?.id, username: user?.username, role: user?.role });
    
    // Chess requires exactly 2 players
    if (gameType === 'chess') {
      if (selectedPlayers.length !== 2) {
        alert('Chess requires exactly 2 players');
        return;
      }
    } else {
      if (selectedPlayers.length < 2) {
        alert('Please select at least 2 players');
        return;
      }
    }

    // Validate user is logged in
    if (!user || !user.id) {
      console.error('[Home handleCreateGame] No user logged in');
      alert('You must be logged in to create a game');
      return;
    }

    console.log('[Home handleCreateGame] Calling createGame with userId:', user.id);

    setCreatingGame(true);
    
    try {
      // Chess and Ace games don't have max points
      const points = (gameType === 'chess' || gameType === 'ace') ? null : parseInt(maxPoints);
      
      console.log('[Home handleCreateGame] Creating game with:', {
        gameType,
        selectedPlayers,
        points,
        playerCount: players.length
      });
      
      const game = await createGame(gameType, selectedPlayers, points, players, user.id);
      
      if (!game || !game.id) {
        throw new Error('Game creation failed - no game object returned');
      }
      
      console.log('[Home handleCreateGame] Game created successfully:', game.id);
      
      // Reset form state
      setSelectedPlayers([]);
      setGameType('rummy');
      setMaxPoints(120);
      
      // Close modal
      setShowNewGameModal(false);
      
      // Small delay to ensure modal closes before navigation
      setTimeout(() => {
        router.push(`/game/${game.id}`);
      }, 100);
    } catch (error) {
      console.error('[Home handleCreateGame] Failed to create game:', error);
      alert('Failed to create game: ' + error.message);
    } finally {
      setCreatingGame(false);
    }
  };

  return (
    <div className={styles.home}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🏆 Dashboard</h1>
            <p className={styles.subtitle}>
              Track your card game champions
              {sseConnected && (
                <span style={{
                  marginLeft: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#22c55e',
                  fontWeight: '600'
                }}>
                  <span style={{ 
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    animation: 'livePulse 1.5s ease-in-out infinite'
                  }}></span>
                  LIVE
                </span>
              )}
            </p>
          </div>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={handleNewGame} style={{ color: 'white' }}>
              <span style={{ filter: 'brightness(0) invert(1)' }}>➕</span> New Game
            </button>
          )}
        </div>

        {/* In-Progress Games Section */}
        {inProgressGames.length > 0 && (
          <div className="card">
            <h2 className={styles.sectionTitle}>
              Games in Progress
              <span style={{
                marginLeft: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.9); }
                  }
                `}} />
                <span style={{ 
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  animation: 'livePulse 1.5s ease-in-out infinite',
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                }}></span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#22c55e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Live
                </span>
              </span>
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Game Type</th>
                    <th style={{ textAlign: 'center' }}>Players</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inProgressGames.map((game) => (
                    <tr key={game.id}>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{game.type}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {game.players.map((p, index) => (
                            p.profilePhoto ? (
                              <img 
                                key={p.id}
                                src={p.profilePhoto} 
                                alt={p.name}
                                className={styles.playerAvatar}
                                style={{
                                  marginLeft: index > 0 ? '-10px' : '0',
                                  zIndex: game.players.length - index,
                                  border: '2px solid var(--bg-color)',
                                  borderRadius: '50%'
                                }}
                              />
                            ) : (
                              <span 
                                key={p.id} 
                                className="avatar" 
                                style={{ 
                                  fontSize: '16px',
                                  marginLeft: index > 0 ? '4px' : '0'
                                }}
                              >
                                {p.avatar}
                              </span>
                            )
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => router.push(`/game/${game.id}`)}
                          style={{ padding: '4px 12px', fontSize: '14px' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className={styles.sectionTitle}>Top 10 Players</h2>
          
          {/* Game Type Tabs */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tab} ${filterGameType === 'Rummy' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Rummy')}
            >
              Rummy
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Chess' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Chess')}
            >
              Chess
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Ace' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Ace')}
            >
              Ace
            </button>
          </div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                refresh
              </span>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading {filterGameType} stats...</p>
            </div>
          ) : topPlayers.length === 0 ? (
            <div className={styles.empty}>
              <p>No {filterGameType} games played yet!</p>
              {isAdmin() && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleNewGame}
                >
                  Start a Game
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th style={{ textAlign: 'center' }}>Player</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    {filterGameType === 'Rummy' && <th style={{ textAlign: 'center' }}>Finals</th>}
                    {filterGameType === 'Chess' && <th style={{ textAlign: 'center' }}>Draws</th>}
                    <th style={{ textAlign: 'center' }}>Wins</th>
                    <th style={{ textAlign: 'center' }}>Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player, index) => (
                    <tr 
                      key={player.id}
                      onClick={() => router.push(`/profile?userId=${player.id}`)}
                      style={{ cursor: 'pointer' }}
                      className={styles.clickableRow}
                      title="View profile"
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.rank}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index === 3 && '💰'}
                          {index === 4 && '🎁'}
                          {index === 5 && '⭐'}
                          {index === 6 && '🌟'}
                          {index === 7 && '✨'}
                          {index === 8 && '💫'}
                          {index === 9 && '🏅'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.playerCell}>
                          {player.profilePhoto ? (
                            <img 
                              src={player.profilePhoto} 
                              alt={player.name}
                              className={styles.playerAvatar}
                            />
                          ) : (
                            <span>{player.name}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{player.totalGames}</td>
                      {filterGameType === 'Rummy' && <td style={{ textAlign: 'center' }}>{player.finals || 0}</td>}
                      {filterGameType === 'Chess' && <td style={{ textAlign: 'center' }}>{player.draws || 0}</td>}
                      <td style={{ textAlign: 'center' }}><strong>{player.wins}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          player.winPercentage > 30 ? 'badge-success' : 
                          player.winPercentage >= 15 ? 'badge-warning' : 
                          'badge-danger'
                        }`}>
                          {player.winPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Interesting Statistics Section */}
        {interestingStats && interestingStats.stats && Object.keys(interestingStats.stats).length > 0 && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2 className={styles.sectionTitle}>🏆 Interesting Statistics - {filterGameType}</h2>
            <div className={styles.interestingStatsGrid}>
              {interestingStats.stats.patientGuy && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.patientGuy.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🧘</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Patient Guy</div>
                    <div className={styles.badgeSubtitle}>Most Drops</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.patientGuy.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.patientGuy.player.profilePhoto} 
                          alt={interestingStats.stats.patientGuy.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.patientGuy.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.patientGuy.value} drops</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.strategist && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.strategist.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>♟️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Strategist</div>
                    <div className={styles.badgeSubtitle}>Most Finals Reached</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.strategist.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.strategist.player.profilePhoto} 
                          alt={interestingStats.stats.strategist.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.strategist.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.strategist.value} finals</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.finalHero && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.finalHero.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🎖️</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Final Hero</div>
                    <div className={styles.badgeSubtitle}>Most Final Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.finalHero.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.finalHero.player.profilePhoto} 
                          alt={interestingStats.stats.finalHero.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.finalHero.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.finalHero.value} final wins</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.consecutiveWinner.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>🔥</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>On Fire!</div>
                    <div className={styles.badgeSubtitle}>Most Consecutive Match Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.consecutiveWinner.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.consecutiveWinner.player.profilePhoto} 
                          alt={interestingStats.stats.consecutiveWinner.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.consecutiveWinner.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.consecutiveWinner.value} match streak</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.consecutiveRoundWinner && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => {
                    // Link to game if available, otherwise to profile
                    const gameId = interestingStats.stats.consecutiveRoundWinner.gameId;
                    if (gameId) {
                      router.push(`/game/${gameId}`);
                    } else {
                      router.push(`/profile?userId=${interestingStats.stats.consecutiveRoundWinner.player.id}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>⚡</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Round Dominator</div>
                    <div className={styles.badgeSubtitle}>Most Consecutive Round Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.consecutiveRoundWinner.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.consecutiveRoundWinner.player.profilePhoto} 
                          alt={interestingStats.stats.consecutiveRoundWinner.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.consecutiveRoundWinner.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.consecutiveRoundWinner.value} round streak</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.eightyClub && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.eightyClub.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>💥</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>80 Club</div>
                    <div className={styles.badgeSubtitle}>Most 80s</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.eightyClub.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.eightyClub.player.profilePhoto} 
                          alt={interestingStats.stats.eightyClub.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.eightyClub.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.eightyClub.value} times</div>
                  </div>
                </div>
              )}

              {interestingStats.stats.roundWinChampion && (
                <div 
                  className={`${styles.statBadge} ${styles.clickableBadge}`}
                  onClick={() => router.push(`/profile?userId=${interestingStats.stats.roundWinChampion.player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.badgeIcon}>👑</div>
                  <div className={styles.badgeContent}>
                    <div className={styles.badgeTitle}>Round Win Champion</div>
                    <div className={styles.badgeSubtitle}>Most Round Wins</div>
                    <div className={styles.badgeName}>
                      {interestingStats.stats.roundWinChampion.player.profilePhoto ? (
                        <img 
                          src={interestingStats.stats.roundWinChampion.player.profilePhoto} 
                          alt={interestingStats.stats.roundWinChampion.player.name}
                          className={styles.badgeAvatar}
                        />
                      ) : null}
                      {interestingStats.stats.roundWinChampion.player.name}
                    </div>
                    <div className={styles.badgeValue}>{interestingStats.stats.roundWinChampion.value} round wins</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Matches Section */}
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 className={styles.sectionTitle}>Last 10 Completed {filterGameType} Matches</h2>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                refresh
              </span>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading matches...</p>
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="table-container">
              <table className={styles.recentMatchesTable}>
                <thead>
                  <tr>
                    <th className={styles.hideOnMobile} style={{ textAlign: 'center' }}>Game</th>
                    <th className={styles.hideOnMobile} style={{ textAlign: 'center' }}>Date</th>
                    {filterGameType === 'Chess' ? (
                      <>
                        <th style={{ textAlign: 'center' }}>Winner</th>
                        <th style={{ textAlign: 'center' }}>Opponent</th>
                      </>
                    ) : (
                      <>
                    <th className={styles.hideOnMobile} style={{ textAlign: 'center' }}>Players</th>
                    <th style={{ textAlign: 'center' }}>Winner</th>
                        {filterGameType === 'Rummy' && <th style={{ textAlign: 'center' }}>Runner</th>}
                        <th style={{ textAlign: 'center' }}>Rounds</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((game) => (
                    <tr 
                      key={game.id}
                      onClick={() => router.push(`/game/${game.id}`)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className={styles.hideOnMobile} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <strong>{game.title}</strong>
                          {game.players.length === 2 && (
                            <span 
                              title="Head-to-Head Match"
                              style={{ 
                                fontSize: '16px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              🤺
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.hideOnMobile} style={{ textAlign: 'center' }}>
                        {new Date(game.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      {filterGameType === 'Chess' ? (
                        <>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {game.winner ? (() => {
                                const winner = game.players.find(p => p.id === game.winner);
                                return winner?.profilePhoto ? (
                                  <img 
                                    src={winner.profilePhoto} 
                                    alt={winner.name}
                                    className={styles.playerAvatar}
                                    title={winner.name}
                                  />
                                ) : (
                                  <span>{winner?.name}</span>
                                );
                              })() : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              )}
                              {game.players.length === 2 && (
                                <span 
                                  title="Head-to-Head Match"
                                  style={{ 
                                    fontSize: '14px',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  🤺
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {(() => {
                              // For Chess, show the opponent (non-winner player)
                              const opponent = game.winner 
                                ? game.players.find(p => p.id !== game.winner)
                                : game.players[1]; // If no winner, show second player
                              
                              if (!opponent) {
                                return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
                              }
                              
                              return opponent.profilePhoto ? (
                                <img 
                                  src={opponent.profilePhoto} 
                                  alt={opponent.name}
                                  className={styles.playerAvatar}
                                />
                              ) : (
                                <span>{opponent.name}</span>
                              );
                            })()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={styles.hideOnMobile} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {game.players.slice(0, 3).map(p => (
                            p.profilePhoto ? (
                              <img 
                                key={p.id}
                                src={p.profilePhoto} 
                                alt={p.name}
                                className={styles.playerAvatarSmall}
                              />
                            ) : (
                              <span key={p.id} className="avatar" style={{ fontSize: '16px' }}>
                                {p.avatar}
                              </span>
                            )
                          ))}
                          {game.players.length > 3 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              +{game.players.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {game.winner ? (() => {
                            const winner = game.players.find(p => p.id === game.winner);
                            return winner?.profilePhoto ? (
                              <img 
                                src={winner.profilePhoto} 
                                alt={winner.name}
                                className={styles.playerAvatar}
                              />
                            ) : (
                              <span>{winner?.name}</span>
                            );
                          })() : (
                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          )}
                          {game.players.length === 2 && (
                            <span 
                              title="Head-to-Head Match"
                              className={styles.showOnMobile}
                              style={{ 
                                fontSize: '14px',
                                alignItems: 'center'
                              }}
                            >
                              🤺
                            </span>
                          )}
                        </div>
                      </td>
                      {filterGameType === 'Rummy' && (
                            <td style={{ textAlign: 'center' }}>
                          {(() => {
                            const runners = game.runners || [];
                            if (runners.length === 0) {
                              return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
                            }
                            
                            return (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {runners.map((runner, index) => (
                                  runner.profilePhoto ? (
                                    <img 
                                      key={runner.id}
                                      src={runner.profilePhoto} 
                                      alt={runner.name}
                                          className={styles.playerAvatar}
                                          style={{
                                            marginLeft: index > 0 ? '-10px' : '0',
                                            zIndex: runners.length - index,
                                            border: '2px solid var(--bg-color)',
                                            borderRadius: '50%'
                                          }}
                                    />
                                  ) : (
                                        <span 
                                          key={runner.id} 
                                          style={{ 
                                            fontSize: '14px',
                                            marginLeft: index > 0 ? '4px' : '0'
                                          }}
                                        >
                                      {runner.name}
                                    </span>
                                  )
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      <td style={{ textAlign: 'center' }}>
                        {game.roundsCount || 0}
                      </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No {filterGameType} matches played yet!</p>
              {isAdmin() && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleNewGame}
                >
                  Start a Game
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showNewGameModal && (
        <div className="modal-overlay" onClick={() => setShowNewGameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Game</h2>
            
            <div className="form-group">
              <label>Game Type</label>
              <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
                <option value="rummy">Rummy</option>
                <option value="ace">Ace</option>
                <option value="chess">Chess</option>
              </select>
            </div>

            {gameType !== 'chess' && gameType !== 'ace' && (
              <div className="form-group">
                <label>Max Points (Default: 120)</label>
                <input 
                  type="number" 
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  min="50"
                  max="500"
                />
              </div>
            )}

            <div className="form-group">
              <label>
                Select Players {gameType === 'chess' ? '(exactly 2)' : '(minimum 2)'}
              </label>
              {playersLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span className="material-icons" style={{ fontSize: '48px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
                    refresh
                  </span>
                  <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading players...</p>
                </div>
              ) : players.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No players found. Please add users first.</p>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowNewGameModal(false);
                      router.push('/users');
                    }}
                    style={{ marginTop: '16px' }}
                  >
                    Go to Users
                  </button>
                </div>
              ) : (
              <div className={styles.playerList}>
                {players.map(player => (
                  <div 
                    key={player.id}
                    className={`${styles.playerItem} ${
                      selectedPlayers.includes(player.id) ? styles.selected : ''
                    } ${
                      gameType === 'chess' && selectedPlayers.length >= 2 && !selectedPlayers.includes(player.id) ? styles.disabled : ''
                    }`}
                    onClick={() => {
                      // For chess, prevent selecting more than 2 players
                      if (gameType === 'chess' && selectedPlayers.length >= 2 && !selectedPlayers.includes(player.id)) {
                        return;
                      }
                      handlePlayerToggle(player.id);
                    }}
                  >
                    {player.profilePhoto ? (
                      <img 
                        src={player.profilePhoto} 
                        alt={player.name}
                        className={styles.playerAvatar}
                      />
                    ) : (
                      <span className="avatar">{player.avatar}</span>
                    )}
                    <span>{player.name}</span>
                    {selectedPlayers.includes(player.id) && <span>✓</span>}
                  </div>
                ))}
              </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowNewGameModal(false);
                  // Reset form when canceling
                  setSelectedPlayers([]);
                  setGameType('rummy');
                  setMaxPoints(120);
                }}
                disabled={creatingGame}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleCreateGame}
                disabled={
                  creatingGame ||
                  (gameType === 'chess' 
                    ? selectedPlayers.length !== 2 
                    : selectedPlayers.length < 2)
                }
              >
                {creatingGame ? 'Creating...' : 'Start Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

