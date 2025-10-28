'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function GamePage({ params }) {
  const router = useRouter();
  const { loadData, getGame, addRound, updateRound, addPlayerToGame, declareWinner, declareDraw, updateMaxPoints, declareAceWinners, players, games, sseConnected } = useGame();
  const { user, loading: authLoading } = useAuth();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Check if current user is the game creator
  const isGameCreator = () => {
    return game && user && game.createdBy === user.id;
  };
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showDeclareWinnerModal, setShowDeclareWinnerModal] = useState(false);
  const [showMarkDrawModal, setShowMarkDrawModal] = useState(false);
  const [showUpdateMaxPointsModal, setShowUpdateMaxPointsModal] = useState(false);
  const [showMarkAcePlayerModal, setShowMarkAcePlayerModal] = useState(false);
  const [showEndAceGameModal, setShowEndAceGameModal] = useState(false);
  const [addingRound, setAddingRound] = useState(false);
  const [roundScores, setRoundScores] = useState({});
  const [droppedPlayers, setDroppedPlayers] = useState({});
  const [doubleDropPlayers, setDoubleDropPlayers] = useState({});
  const [winnerPlayers, setWinnerPlayers] = useState({});
  const [fullPlayers, setFullPlayers] = useState({});
  const [addPlayerError, setAddPlayerError] = useState('');
  const [updateMaxPointsError, setUpdateMaxPointsError] = useState('');
  const [newMaxPoints, setNewMaxPoints] = useState('');
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [selectedAcePlayer, setSelectedAcePlayer] = useState(null);
  const [selectedAceWinners, setSelectedAceWinners] = useState([]);
  const [editingRound, setEditingRound] = useState(null); // Track which round is being edited
  
  // Track if players are loaded
  const playersLoadedRef = useRef(false);

  // Optimized fetch game function - can be reused for refresh
  const fetchGame = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${params.id}`);
      if (response.ok) {
        const gameData = await response.json();
        setGame(gameData);
        setNotFound(false);
        
        // Initialize round scores only if empty
        if (Object.keys(roundScores).length === 0) {
          const initialScores = {};
          gameData.players.forEach(player => {
            initialScores[player.id] = '';
          });
          setRoundScores(initialScores);
        }
        
        return gameData;
      } else if (response.status === 404) {
        setNotFound(true);
        return null;
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      setNotFound(true);
      return null;
    }
  }, [params.id, roundScores]);

  // Initial load - fetch game and load players once
  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      // Fetch game
      await fetchGame();
      
      // Load players only once
      if (!playersLoadedRef.current) {
        loadData();
        playersLoadedRef.current = true;
      }
      
      setLoading(false);
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]); // Only depend on params.id, not fetchGame or loadData

  // Update game from context when games array changes (triggered by SSE or local actions)
  // This ensures real-time updates from other clients
  useEffect(() => {
    if (games.length > 0) {
      const gameData = getGame(params.id);
      if (gameData) {
        // Always update if there's a difference to ensure SSE updates are reflected
        const hasChanged = !game || JSON.stringify(gameData) !== JSON.stringify(game);
        if (hasChanged) {
          console.log('[Game Page] Updating game from context (SSE or local action)');
          setGame(gameData);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, params.id, getGame]); // Don't include 'game' to avoid unnecessary re-renders

  // Note: SSE updates are handled by GameContext
  // The game will update automatically via the games array change detection above, fetchGame not needed in deps

  // Redirect if game not found after loading
  useEffect(() => {
    if (notFound && !loading) {
      router.push('/');
    }
  }, [notFound, loading, router]);

  // Helper function to get profile photo for a player
  // Now gets from game.players array which includes profilePhoto from API
  const getPlayerProfilePhoto = (playerId) => {
    const player = game?.players.find(p => p.id === playerId);
    return player?.profilePhoto || null;
  };

  // Reset round scores after adding a round
  const resetRoundScores = () => {
    if (game) {
      const newScores = {};
      game.players.forEach(player => {
        newScores[player.id] = '';
      });
      setRoundScores(newScores);
      setDroppedPlayers({});
      setDoubleDropPlayers({});
      setWinnerPlayers({});
      setFullPlayers({});
    }
  };

  // Helper function to count consecutive drops for a player (includes both single and double drops)
  const getConsecutiveDrops = (playerId) => {
    if (!game || !game.rounds || game.rounds.length === 0) return 0;
    
    let consecutiveDrops = 0;
    // Check rounds from most recent backwards
    for (let i = game.rounds.length - 1; i >= 0; i--) {
      const round = game.rounds[i];
      // Count both single drops and double drops
      if ((round.drops && round.drops[playerId] === true) || 
          (round.doubleDrops && round.doubleDrops[playerId] === true)) {
        consecutiveDrops++;
      } else {
        // If player didn't drop in this round, stop counting
        break;
      }
    }
    return consecutiveDrops;
  };

  const handleScoreChange = (playerId, score) => {
    setRoundScores(prev => ({
      ...prev,
      [playerId]: score === '' ? '' : score
    }));
  };

  const handleDropToggle = (playerId) => {
    // If marking as winner, unmark winner first
    if (winnerPlayers[playerId]) {
      setWinnerPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If double drop is active, unmark it
    if (doubleDropPlayers[playerId]) {
      setDoubleDropPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If full is active, unmark it
    if (fullPlayers[playerId]) {
      setFullPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    setDroppedPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
    
    // If dropping, automatically set score to 20
    if (!droppedPlayers[playerId]) {
      setRoundScores(prev => ({
        ...prev,
        [playerId]: '20'
      }));
    } else {
      // If un-dropping, clear the score
      setRoundScores(prev => ({
        ...prev,
        [playerId]: ''
      }));
    }
  };

  const handleDoubleDropToggle = (playerId) => {
    // If marking as winner, unmark winner first
    if (winnerPlayers[playerId]) {
      setWinnerPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If single drop is active, unmark it
    if (droppedPlayers[playerId]) {
      setDroppedPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If full is active, unmark it
    if (fullPlayers[playerId]) {
      setFullPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    setDoubleDropPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
    
    // If double dropping, automatically set score to 40
    if (!doubleDropPlayers[playerId]) {
      setRoundScores(prev => ({
        ...prev,
        [playerId]: '40'
      }));
    } else {
      // If un-dropping, clear the score
      setRoundScores(prev => ({
        ...prev,
        [playerId]: ''
      }));
    }
  };

  const handleWinnerToggle = (playerId) => {
    // If marked as dropped, unmark drop first
    if (droppedPlayers[playerId]) {
      setDroppedPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If marked as double dropped, unmark it
    if (doubleDropPlayers[playerId]) {
      setDoubleDropPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If marked as full, unmark it
    if (fullPlayers[playerId]) {
      setFullPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    setWinnerPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
    
    // If marking as winner, automatically set score to 0
    if (!winnerPlayers[playerId]) {
      setRoundScores(prev => ({
        ...prev,
        [playerId]: '0'
      }));
    } else {
      // If un-marking winner, clear the score
      setRoundScores(prev => ({
        ...prev,
        [playerId]: ''
      }));
    }
  };

  const handleFullToggle = (playerId) => {
    // If marked as dropped, unmark drop first
    if (droppedPlayers[playerId]) {
      setDroppedPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If marked as double dropped, unmark it
    if (doubleDropPlayers[playerId]) {
      setDoubleDropPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    // If marked as winner, unmark it
    if (winnerPlayers[playerId]) {
      setWinnerPlayers(prev => ({
        ...prev,
        [playerId]: false
      }));
    }
    
    setFullPlayers(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
    
    // If marking as full, automatically set score to 80
    if (!fullPlayers[playerId]) {
      setRoundScores(prev => ({
        ...prev,
        [playerId]: '80'
      }));
    } else {
      // If un-marking full, clear the score
      setRoundScores(prev => ({
        ...prev,
        [playerId]: ''
      }));
    }
  };

  const handleAddRound = async () => {
    setAddingRound(true);
    
    try {
      // Convert empty strings to 0 before saving, but use 20 for dropped players, 40 for double drops, 80 for full, and 0 for winners
      const scoresWithDefaults = {};
      const dropInfo = {};
      const doubleDropInfo = {};
      const winnerInfo = {};
      
      Object.keys(roundScores).forEach(playerId => {
        if (droppedPlayers[playerId]) {
          scoresWithDefaults[playerId] = 20; // Drop = 20 points
          dropInfo[playerId] = true;
          doubleDropInfo[playerId] = false;
          winnerInfo[playerId] = false;
        } else if (doubleDropPlayers[playerId]) {
          scoresWithDefaults[playerId] = 40; // Double Drop = 40 points
          dropInfo[playerId] = false;
          doubleDropInfo[playerId] = true;
          winnerInfo[playerId] = false;
        } else if (fullPlayers[playerId]) {
          scoresWithDefaults[playerId] = 80; // Full = 80 points
          dropInfo[playerId] = false;
          doubleDropInfo[playerId] = false;
          winnerInfo[playerId] = false;
        } else if (winnerPlayers[playerId]) {
          scoresWithDefaults[playerId] = 0; // Winner = 0 points
          dropInfo[playerId] = false;
          doubleDropInfo[playerId] = false;
          winnerInfo[playerId] = true;
        } else {
          scoresWithDefaults[playerId] = parseInt(roundScores[playerId]) || 0;
          dropInfo[playerId] = false;
          doubleDropInfo[playerId] = false;
          winnerInfo[playerId] = false;
        }
      });
      
      if (editingRound) {
        // Update existing round
        await updateRound(params.id, editingRound.roundNumber, scoresWithDefaults, dropInfo, winnerInfo, doubleDropInfo);
        setEditingRound(null);
      } else {
        // Add new round
        await addRound(params.id, scoresWithDefaults, dropInfo, winnerInfo, doubleDropInfo);
      }
      
      // Reset scores for next round with empty strings
      resetRoundScores();
      setShowAddRoundModal(false);
      
      // Game will auto-update via useEffect watching 'games'
    } catch (error) {
      console.error('Failed to add/update round:', error);
      alert('Failed to add round. Please try again.');
    } finally {
      setAddingRound(false);
    }
  };

  const handleConfirmAddPlayer = () => {
    if (!selectedPlayerToAdd) return;
    
    const result = addPlayerToGame(params.id, selectedPlayerToAdd);
    
    if (result && !result.success) {
      // Show error message
      setAddPlayerError(result.error);
      return;
    }
    
    // Success - close modal and clear state
    setAddPlayerError('');
    setSelectedPlayerToAdd(null);
    setShowAddPlayerModal(false);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleDeclareWinner = () => {
    if (!selectedWinner) {
      alert('Please select a winner');
      return;
    }
    
    declareWinner(params.id, selectedWinner);
    setShowDeclareWinnerModal(false);
    setSelectedWinner(null);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleMarkDraw = () => {
    declareDraw(params.id);
    setShowMarkDrawModal(false);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleUpdateMaxPoints = () => {
    const maxPointsValue = parseInt(newMaxPoints);
    
    if (!maxPointsValue || maxPointsValue < 1) {
      setUpdateMaxPointsError('Please enter a valid number greater than 0');
      return;
    }
    
    const result = updateMaxPoints(params.id, maxPointsValue);
    
    if (result && !result.success) {
      setUpdateMaxPointsError(result.error);
      return;
    }
    
    // Success
    setShowUpdateMaxPointsModal(false);
    setNewMaxPoints('');
    setUpdateMaxPointsError('');
    // Game will auto-update via useEffect watching 'games'
  };

  const handleMarkAcePlayer = () => {
    if (!selectedAcePlayer) {
      alert('Please select the loser');
      return;
    }
    
    // For Ace: Ace player (loser) gets 0 points, all others get 1 point
    const aceScores = {};
    game.players.forEach(player => {
      aceScores[player.id] = player.id === selectedAcePlayer ? 0 : 1;
    });
    
    addRound(params.id, aceScores);
    setShowMarkAcePlayerModal(false);
    setSelectedAcePlayer(null);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleEndAceGame = () => {
    if (!game || game.players.length === 0) {
      alert('No players in game');
      return;
    }

    // Find the highest score
    const maxScore = Math.max(...game.players.map(p => p.totalPoints));
    
    // Get all players with the highest score
    const topPlayers = game.players.filter(p => p.totalPoints === maxScore);
    const winnerIds = topPlayers.map(p => p.id);
    
    // Pre-select the winners
    setSelectedAceWinners(winnerIds);
    setShowEndAceGameModal(true);
  };

  const handleConfirmAceWinners = () => {
    if (selectedAceWinners.length === 0) {
      alert('Please select at least one winner');
      return;
    }
    
    declareAceWinners(params.id, selectedAceWinners);
    setShowEndAceGameModal(false);
    setSelectedAceWinners([]);
    // Game will auto-update via useEffect watching 'games'
  };

  const toggleAceWinner = (playerId) => {
    setSelectedAceWinners(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const availablePlayers = players.filter(p => 
    !game?.players.find(gp => gp.id === p.id)
  );
  
  const isChess = game?.type.toLowerCase() === 'chess';
  const isAce = game?.type.toLowerCase() === 'ace';

  // Show loading state
  if (authLoading || loading || !game) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span className="material-icons" style={{ fontSize: '60px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
            refresh
          </span>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '20px' }}>Loading game...</p>
        </div>
      </div>
    );
  }

  const isRummy = game.type.toLowerCase() === 'rummy';
  const pageClass = isRummy ? `${styles.gamePage} rummy-background` : styles.gamePage;

  return (
      <div className={pageClass}>
        <div className="container">
          <div className={styles.gameHeader}>
            <div>
              <h1 className={styles.title}>{game.title}</h1>
              <p className={styles.subtitle}>
                {formatDate(game.createdAt)} • {game.type}
                {!isChess && !isAce && game.maxPoints && ` • Max Points: ${game.maxPoints}`}
              </p>
              {game.status === 'completed' && (
                <div className={styles.winnerBanner}>
                  {game.isDraw ? (
                    <>
                      🤝 Game ended in a Draw 🤝
                    </>
                  ) : game.winners && game.winners.length > 1 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span>🎉 Winners:</span>
                      {game.winners.map((wId, index) => {
                        const winner = game.players.find(p => p.id === wId);
                        return (
                          <span key={wId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getPlayerProfilePhoto(wId) ? (
                              <img 
                                src={getPlayerProfilePhoto(wId)} 
                                alt={winner?.name}
                                className={styles.winnerAvatar}
                              />
                            ) : (
                              <span className="avatar" style={{ fontSize: '28px' }}>{winner?.avatar}</span>
                            )}
                            <span>{winner?.name}</span>
                            {index < game.winners.length - 1 && ','}
                          </span>
                        );
                      })}
                      <span>🎉</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <span>🎉 Winner:</span>
                      {getPlayerProfilePhoto(game.winner) ? (
                        <img 
                          src={getPlayerProfilePhoto(game.winner)} 
                          alt={game.players.find(p => p.id === game.winner)?.name}
                          className={styles.winnerAvatar}
                        />
                      ) : (
                        <span className="avatar" style={{ fontSize: '28px' }}>
                          {game.players.find(p => p.id === game.winner)?.avatar}
                        </span>
                      )}
                      <span>{game.players.find(p => p.id === game.winner)?.name}</span>
                      <span>🎉</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              {game.status === 'in_progress' && isGameCreator() && (
                <>
                  {isChess ? (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowDeclareWinnerModal(true)}
                      >
                        👑 Declare Winner
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setShowMarkDrawModal(true)}
                      >
                        🤝 Mark as Draw
                      </button>
                    </>
                  ) : isAce ? (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowMarkAcePlayerModal(true)}
                      >
                        🎯 Mark Ace Player
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={handleEndAceGame}
                      >
                        🏁 End Game
                      </button>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowAddPlayerModal(true);
                            setAddPlayerError('');
                            setSelectedPlayerToAdd(null);
                          }}
                          style={{ padding: '10px 16px' }}
                        >
                          ➕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddRoundModal(true)}
                      >
                        📝 Add Round Points
                      </button>
                    </>
                  )}
                </>
              )}
              {game.status === 'in_progress' && !isGameCreator() && (
                <span className={styles.playerNote}>
                  {isChess ? 'Only game creator can declare winner' : isAce ? 'Only game creator can mark ace player, add players and end game' : 'Only game creator can add rounds and players'}
                </span>
              )}
            </div>
          </div>

          {/* Current Standings */}
          <div className="card">
            <h2 className={styles.sectionTitle}>
              {isChess ? 'Players' : isAce ? 'Players (Points Won)' : game.status === 'completed' ? 'Final Standings' : 'Current Standings'}
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    {!isChess && <th>{isAce ? 'Points Won' : 'Total Points'}</th>}
                    {!isChess && !isAce && <th>Remaining</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* For Ace: sort by points descending (highest first). For Rummy: sort ascending (lowest first) */}
                  {(isChess ? game.players : 
                    isAce ? [...game.players].sort((a, b) => b.totalPoints - a.totalPoints) :
                    [...game.players].sort((a, b) => a.totalPoints - b.totalPoints))
                    .map((player) => {
                      const remainingPoints = !isChess && !isAce && game.maxPoints 
                        ? game.maxPoints - player.totalPoints 
                        : 0;
                      
                      // Check if player has dropped 3 times consecutively
                      const consecutiveDrops = getConsecutiveDrops(player.id);
                      const mustPlayDueToDrops = !isChess && !isAce && !player.isLost && consecutiveDrops >= 3;
                      
                      // Check if player can't afford to drop (drop would exceed max points)
                      const cannotAffordDrop = !isChess && !isAce && !player.isLost && 
                                               (player.totalPoints + 20 >= game.maxPoints);
                      
                      // Highlight if either condition is true (only for active players)
                      const mustPlay = mustPlayDueToDrops || cannotAffordDrop;
                      
                      // Determine row background color based on status
                      let rowBackground = 'transparent';
                      let borderLeft = 'none';
                      
                      if (mustPlay) {
                        // Must play warning (highest priority)
                        rowBackground = 'rgba(251, 191, 36, 0.15)';
                        borderLeft = '4px solid var(--warning)';
                      } else if (player.isLost) {
                        // Eliminated
                        rowBackground = 'rgba(239, 68, 68, 0.1)';
                      } else if (game.status === 'completed') {
                        // Winner (game completed and not lost)
                        rowBackground = 'rgba(16, 185, 129, 0.1)';
                      }
                      // Active players have no color change (transparent)
                      
                      return (
                        <tr 
                          key={player.id} 
                          className={player.isLost ? styles.lostPlayer : ''}
                          style={{
                            background: rowBackground,
                            borderLeft: borderLeft
                          }}
                        >
                          <td>
                            <div 
                              className={styles.playerCell}
                              onClick={() => router.push(`/profile?userId=${player.id}`)}
                              style={{ cursor: 'pointer' }}
                              title="View profile"
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
                              {mustPlay && (
                                <span style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '16px',
                                  filter: 'grayscale(0)'
                                }}>
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </td>
                          {!isChess && (
                            <td>
                              <strong className={styles.points}>{player.totalPoints}</strong>
                            </td>
                          )}
                          {!isChess && !isAce && (
                            <td>
                              <span style={{ fontWeight: '600' }}>
                                {remainingPoints <= 0 ? 0 : remainingPoints}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            {/* Action buttons for Rummy games - below the standings table */}
            {!isChess && !isAce && game.status === 'in_progress' && isGameCreator() && (
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '8px',
                borderTop: '2px solid rgba(59, 130, 246, 0.1)',
                flexWrap: 'wrap'
              }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUpdateMaxPointsModal(true);
                    setNewMaxPoints(game.maxPoints.toString());
                    setUpdateMaxPointsError('');
                  }}
                >
                  🎯 Update Max Points
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddPlayerModal(true);
                    setAddPlayerError('');
                    setSelectedPlayerToAdd(null);
                  }}
                >
                  ➕ Add Player
                </button>
              </div>
            )}
          </div>

          {/* Game History - Only show for non-Chess games */}
          {!isChess && ((game.history && game.history.length > 0) || (game.rounds && game.rounds.length > 0)) && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2 className={styles.sectionTitle}>Game History</h2>
            <div className={styles.roundsContainer}>
              {/* Show history if available, otherwise fallback to rounds only */}
              {(() => {
                // Build elimination tracking for Rummy games
                const eliminatedPlayersMap = {}; // roundNumber -> Set of eliminated player IDs
                const eliminationEvents = []; // Track when players got eliminated
                
                if (!isAce && game.maxPoints && game.rounds) {
                  let cumulativePoints = {};
                  let previouslyEliminated = new Set();
                  
                  // Process rounds in order to track when players got eliminated
                  game.rounds.forEach((round, index) => {
                    // Initialize cumulative points for players
                    Object.keys(round.scores).forEach(playerId => {
                      if (!cumulativePoints[playerId]) {
                        // Check if player was added mid-game with starting points
                        const playerAddEvent = game.history?.find(
                          e => e.type === 'player_added' && e.playerId === playerId
                        );
                        cumulativePoints[playerId] = playerAddEvent?.startingPoints || 0;
                      }
                    });
                    
                    // Add this round's scores
                    Object.entries(round.scores).forEach(([playerId, score]) => {
                      cumulativePoints[playerId] = (cumulativePoints[playerId] || 0) + score;
                    });
                    
                    // Track who got eliminated in this round
                    const eliminatedInThisRound = new Set();
                    const newlyEliminated = [];
                    
                    Object.entries(cumulativePoints).forEach(([playerId, points]) => {
                      if (points >= game.maxPoints) {
                        eliminatedInThisRound.add(playerId);
                        // Check if this is a NEW elimination (not previously eliminated)
                        if (!previouslyEliminated.has(playerId)) {
                          const player = game.players.find(p => p.id === playerId);
                          if (player) {
                            newlyEliminated.push({
                              playerId,
                              playerName: player.name,
                              playerAvatar: player.avatar,
                              points,
                              roundNumber: round.roundNumber,
                              timestamp: round.timestamp
                            });
                          }
                        }
                      }
                    });
                    
                    // Add elimination events for this round
                    if (newlyEliminated.length > 0) {
                      eliminationEvents.push({
                        type: 'elimination',
                        roundNumber: round.roundNumber,
                        timestamp: round.timestamp,
                        players: newlyEliminated,
                        id: `elimination-${round.roundNumber}`
                      });
                    }
                    
                    eliminatedPlayersMap[round.roundNumber] = eliminatedInThisRound;
                    // Update previously eliminated set
                    eliminatedInThisRound.forEach(playerId => previouslyEliminated.add(playerId));
                  });
                }
                
                // Merge elimination events into history
                const historyWithEliminations = [...(game.history && game.history.length > 0 ? game.history : game.rounds || [])];
                eliminationEvents.forEach(elimEvent => {
                  // Insert elimination event right after the round where it happened
                  const roundIndex = historyWithEliminations.findIndex(
                    e => (e.type === 'round' || !e.type) && e.roundNumber === elimEvent.roundNumber
                  );
                  if (roundIndex !== -1) {
                    historyWithEliminations.splice(roundIndex + 1, 0, elimEvent);
                  }
                });
                
                return [...historyWithEliminations].reverse().map((event) => {
                // Elimination Event
                if (event.type === 'elimination') {
                  return (
                    <div key={event.id} className={styles.roundCard} style={{ 
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderLeft: '4px solid var(--danger)'
                    }}>
                      <div className={styles.roundHeader}>
                        <h3 style={{ color: 'var(--danger)' }}>
                          ❌ Player{event.players.length > 1 ? 's' : ''} Eliminated
                        </h3>
                        <span className={styles.roundTime}>
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className={styles.roundScores}>
                        {event.players.map(player => (
                          <div key={player.playerId} className={styles.scoreItem}>
                            <span className={styles.playerName}>
                              {getPlayerProfilePhoto(player.playerId) ? (
                                <img 
                                  src={getPlayerProfilePhoto(player.playerId)} 
                                  alt={player.playerName}
                                  className={styles.playerAvatar}
                                />
                              ) : (
                                <span className="avatar" style={{ fontSize: '24px' }}>
                                  {player.playerAvatar}
                                </span>
                              )}
                              <strong>{player.playerName}</strong>
                            </span>
                            <span className={styles.scoreValue} style={{ color: 'var(--danger)' }}>
                              {player.points} (Max: {game.maxPoints})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                // Player Added Event
                if (event.type === 'player_added') {
                  return (
                    <div key={event.id} className={styles.roundCard} style={{ 
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderLeft: '4px solid var(--success)'
                    }}>
                      <div className={styles.roundHeader}>
                        <h3 style={{ color: 'var(--success)' }}>➕ Player Joined</h3>
                        <span className={styles.roundTime}>
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className={styles.roundScores}>
                        <div className={styles.scoreItem}>
                          <span className={styles.playerName}>
                            {getPlayerProfilePhoto(event.playerId) ? (
                              <img 
                                src={getPlayerProfilePhoto(event.playerId)} 
                                alt={event.playerName}
                                className={styles.playerAvatar}
                              />
                            ) : (
                              <span className="avatar" style={{ fontSize: '24px' }}>
                                {event.playerAvatar}
                              </span>
                            )}
                            <strong>{event.playerName}</strong>
                          </span>
                          {!isChess && (
                            <span className={styles.scoreValue} style={{ color: 'var(--success)' }}>
                              {isAce ? `Joined with ${event.startingPoints}` : `Started with ${event.startingPoints}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Round Event (both new format with type='round' and old format without type)
                if (event.type === 'round' || !event.type) {
                  // Get players who were eliminated BEFORE this round
                  const eliminatedBeforeThisRound = new Set();
                  if (!isAce && game.maxPoints) {
                    // For all rounds before this one, collect eliminated players
                    Object.entries(eliminatedPlayersMap).forEach(([roundNum, eliminatedSet]) => {
                      if (parseInt(roundNum) < event.roundNumber) {
                        eliminatedSet.forEach(playerId => eliminatedBeforeThisRound.add(playerId));
                      }
                    });
                  }
                  
                  // Only show players who participated in this round (have scores) AND were not already eliminated
                  const playersInRound = game.players.filter(player => 
                    event.scores && 
                    event.scores[player.id] !== undefined &&
                    !eliminatedBeforeThisRound.has(player.id)
                  );
                  
                  // For Ace games, find who got ace (0 points)
                  const acePlayer = isAce ? playersInRound.find(p => event.scores[p.id] === 0) : null;
                  
                  // Check if this is the last round and game completed within 5 mins
                  const isLastRound = event.roundNumber === game.rounds.length;
                  const canEditLastRound = isLastRound && game.status === 'completed' && game.completedAt && (() => {
                    const completedAt = new Date(game.completedAt);
                    const now = new Date();
                    const diffInMinutes = (now - completedAt) / (1000 * 60);
                    return diffInMinutes <= 5;
                  })();
                  
                  // Rummy in-progress: can edit any round, Rummy completed: only last round within 5 mins
                  const canEdit = !isAce && isGameCreator() && (
                    (game.status === 'in_progress') || 
                    (game.status === 'completed' && canEditLastRound)
                  );
                  
                  return (
                    <div key={event.id} className={styles.roundCard}>
                      <div className={styles.roundHeader}>
                        <h3>
                          Round {event.roundNumber}
                          {acePlayer && (
                            <span style={{ 
                              marginLeft: '12px', 
                              fontSize: '14px', 
                              color: 'var(--danger)',
                              fontWeight: 'normal'
                            }}>
                              🎯 Ace: {acePlayer.name}
                            </span>
                          )}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {canEdit && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditingRound(event);
                                // Pre-fill the scores for editing
                                const editScores = {};
                                const editDropped = {};
                                const editDoubleDropped = {};
                                const editWinners = {};
                                game.players.forEach(player => {
                                  editScores[player.id] = event.scores && event.scores[player.id] !== undefined ? event.scores[player.id].toString() : '';
                                  editDropped[player.id] = event.drops && event.drops[player.id] === true;
                                  editDoubleDropped[player.id] = event.doubleDrops && event.doubleDrops[player.id] === true;
                                  editWinners[player.id] = event.winners && event.winners[player.id] === true;
                                });
                                setRoundScores(editScores);
                                setDroppedPlayers(editDropped);
                                setDoubleDropPlayers(editDoubleDropped);
                                setWinnerPlayers(editWinners);
                                setShowAddRoundModal(true);
                              }}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <span className={styles.roundTime}>
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.roundScores}>
                        {/* Only show players who were in this round, sorted by their scores */}
                        {playersInRound
                          .sort((a, b) => {
                            // For Ace, sort by score descending (highest first), for Rummy ascending (lowest first)
                            return isAce 
                              ? (event.scores[b.id] || 0) - (event.scores[a.id] || 0)
                              : (event.scores[a.id] || 0) - (event.scores[b.id] || 0);
                          })
                          .map(player => {
                            const score = event.scores[player.id];
                            const isAceInRound = isAce && score === 0;
                            const hasDropped = event.drops && event.drops[player.id] === true;
                            const hasDoubleDrop = event.doubleDrops && event.doubleDrops[player.id] === true;
                            const isWinner = event.winners && event.winners[player.id] === true;
                            
                            // Calculate previous total (total before this round) for Rummy
                            let previousTotal = 0;
                            if (!isChess && !isAce) {
                              // Sum all rounds before this one
                              game.rounds.forEach(round => {
                                if (round.roundNumber < event.roundNumber) {
                                  previousTotal += round.scores[player.id] || 0;
                                }
                              });
                            }
                            const currentTotal = previousTotal + score;
                            
                            return (
                              <div key={player.id} className={styles.scoreItem}>
                                <span className={styles.playerName}>
                                  {getPlayerProfilePhoto(player.id) ? (
                                    <img 
                                      src={getPlayerProfilePhoto(player.id)} 
                                      alt={player.name}
                                      className={styles.playerAvatar}
                                    />
                                  ) : (
                                    <span className="avatar" style={{ fontSize: '20px' }}>
                                      {player.avatar}
                                    </span>
                                  )}
                                  {player.name}
                                  {isAceInRound && <span style={{ marginLeft: '8px', color: 'var(--danger)' }}>🎯</span>}
                                  {(score === 0 && !isAceInRound) || isWinner ? (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      background: 'var(--success)',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      W
                                    </span>
                                  ) : null}
                                  {score === 80 && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      background: 'var(--danger)',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      F
                                    </span>
                                  )}
                                  {hasDoubleDrop && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      background: '#f59e0b',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      DD
                                    </span>
                                  )}
                                  {hasDropped && !hasDoubleDrop && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      fontSize: '11px',
                                      padding: '2px 6px',
                                      background: '#f59e0b',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>
                                      D
                                    </span>
                                  )}
                                </span>
                                {!isChess && (
                                  <span className={styles.scoreValue} style={isAceInRound ? { color: 'var(--danger)', fontWeight: '600' } : {}}>
                                    {isAce 
                                      ? (score === 0 ? 'ACE' : `+${score}`) 
                                      : (
                                        <span>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{previousTotal}</span>
                                          {' + '}
                                          <span style={{ fontWeight: '600' }}>{score}</span>
                                          {' = '}
                                          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{currentTotal}</span>
                                        </span>
                                      )
                                    }
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                }
                
                return null;
              });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Add Round Modal */}
      {showAddRoundModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddRoundModal(false);
          setEditingRound(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {editingRound 
                ? `✏️ Edit Round ${editingRound.roundNumber} Points` 
                : `📝 Add Round ${game.rounds.length + 1} Points`
              }
            </h2>
            
            <div className={styles.scoreInputs}>
              {game.players.filter(p => !p.isLost).map(player => {
                const consecutiveDrops = getConsecutiveDrops(player.id);
                const canAffordDrop = player.totalPoints + 20 < game.maxPoints;
                const canAffordDoubleDrop = player.totalPoints + 40 < game.maxPoints;
                const canDrop = consecutiveDrops < 3 && canAffordDrop;
                
                return (
                  <div key={player.id} className="form-group">
                    <label>
                      {getPlayerProfilePhoto(player.id) ? (
                        <img 
                          src={getPlayerProfilePhoto(player.id)} 
                          alt={player.name}
                          className={styles.playerAvatar}
                          style={{ marginRight: '8px' }}
                        />
                      ) : (
                        <span className="avatar" style={{ fontSize: '20px', marginRight: '8px' }}>
                          {player.avatar}
                        </span>
                      )}
                      {player.name}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', flexWrap: 'nowrap' }}>
                      <input 
                        type="number" 
                        value={roundScores[player.id] || ''}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        min="0"
                        placeholder="0"
                        disabled={droppedPlayers[player.id] || doubleDropPlayers[player.id] || winnerPlayers[player.id] || fullPlayers[player.id]}
                        style={{ flex: '1', minWidth: '60px', textAlign: 'center' }}
                        autoFocus={player.id === game.players.filter(p => !p.isLost)[0]?.id}
                      />
                      {isRummy && (
                        <>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            background: winnerPlayers[player.id] ? 'var(--success)' : 'transparent',
                            border: '2px solid var(--success)',
                            borderRadius: '6px',
                            color: winnerPlayers[player.id] ? 'white' : 'var(--success)',
                            fontWeight: '600',
                            fontSize: '14px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            flexShrink: '0',
                            marginBottom: '0'
                          }}>
                            <input 
                              type="checkbox"
                              checked={winnerPlayers[player.id] || false}
                              onChange={() => handleWinnerToggle(player.id)}
                              style={{ display: 'none' }}
                            />
                            W
                          </label>
                          {canDrop ? (
                            <>
                              <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                background: droppedPlayers[player.id] ? '#f59e0b' : 'transparent',
                                border: '2px solid #f59e0b',
                                borderRadius: '6px',
                                color: droppedPlayers[player.id] ? 'white' : '#f59e0b',
                                fontWeight: '600',
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                flexShrink: '0',
                                marginBottom: '0'
                              }}>
                                <input 
                                  type="checkbox"
                                  checked={droppedPlayers[player.id] || false}
                                  onChange={() => handleDropToggle(player.id)}
                                  style={{ display: 'none' }}
                                />
                                D
                              </label>
                              {canAffordDoubleDrop ? (
                                <label style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  padding: '8px 12px',
                                  background: doubleDropPlayers[player.id] ? '#f59e0b' : 'transparent',
                                  border: '2px solid #f59e0b',
                                  borderRadius: '6px',
                                  color: doubleDropPlayers[player.id] ? 'white' : '#f59e0b',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.2s',
                                  flexShrink: '0',
                                  marginBottom: '0'
                                }}>
                                  <input 
                                    type="checkbox"
                                    checked={doubleDropPlayers[player.id] || false}
                                    onChange={() => handleDoubleDropToggle(player.id)}
                                    style={{ display: 'none' }}
                                  />
                                  DD
                                </label>
                              ) : null}
                            </>
                          ) : (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              background: 'rgba(251, 191, 36, 0.1)',
                              border: '2px solid var(--warning)',
                              borderRadius: '6px',
                              color: 'var(--warning)',
                              fontWeight: '600',
                              fontSize: '14px',
                              whiteSpace: 'nowrap',
                              flexShrink: '0',
                              marginBottom: '0'
                            }}>
                              ⚠️ Must Play
                            </div>
                          )}
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            background: fullPlayers[player.id] ? 'var(--danger)' : 'transparent',
                            border: '2px solid var(--danger)',
                            borderRadius: '6px',
                            color: fullPlayers[player.id] ? 'white' : 'var(--danger)',
                            fontWeight: '600',
                            fontSize: '14px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            flexShrink: '0',
                            marginBottom: '0'
                          }}>
                            <input 
                              type="checkbox"
                              checked={fullPlayers[player.id] || false}
                              onChange={() => handleFullToggle(player.id)}
                              style={{ display: 'none' }}
                            />
                            F
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddRoundModal(false)}
                disabled={addingRound}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleAddRound}
                disabled={addingRound}
              >
                {addingRound ? 'Adding...' : 'Add Round Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddPlayerModal(false);
          setAddPlayerError('');
          setSelectedPlayerToAdd(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Add Player to Game</h2>
            
            {addPlayerError && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid var(--danger)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ⚠️ {addPlayerError}
              </div>
            )}
            
            {availablePlayers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                All players are already in this game
              </p>
            ) : (
              <div className={styles.playerList}>
                {availablePlayers.map(player => (
                  <div 
                    key={player.id}
                    className={`${styles.playerItem} ${
                      selectedPlayerToAdd === player.id ? styles.selected : ''
                    }`}
                    onClick={() => setSelectedPlayerToAdd(player.id)}
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
                    {selectedPlayerToAdd === player.id && <span>✓</span>}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setAddPlayerError('');
                  setSelectedPlayerToAdd(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleConfirmAddPlayer}
                disabled={!selectedPlayerToAdd}
              >
                Confirm Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declare Winner Modal - For Chess Games */}
      {showDeclareWinnerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowDeclareWinnerModal(false);
          setSelectedWinner(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>👑 Declare Winner</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select the player who won this chess game:
            </p>
            
            <div className={styles.playerList}>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedWinner === player.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedWinner(player.id)}
                >
                  {getPlayerProfilePhoto(player.id) ? (
                    <img 
                      src={getPlayerProfilePhoto(player.id)} 
                      alt={player.name}
                      className={styles.playerAvatar}
                    />
                  ) : (
                    <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  )}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  {selectedWinner === player.id && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDeclareWinnerModal(false);
                  setSelectedWinner(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleDeclareWinner}
                disabled={!selectedWinner}
              >
                Confirm Winner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Draw Modal - For Chess Games */}
      {showMarkDrawModal && (
        <div className="modal-overlay" onClick={() => setShowMarkDrawModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🤝 Mark Game as Draw</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to mark this game as a draw? 
              <br /><br />
              <strong>Both players will:</strong>
              <br />• Have their total games count increased by 1
              <br />• NOT have any wins added
              <br />• Win percentage will be recalculated accordingly
            </p>
            
            <div className={styles.playerList}>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  className={styles.playerItem}
                  style={{ cursor: 'default', opacity: 0.8 }}
                >
                  {getPlayerProfilePhoto(player.id) ? (
                    <img 
                      src={getPlayerProfilePhoto(player.id)} 
                      alt={player.name}
                      className={styles.playerAvatar}
                    />
                  ) : (
                    <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  )}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowMarkDrawModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleMarkDraw}
              >
                Confirm Draw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Max Points Modal - For Rummy Games */}
      {showUpdateMaxPointsModal && (
        <div className="modal-overlay" onClick={() => {
          setShowUpdateMaxPointsModal(false);
          setNewMaxPoints('');
          setUpdateMaxPointsError('');
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎯 Update Max Points</h2>
            
            {updateMaxPointsError && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid var(--danger)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ⚠️ {updateMaxPointsError}
              </div>
            )}
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Change the maximum for this game.
              <br /><br />
              <strong>Note:</strong> Players equal to or above the new max will be marked as eliminated.
            </p>
            
            <div className="form-group">
              <label>Max</label>
              <input 
                type="number" 
                value={newMaxPoints}
                onChange={(e) => setNewMaxPoints(e.target.value)}
                onWheel={(e) => e.target.blur()}
                min="1"
                placeholder="0"
                autoFocus
              />
            </div>

            <div style={{ 
              padding: '12px', 
              marginTop: '16px',
              marginBottom: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Current Player Points:
              </h3>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '4px 0',
                    fontSize: '14px'
                  }}
                >
                  <span>
                    {getPlayerProfilePhoto(player.id) ? (
                      <img 
                        src={getPlayerProfilePhoto(player.id)} 
                        alt={player.name}
                        className={styles.playerAvatarSmall}
                        style={{ marginRight: '6px' }}
                      />
                    ) : (
                      <span className="avatar" style={{ fontSize: '16px', marginRight: '6px' }}>
                        {player.avatar}
                      </span>
                    )}
                    {player.name}
                  </span>
                  <span style={{ fontWeight: '600' }}>
                    {player.totalPoints}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowUpdateMaxPointsModal(false);
                  setNewMaxPoints('');
                  setUpdateMaxPointsError('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleUpdateMaxPoints}
              >
                Update Max Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Ace Player Modal - For Ace Games */}
      {showMarkAcePlayerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMarkAcePlayerModal(false);
          setSelectedAcePlayer(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎯 Mark Ace Player (Loser)</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select the player who lost this round (gets 0, others get 1):
            </p>
            
            <div className={styles.playerList}>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedAcePlayer === player.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedAcePlayer(player.id)}
                >
                  {getPlayerProfilePhoto(player.id) ? (
                    <img 
                      src={getPlayerProfilePhoto(player.id)} 
                      alt={player.name}
                      className={styles.playerAvatar}
                    />
                  ) : (
                    <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  )}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    ({player.totalPoints})
                  </span>
                  {selectedAcePlayer === player.id && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowMarkAcePlayerModal(false);
                  setSelectedAcePlayer(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleMarkAcePlayer}
                disabled={!selectedAcePlayer}
              >
                Mark as Ace (0)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Ace Game Modal - Declare Winners */}
      {showEndAceGameModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEndAceGameModal(false);
          setSelectedAceWinners([]);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🏁 End Game & Declare Winners</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Players with highest are pre-selected. Adjust if needed:
            </p>
            
            <div className={styles.playerList}>
              {[...game.players].sort((a, b) => b.totalPoints - a.totalPoints).map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedAceWinners.includes(player.id) ? styles.selected : ''
                  }`}
                  onClick={() => toggleAceWinner(player.id)}
                >
                  {getPlayerProfilePhoto(player.id) ? (
                    <img 
                      src={getPlayerProfilePhoto(player.id)} 
                      alt={player.name}
                      className={styles.playerAvatar}
                    />
                  ) : (
                    <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  )}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '600' }}>
                    {player.totalPoints}
                  </span>
                  {selectedAceWinners.includes(player.id) && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowEndAceGameModal(false);
                  setSelectedAceWinners([]);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleConfirmAceWinners}
                disabled={selectedAceWinners.length === 0}
              >
                Declare Winner{selectedAceWinners.length > 1 ? 's' : ''} 🎉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

