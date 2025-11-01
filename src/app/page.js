'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
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
  const [topPlayers, setTopPlayers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [showWprInfo, setShowWprInfo] = useState(false);
  const [momentumPlayer, setMomentumPlayer] = useState(null);
  const [momentumLoading, setMomentumLoading] = useState(false);
  
  // State for in-progress games with profile photos
  const [inProgressGames, setInProgressGames] = useState([]);

  // Fetch in-progress games
  const fetchInProgressGames = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/recent-matches?limit=100&status=in_progress`);
      if (response.ok) {
        const data = await response.json();
        setInProgressGames(data.matches || []);
      }
    } catch (error) {
      console.error('[Home] Failed to fetch in-progress games:', error);
    }
  }, [user]);

  // Fetch data for selected game type (lazy load)
  const fetchGameTypeData = useCallback(async () => {
    if (!user) return;
    
    setStatsLoading(true);
    setMomentumLoading(true);
    try {
      // Fetch stats, matches, and momentum player for the selected game type
      const [statsResponse, matchesResponse, momentumResponse] = await Promise.all([
        fetch(`/api/stats?gameType=${filterGameType}`),
        fetch(`/api/recent-matches?gameType=${filterGameType}&limit=10&status=completed`),
        fetch(`/api/momentum-player?gameType=${filterGameType}`)
      ]);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTopPlayers(statsData.topPlayers || []);
      }
      
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setRecentMatches(matchesData.matches || []);
      }
      
      if (momentumResponse.ok) {
        const momentumData = await momentumResponse.json();
        setMomentumPlayer(momentumData.momentumPlayer);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setStatsLoading(false);
      setMomentumLoading(false);
    }
  }, [user, filterGameType]);

  // Initialize SSE (lightweight - doesn't load all games)
  useEffect(() => {
    if (user && initializeSSE) {
      initializeSSE();
    }
  }, [user, initializeSSE]);

  // Fetch in-progress games on mount
  useEffect(() => {
    if (user) {
      fetchInProgressGames();
    }
  }, [user, fetchInProgressGames]);

  // Fetch data for selected game type
  useEffect(() => {
    if (user) {
      fetchGameTypeData();
    }
  }, [user, filterGameType, fetchGameTypeData]);

  // Listen to SSE messages via GameContext to refresh data
  useEffect(() => {
    if (!sseConnected) return;

    // Set up custom event listener for SSE updates
    const handleSSEUpdate = () => {
      fetchInProgressGames();
      fetchGameTypeData();
    };

    window.addEventListener('game_updated', handleSSEUpdate);
    window.addEventListener('game_created', handleSSEUpdate);

    return () => {
      window.removeEventListener('game_updated', handleSSEUpdate);
      window.removeEventListener('game_created', handleSSEUpdate);
    };
  }, [sseConnected, fetchInProgressGames, fetchGameTypeData]);

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

  const generateGameTitle = async () => {
    // Get current date
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    
    try {
      // Fetch all games to count today's games
      const response = await fetch('/api/games');
      if (response.ok) {
        const allGames = await response.json();
        
        // Get today's start time (midnight)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        // Count ALL games created today (in-progress + completed)
        const todayGamesCount = allGames.filter(game => {
          const gameDate = new Date(game.createdAt).getTime();
          return gameDate >= todayStart;
        }).length;
        
        // Generate title: "28 Oct - Game 1"
        return `${day} ${month} - Game ${todayGamesCount + 1}`;
      }
    } catch (error) {
      console.error('Failed to fetch games for title generation:', error);
    }
    
    // Fallback: count only in-progress games if API fails
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayGamesCount = inProgressGames.filter(game => {
      const gameDate = new Date(game.createdAt).getTime();
      return gameDate >= todayStart;
    }).length;
    
    return `${day} ${month} - Game ${todayGamesCount + 1}`;
  };

  const handleCreateGame = async () => {
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
      alert('You must be logged in to create a game');
      return;
    }

    setCreatingGame(true);
    
    try {
      // Generate game title automatically
      const gameTitle = await generateGameTitle();
      
      // Chess and Ace games don't have max points
      const points = (gameType === 'chess' || gameType === 'ace') ? null : parseInt(maxPoints);
      
      const game = await createGame(gameType, selectedPlayers, points, players, user.id, gameTitle);
      
      if (!game || !game.id) {
        throw new Error('Game creation failed - no game object returned');
      }
      
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
      console.error('Failed to create game:', error);
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
            <h1 className={styles.title}>🏆 Home</h1>
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
                  </tr>
                </thead>
                <tbody>
                  {inProgressGames.map((game) => (
                    <tr 
                      key={game.id}
                      onClick={() => router.push(`/game/${game.id}`)}
                      style={{ cursor: 'pointer' }}
                      className={styles.clickableRow}
                      title="Open game"
                    >
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
                                title={p.name}
                              />
                            ) : (
                              <span 
                                key={p.id} 
                                className="avatar" 
                                style={{ 
                                  fontSize: '16px',
                                  marginLeft: index > 0 ? '-8px' : '0',
                                  zIndex: game.players.length - index,
                                  border: '2px solid var(--bg-color)',
                                  borderRadius: '50%',
                                  display: 'inline-block'
                                }}
                                title={p.name}
                              >
                                {p.avatar}
                              </span>
                            )
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Momentum Player Section - Compact */}
        {!momentumLoading && momentumPlayer && (
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)', 
            border: '1px solid #fb923c',
            padding: '1.5rem',
            marginTop: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Player Photo/Avatar - Smaller */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {momentumPlayer.profilePhoto ? (
                  <img 
                    src={momentumPlayer.profilePhoto} 
                    alt={momentumPlayer.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      border: '2px solid #fb923c',
                      objectFit: 'cover',
                      boxShadow: '0 2px 8px rgba(251, 146, 60, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '2px solid #fb923c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '30px',
                    background: 'var(--card-bg)',
                    boxShadow: '0 2px 8px rgba(251, 146, 60, 0.3)'
                  }}>
                    👤
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                  borderRadius: '50%',
                  padding: '4px',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  lineHeight: 1
                }}>
                  🔥
                </div>
              </div>
              
              {/* Player Info - Compact */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold', 
                    color: '#fb923c',
                    margin: 0
                  }}>
                    {momentumPlayer.name}
                  </h3>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    Player with Winning Momentum
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Based on last 10 {filterGameType} games
                </div>
              </div>
              
              {/* Compact Stats */}
              <div style={{ 
                display: 'flex', 
                gap: '1.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
                    {momentumPlayer.wins}/{momentumPlayer.gamesPlayed}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Wins
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {momentumPlayer.winRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Win Rate
                  </div>
                </div>
                
                {filterGameType === 'Rummy' && momentumPlayer.finals !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#a855f7' }}>
                      {momentumPlayer.finals}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Finals
                    </div>
                  </div>
                )}
                
                {/* Momentum Score Badge - Very Subtle */}
                <div style={{ 
                  padding: '0.6rem 1.2rem',
                  background: 'rgba(251, 146, 60, 0.08)',
                  border: '1px solid rgba(251, 146, 60, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                    Score
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', lineHeight: 1, color: '#fb923c' }}>
                    {momentumPlayer.momentumScore}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className={styles.sectionTitle}>Top 10 Players by Rating</h2>
          
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
                    <th style={{ textAlign: 'center', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span>Rating</span>
                        <button
                          onClick={() => setShowWprInfo(!showWprInfo)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--primary)',
                            fontSize: '16px'
                          }}
                          title="How is rating calculated?"
                        >
                          ℹ️
                        </button>
                      </div>
                    </th>
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
                          player.wpr >= 60 ? 'badge-success' : 
                          player.wpr >= 50 ? 'badge-success' : 
                          player.wpr >= 30 ? 'badge-warning' : 
                          'badge-danger'
                        }`} style={{
                          background: player.wpr >= 60 ? '#22c55e' : 
                                     player.wpr >= 50 ? '#86efac' : 
                                     player.wpr >= 30 ? '#fb923c' :
                                     undefined,
                          color: player.wpr >= 60 ? '#ffffff' : 
                                 player.wpr >= 50 ? '#065f46' :
                                 player.wpr >= 30 ? '#7c2d12' :
                                 undefined
                        }}>
                          {player.wpr || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Matches Section */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '0' }}>📋 Last 10 Completed {filterGameType} Matches</h2>
            {filterGameType === 'Rummy' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#22c55e', fontWeight: '600' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '3px solid #22c55e', boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)' }}></div>
                <span>Runner-up highlighted</span>
              </div>
            )}
          </div>
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
                        <th style={{ textAlign: 'center' }}>Winner</th>
                        <th style={{ textAlign: 'center' }}>
                          Players
                        </th>
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
                          {/* Winner Column - Support multiple winners for Ace */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {game.winners && game.winners.length > 0 ? (
                                game.winners.length > 1 ? (
                                  // Multiple winners (Ace games) - Horizontally overlapped
                                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    {game.winners.map((winnerId, index) => {
                                      const winner = game.players.find(p => p.id === winnerId);
                                      return winner?.profilePhoto ? (
                                        <img 
                                          key={winnerId}
                                          src={winner.profilePhoto} 
                                          alt={winner.name}
                                          className={styles.playerAvatar}
                                          title={winner.name}
                                          style={{ 
                                            marginLeft: index > 0 ? '-16px' : '0',
                                            border: '3px solid var(--bg-primary)',
                                            zIndex: game.winners.length - index,
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                          }}
                                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1) translateY(-2px)'}
                                          onMouseLeave={(e) => e.target.style.transform = 'scale(1) translateY(0)'}
                                        />
                                      ) : (
                                        <span 
                                          key={winnerId} 
                                          className="avatar" 
                                          title={winner?.name}
                                          style={{ 
                                            fontSize: '20px',
                                            marginLeft: index > 0 ? '-8px' : '0',
                                            border: '2px solid var(--bg-primary)',
                                            borderRadius: '50%',
                                            padding: '4px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            zIndex: game.winners.length - index
                                          }}
                                        >
                                          {winner?.avatar}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  // Single winner
                                  (() => {
                                    const winner = game.players.find(p => p.id === game.winners[0]);
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
                                  })()
                                )
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>Draw</span>
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
                          {/* Players Column - Non-winners with runners highlighted and sorted first */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                              {game.players
                                .filter(p => !(game.winners && game.winners.includes(p.id))) // Exclude all winners from this column
                                .sort((a, b) => {
                                  // Sort runners first
                                  const aIsRunner = filterGameType === 'Rummy' && game.runners?.some(r => r.id === a.id);
                                  const bIsRunner = filterGameType === 'Rummy' && game.runners?.some(r => r.id === b.id);
                                  if (aIsRunner && !bIsRunner) return -1;
                                  if (!aIsRunner && bIsRunner) return 1;
                                  return 0;
                                })
                                .map((p, index) => {
                                  const isRunner = filterGameType === 'Rummy' && game.runners?.some(r => r.id === p.id);
                                  
                                  return p.profilePhoto ? (
                                    <img 
                                      key={p.id}
                                      src={p.profilePhoto} 
                                      alt={p.name}
                                      title={`${p.name}${isRunner ? ' (Runner-up)' : ''}`}
                                      className={styles.playerAvatarSmall}
                                      style={{
                                        border: isRunner ? '3px solid #22c55e' : '2px solid var(--border)',
                                        borderRadius: '50%',
                                        boxShadow: isRunner ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none'
                                      }}
                                    />
                                  ) : (
                                    <span 
                                      key={p.id} 
                                      className="avatar" 
                                      title={`${p.name}${isRunner ? ' (Runner-up)' : ''}`}
                                      style={{ 
                                        fontSize: '18px',
                                        border: isRunner ? '3px solid #22c55e' : 'none',
                                        borderRadius: '50%',
                                        padding: isRunner ? '4px' : '0',
                                        boxShadow: isRunner ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none'
                                      }}
                                    >
                                      {p.avatar}
                                    </span>
                                  );
                                })}
                            </div>
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

      {/* WPR Info Modal */}
      {showWprInfo && (
        <div className="modal-overlay" onClick={() => setShowWprInfo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🎯 Player Rating System</h2>
              <button
                onClick={() => setShowWprInfo(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Player ratings are calculated differently based on game type:
              </p>
              
              {/* Rummy Rating */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '16px', 
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <strong style={{ fontSize: '16px' }}>🃏 Rummy - Weighted Performance Rating (WPR)</strong><br/>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', marginTop: '8px' }}>
                    Rating = (Wins × 100 + Finals × 25 + Brave Bonus + Round Wins × 2) / Total Games
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '20px' }}>🏆</span>
                  <div style={{ flex: 1 }}>
                    <strong>Wins × 100</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Winning a game is the most valuable achievement
                    </p>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '20px' }}>🎖️</span>
                  <div style={{ flex: 1 }}>
                    <strong>Finals × 25</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Reaching the final round shows consistency
                    </p>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '20px' }}>🦁</span>
                  <div style={{ flex: 1 }}>
                    <strong>Brave Bonus: (1 - Drop%) × 50</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Rewards players who play more hands instead of dropping
                    </p>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <strong>Round Wins × 2</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Winning individual rounds (0 points) shows skill
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: 'rgba(99, 102, 241, 0.1)', 
                borderRadius: '8px',
                borderLeft: '4px solid var(--primary)'
              }}>
                <strong style={{ color: 'var(--primary)' }}>Rating Scale:</strong>
                <div style={{ marginTop: '8px', fontSize: '14px', lineHeight: '1.6' }}>
                  <div>🔥 <strong>60+</strong> - Strong Green (Elite)</div>
                  <div>🌟 <strong>50-59</strong> - Light Green (Very Good)</div>
                  <div>🟠 <strong>30-49</strong> - Orange (Good)</div>
                  <div>🔴 <strong>&lt;30</strong> - Red (Developing)</div>
                </div>
              </div>
              
              {/* Chess and Ace Ratings */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '16px', 
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <strong style={{ fontSize: '16px' }}>♟️ Chess - Win-Based Rating</strong><br/>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', marginTop: '8px' }}>
                    Rating = (Wins × 100 + Draws × 50) / Total Games
                  </div>
                </div>
                
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <strong style={{ fontSize: '16px' }}>🎯 Ace - Simple Win Rate</strong><br/>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', marginTop: '8px' }}>
                    Rating = (Wins × 100) / Total Games
                  </div>
                </div>
              </div>
              
              <p style={{ 
                marginTop: '16px', 
                fontSize: '13px', 
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                * Higher rating means better performance. Rummy uses a comprehensive formula that rewards wins, consistency, bravery, and skill. Chess and Ace use simpler win-based calculations.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowWprInfo(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewGameModal && (
        <div className="modal-overlay" onClick={() => setShowNewGameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Game</h2>
            
            <div className="form-group">
              <label>Game Type</label>
              <div className={styles.tabsContainer}>
                <button 
                  className={`${styles.tab} ${gameType === 'rummy' ? styles.tabActive : ''}`}
                  onClick={() => setGameType('rummy')}
                  type="button"
                >
                  🃏 Rummy
                </button>
                <button 
                  className={`${styles.tab} ${gameType === 'ace' ? styles.tabActive : ''}`}
                  onClick={() => setGameType('ace')}
                  type="button"
                >
                  🎯 Ace
                </button>
                <button 
                  className={`${styles.tab} ${gameType === 'chess' ? styles.tabActive : ''}`}
                  onClick={() => setGameType('chess')}
                  type="button"
                >
                  ♟️ Chess
                </button>
              </div>
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

