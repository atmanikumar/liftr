'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { players, games, createGame, getPlayerStats, loading: gameLoading } = useGame();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [gameType, setGameType] = useState('rummy');
  const [filterGameType, setFilterGameType] = useState('Rummy'); // Filter for top players
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [maxPoints, setMaxPoints] = useState(120);

  // Helper function to get profile photo for a player
  // Players data already has profilePhoto merged from users table via API
  const getPlayerProfilePhoto = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.profilePhoto || null;
  };

  // Memoize top players calculation to prevent blocking navigation
  // MUST be before conditional returns to follow Rules of Hooks
  const topPlayers = useMemo(() => {
    // Filter games by type (case-insensitive to handle both old and new games)
    const filteredGames = games.filter(game => 
      game.type.toLowerCase() === filterGameType.toLowerCase() && 
      game.status === 'completed'
    );
    
    // Calculate stats for each player in filtered games
    const playerStatsMap = {};
    
    filteredGames.forEach(game => {
      game.players.forEach(gamePlayer => {
        if (!playerStatsMap[gamePlayer.id]) {
          const player = players.find(p => p.id === gamePlayer.id);
          playerStatsMap[gamePlayer.id] = {
            id: gamePlayer.id,
            name: gamePlayer.name,
            avatar: gamePlayer.avatar,
            wins: 0,
            draws: 0,
            totalGames: 0,
            finals: 0,
            winPercentage: 0
          };
        }
        
        playerStatsMap[gamePlayer.id].totalGames += 1;
        
        // Check for multiple winners (Ace games) or single winner
        const isWinner = game.winners && game.winners.length > 0
          ? game.winners.includes(gamePlayer.id)
          : game.winner === gamePlayer.id;
        
        if (isWinner) {
          playerStatsMap[gamePlayer.id].wins += 1;
        }
        
        // For Chess: count draws (games with no winner)
        if (game.type.toLowerCase() === 'chess' && !game.winner) {
          playerStatsMap[gamePlayer.id].draws += 1;
        }
        
        // For Rummy: count finals (all players who participated in the last round, including winner)
        if (game.type.toLowerCase() === 'rummy' && game.rounds && game.rounds.length > 0 && game.winner) {
          // Get the last round
          const lastRound = game.rounds[game.rounds.length - 1];
          
          // Check if this player scored in the last round (including winner)
          if (lastRound.scores && lastRound.scores[gamePlayer.id] !== 0 || !gamePlayer?.isLost) {
            // This player participated in the final
            playerStatsMap[gamePlayer.id].finals += 1;
          }
        }
      });
    });

    // Calculate win percentages and sort
    const statsArray = Object.values(playerStatsMap).map(player => {
      let totalPoints = 0;
      
      if (filterGameType.toLowerCase() === 'chess') {
        // Chess: Win = 1 point, Draw = 0.5 point, Loss = 0 point
        totalPoints = (player.wins * 1) + (player.draws * 0.5);
      } else if (filterGameType.toLowerCase() === 'rummy') {
        // Rummy: Win = 1 point, Final (without win) = 0.25 point
        const finalsWithoutWins = player.finals - player.wins;
        totalPoints = (player.wins * 1) + (finalsWithoutWins * 0.25);
      } else {
        // Ace: Simple win rate (wins only)
        totalPoints = player.wins * 1;
      }
      
      return {
        ...player,
        winPercentage: player.totalGames > 0 
          ? Math.round((totalPoints / player.totalGames) * 100)
          : 0
      };
    });
    
    // Sort by win percentage, then by wins, then by total games
    return statsArray
      .sort((a, b) => {
        if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalGames - a.totalGames;
      })
      .slice(0, 5); // Top 5 only
  }, [games, players, filterGameType]);
  
  // Helper function to get runners-up for a game (Rummy only)
  const getRunners = (game) => {
    if (game.type.toLowerCase() !== 'rummy' || game.status !== 'completed' || !game.rounds || game.rounds.length === 0 || !game.winner) {
      return [];
    }
    
    const runners = [];
    const lastRound = game.rounds[game.rounds.length - 1];
    
      game.players.forEach(gamePlayer => {
        if (gamePlayer.isLost && lastRound.scores && lastRound.scores[gamePlayer.id] !== 0) {
          runners.push(gamePlayer);
        }
      });
    return runners;
  };

  // Memoize recent matches to prevent blocking navigation
  // Filter by selected game type
  const recentMatches = useMemo(() => 
    [...games]
      .filter(game => game.type.toLowerCase() === filterGameType.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10),
    [games, filterGameType]
  );

  // Show loading state - AFTER all hooks
  if (authLoading || gameLoading) {
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
    if (players.length === 0) {
      alert('Please add users first!');
      router.push('/users');
      return;
    }
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
    const game = await createGame(gameType, selectedPlayers, points);
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
          {topPlayers.length === 0 ? (
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
                          {index === 3 && '🏅'}
                          {index === 4 && '⭐'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.playerCell}>
                          {getPlayerProfilePhoto(player.id) ? (
                            <img 
                              src={getPlayerProfilePhoto(player.id)} 
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
          <h2 className={styles.sectionTitle}>Recent {filterGameType} Matches (Last 10)</h2>
          {recentMatches.length > 0 ? (
            <div className="table-container">
              <table className={styles.recentMatchesTable}>
                <thead>
                  <tr>
                    <th className={styles.hideOnMobile}>Game</th>
                    <th className={styles.hideOnMobile}>Date</th>
                    {filterGameType === 'Chess' ? (
                      <>
                        <th>Winner</th>
                        <th>Opponent</th>
                      </>
                    ) : (
                      <>
                        <th className={styles.hideOnMobile}>Players</th>
                        <th>Winner</th>
                        {filterGameType === 'Rummy' && <th>Runner</th>}
                      </>
                    )}
                    <th>Status</th>
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
                      <td className={styles.hideOnMobile}>
                        <strong>{game.title}</strong>
                      </td>
                      <td className={styles.hideOnMobile}>
                        {new Date(game.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      {filterGameType === 'Chess' ? (
                        <>
                          <td>
                            {game.winner ? (
                              getPlayerProfilePhoto(game.winner) ? (
                                <img 
                                  src={getPlayerProfilePhoto(game.winner)} 
                                  alt={game.players.find(p => p.id === game.winner)?.name}
                                  className={styles.playerAvatar}
                                />
                              ) : (
                                <span>{game.players.find(p => p.id === game.winner)?.name}</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
                          </td>
                          <td>
                            {(() => {
                              // For Chess, show the opponent (non-winner player)
                              const opponent = game.winner 
                                ? game.players.find(p => p.id !== game.winner)
                                : game.players[1]; // If no winner, show second player
                              
                              if (!opponent) {
                                return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
                              }
                              
                              return getPlayerProfilePhoto(opponent.id) ? (
                                <img 
                                  src={getPlayerProfilePhoto(opponent.id)} 
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
                          <td className={styles.hideOnMobile}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {game.players.slice(0, 3).map(p => (
                                getPlayerProfilePhoto(p.id) ? (
                                  <img 
                                    key={p.id}
                                    src={getPlayerProfilePhoto(p.id)} 
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
                          <td>
                            {game.winner ? (
                              getPlayerProfilePhoto(game.winner) ? (
                                <img 
                                  src={getPlayerProfilePhoto(game.winner)} 
                                  alt={game.players.find(p => p.id === game.winner)?.name}
                                  className={styles.playerAvatar}
                                />
                              ) : (
                                <span>{game.players.find(p => p.id === game.winner)?.name}</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
                          </td>
                          {filterGameType === 'Rummy' && (
                            <td>
                              {(() => {
                                const runners = getRunners(game);
                                if (runners.length === 0) {
                                  return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
                                }
                                
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {runners.map((runner, index) => (
                                      getPlayerProfilePhoto(runner.id) ? (
                                        <img 
                                          key={runner.id}
                                          src={getPlayerProfilePhoto(runner.id)} 
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
                        </>
                      )}
                      <td>
                        <span className={`badge ${
                          game.status === 'completed' ? 'badge-success' : 'badge-warning'
                        }`}>
                          {game.status === 'completed' ? 'Done' : 'Progress'}
                        </span>
                      </td>
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
                    {getPlayerProfilePhoto(player.id) ? (
                      <img 
                        src={getPlayerProfilePhoto(player.id)} 
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

