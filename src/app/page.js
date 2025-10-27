'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { createGame } = useGame();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [gameType, setGameType] = useState('rummy');
  const [filterGameType, setFilterGameType] = useState('Rummy'); // Filter for top players
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [maxPoints, setMaxPoints] = useState(120);
  const [topPlayers, setTopPlayers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [inProgressGames, setInProgressGames] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  // Fetch data function that can be reused
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setStatsLoading(true);
      try {
        // Fetch top players stats
        const statsResponse = await fetch(`/api/stats?gameType=${filterGameType}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setTopPlayers(statsData.topPlayers);
        }
        
        // Fetch recent completed matches (30)
        const matchesResponse = await fetch(`/api/recent-matches?gameType=${filterGameType}&limit=30&status=completed`);
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setRecentMatches(matchesData.matches);
        }
        
        // Fetch in-progress games (all game types)
        const inProgressResponse = await fetch(`/api/recent-matches?limit=100&status=in_progress`);
        if (inProgressResponse.ok) {
          const inProgressData = await inProgressResponse.json();
          setInProgressGames(inProgressData.matches);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setStatsLoading(false);
      }
  }, [filterGameType, user]);

  // Fetch data when filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Loading...</p>
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

    // Chess and Ace games don't have max points
    const points = (gameType === 'chess' || gameType === 'ace') ? null : parseInt(maxPoints);
    const game = await createGame(gameType, selectedPlayers, points, players, user?.id);
    setShowNewGameModal(false);
    router.push(`/game/${game.id}`);
  };

  return (
    <div className={styles.home}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🏆 Dashboard</h1>
            <p className={styles.subtitle}>Track your card game champions</p>
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
          <h2 className={styles.sectionTitle}>Top 5 Players</h2>
          
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
              <div className="spinner"></div>
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
                    <tr key={player.id}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.rank}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index === 3 && '💰'}
                          {index === 4 && '🎁'}
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
                          player.winPercentage >= 50 ? 'badge-success' : 
                          player.winPercentage >= 30 ? 'badge-warning' : 
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
          <h2 className={styles.sectionTitle}>Last 30 Completed {filterGameType} Matches</h2>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="spinner"></div>
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
                        <strong>{game.title}</strong>
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
                            {game.winner ? (() => {
                              const winner = game.players.find(p => p.id === game.winner);
                              return winner?.profilePhoto ? (
                                <img 
                                  src={winner.profilePhoto} 
                                  alt={winner.name}
                                  className={styles.playerAvatar}
                                  title={player1.name}
                                />
                              ) : (
                                <span>{winner?.name}</span>
                              );
                            })() : (
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
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
                  <div className="spinner"></div>
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
                onClick={() => setShowNewGameModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleCreateGame}
                disabled={
                  gameType === 'chess' 
                    ? selectedPlayers.length !== 2 
                    : selectedPlayers.length < 2
                }
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

