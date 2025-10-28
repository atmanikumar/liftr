'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function HistoryPage() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGameType, setFilterGameType] = useState('Rummy');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const playersData = await response.json();
          setPlayers(playersData);
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    };
    
    fetchPlayers();
  }, []);
  
  // Fetch games based on selected game type
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/games?gameType=${filterGameType}`);
        
        if (response.ok) {
          const gamesData = await response.json();
          setGames(gamesData);
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGames();
  }, [filterGameType]);

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

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const getPlayerAvatar = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.avatar : '👤';
  };

  const getPlayerProfilePhoto = (playerId, game) => {
    // First try to get from game.players (most reliable, includes profile photos from API)
    if (game && game.players) {
      const gamePlayer = game.players.find(p => p.id === playerId);
      if (gamePlayer?.profilePhoto) {
        return gamePlayer.profilePhoto;
      }
    }
    // Fallback to global players array
    const player = players.find(p => p.id === playerId);
    return player?.profilePhoto || null;
  };

  // Memoize sorted games (already filtered by API)
  const sortedGames = useMemo(() => {
    // Sort by date (newest first)
    return [...games].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [games]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGames = sortedGames.slice(startIndex, endIndex);

  // Reset to page 1 when game type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterGameType]);

  return (
    <div className={styles.historyPage}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🕒 Game History</h1>
            <p className={styles.subtitle}>View all your past games and their details</p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading games...</p>
          </div>
        ) : (
          <>
        {/* Game Type Filter */}
        <div className="card" style={{ marginBottom: '24px' }}>
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
        </div>

        {/* Results Summary */}
        {sortedGames.length > 0 && (
          <div style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
            Showing {startIndex + 1}-{Math.min(endIndex, sortedGames.length)} of {sortedGames.length} game{sortedGames.length !== 1 ? 's' : ''}
          </div>
        )}

        {games.length === 0 ? (
          <div className="card">
            <div className={styles.empty}>
              <p>No {filterGameType} games played yet. Start a new game to see it here!</p>
              <button 
                className="btn btn-primary" 
                onClick={() => router.push('/')}
              >
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.gamesGrid}>
              {paginatedGames.map((game) => (
              <div 
                key={game.id} 
                className={styles.gameCard}
                onClick={() => router.push(`/game/${game.id}`)}
              >
                <div className={styles.gameCardHeader}>
                  <div>
                    <h3 className={styles.gameTitle}>{game.title}</h3>
                    <p className={styles.gameDate}>{formatDate(game.createdAt)}</p>
                  </div>
                  <span className={`badge ${
                    game.status === 'completed' ? 'badge-success' : 'badge-warning'
                  }`}>
                    {game.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div className={styles.gameInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Type:</span>
                    <span className={styles.infoValue}>{game.type}</span>
                  </div>
                  {game.type.toLowerCase() !== 'chess' && (
                    <>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Players:</span>
                        <span className={styles.infoValue}>{game.players.length}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Rounds:</span>
                        <span className={styles.infoValue}>{game.rounds.length}</span>
                      </div>
                      {game.type.toLowerCase() === 'rummy' && game.maxPoints && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Max Points:</span>
                          <span className={styles.infoValue}>{game.maxPoints}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {game.status === 'completed' && (game.winner || (game.winners && game.winners.length > 0)) && (
                  <div className={styles.winner}>
                    <span className={styles.winnerLabel}>
                      🏆 {game.winners && game.winners.length > 1 ? 'Winners:' : 'Winner:'}
                    </span>
                    {game.winners && game.winners.length > 1 ? (
                      <div className={styles.winnerInfo} style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                        {game.winners.map(winnerId => (
                          <div 
                            key={winnerId} 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => router.push(`/profile?userId=${winnerId}`)}
                            title="View profile"
                          >
                            {getPlayerProfilePhoto(winnerId, game) ? (
                              <img 
                                src={getPlayerProfilePhoto(winnerId, game)} 
                                alt={getPlayerName(winnerId)}
                                className={styles.winnerAvatar}
                              />
                            ) : (
                              <span className="avatar" style={{ fontSize: '18px' }}>
                                {getPlayerAvatar(winnerId)}
                              </span>
                            )}
                            <span className={styles.winnerName}>
                              {getPlayerName(winnerId)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        className={styles.winnerInfo}
                        onClick={() => router.push(`/profile?userId=${game.winner}`)}
                        style={{ cursor: 'pointer' }}
                        title="View profile"
                      >
                        {getPlayerProfilePhoto(game.winner, game) ? (
                          <img 
                            src={getPlayerProfilePhoto(game.winner, game)} 
                            alt={getPlayerName(game.winner)}
                            className={styles.winnerAvatar}
                          />
                        ) : (
                          <span className="avatar" style={{ fontSize: '20px' }}>
                            {getPlayerAvatar(game.winner)}
                          </span>
                        )}
                        <span className={styles.winnerName}>
                          {getPlayerName(game.winner)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.playersList}>
                  <p className={styles.playersLabel}>Players:</p>
                  <div className={styles.players}>
                    {game.players.map(player => (
                      <div 
                        key={player.id} 
                        className={styles.playerChip}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile?userId=${player.id}`);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="View profile"
                      >
                        {getPlayerProfilePhoto(player.id, game) ? (
                          <img 
                            src={getPlayerProfilePhoto(player.id, game)} 
                            alt={player.name}
                            className={styles.playerAvatarSmall}
                          />
                        ) : (
                          <span className="avatar" style={{ fontSize: '16px' }}>
                            {player.avatar}
                          </span>
                        )}
                        <span className={styles.playerChipName}>{player.name}</span>
                        {game.type.toLowerCase() !== 'chess' && (
                          <span className={styles.playerPoints}>
                            {player.totalPoints} pts
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {game.type.toLowerCase() !== 'chess' && game.rounds.length > 0 && (
                  <div className={styles.roundsSummary}>
                    <p className={styles.roundsLabel}>Latest Rounds:</p>
                    <div className={styles.roundsList}>
                      {game.rounds.slice(-3).reverse().map((round) => (
                        <div key={round.id} className={styles.roundItem}>
                          <span className={styles.roundNumber}>R{round.roundNumber}</span>
                          <div className={styles.roundScores}>
                            {Object.entries(round.scores).slice(0, 3).map(([playerId, score]) => (
                              <span key={playerId} className={styles.miniScore}>
                                {getPlayerProfilePhoto(playerId, game) ? (
                                  <img 
                                    src={getPlayerProfilePhoto(playerId, game)} 
                                    alt={getPlayerName(playerId)}
                                    style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  getPlayerAvatar(playerId)
                                )} {score}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.viewGame}>
                  View Details →
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                <span className="material-icons">first_page</span>
              </button>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              
              <div className={styles.pageNumbers}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, array) => (
                    <div key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className={styles.ellipsis}>...</span>
                      )}
                      <button
                        className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
              </div>

              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                <span className="material-icons">chevron_right</span>
              </button>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                <span className="material-icons">last_page</span>
              </button>
            </div>
          )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}

