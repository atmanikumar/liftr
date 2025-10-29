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
    try {
      // Fetch stats and matches for the selected game type only
      const [statsResponse, matchesResponse] = await Promise.all([
        fetch(`/api/stats?gameType=${filterGameType}`),
        fetch(`/api/recent-matches?gameType=${filterGameType}&limit=10&status=completed`)
      ]);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTopPlayers(statsData.topPlayers || []);
      }
      
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setRecentMatches(matchesData.matches || []);
      }
    } catch (error) {
      console.error('[Home] Failed to fetch game type data:', error);
    } finally {
      setStatsLoading(false);
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
      // Generate game title automatically
      const gameTitle = await generateGameTitle();
      
      // Chess and Ace games don't have max points
      const points = (gameType === 'chess' || gameType === 'ace') ? null : parseInt(maxPoints);
      
      console.log('[Home handleCreateGame] Creating game with:', {
        gameType,
        selectedPlayers,
        points,
        playerCount: players.length,
        title: gameTitle
      });
      
      const game = await createGame(gameType, selectedPlayers, points, players, user.id, gameTitle);
      
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
                          {/* Winner Column */}
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
                                .filter(p => p.id !== game.winner) // Exclude winner from this column
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

