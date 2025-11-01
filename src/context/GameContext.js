'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * GameContext - Manages all game and player state
 * 
 * Data Persistence:
 * - Uses Vercel KV (Redis) for PERMANENT server-side storage
 * - Data persists across all devices and sessions
 * - Works on Vercel deployment with KV storage
 * - Falls back to localStorage for local development
 */

const GameContext = createContext();

// Helper function to save data to server
const saveToServer = async (key, data) => {
  try {
    const response = await fetch(`/api/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Fallback to localStorage if API fails (local development)
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
    return false;
  }
};

// Helper function to create a new game on server
const createGameOnServer = async (game) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(`/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(game),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[createGameOnServer] Failed:', errorData.error);
        return false;
      }
      
      return true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[createGameOnServer] Request timeout');
      } else {
        console.error('[createGameOnServer] Error:', fetchError.message);
      }
      return false;
    }
  } catch (error) {
    console.error('[createGameOnServer] Error creating game on server:', error);
    return false;
  }
};

// Helper function to update a single game
const updateGameOnServer = async (game) => {
  try {
    const response = await fetch(`/api/games`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // IMPORTANT: Include cookies for authentication
      body: JSON.stringify(game),
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to load data from server
const loadFromServer = async (key) => {
  try {
    const response = await fetch(`/api/${key}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Silent fail
  }
  return [];
};

export function GameProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [sseClientId, setSseClientId] = useState(null);

  // Helper functions for managing SSE client ID (using localStorage as primary, cookie as backup)
  const getClientIdFromStorage = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('sse_client_id');
      if (stored) return stored;
    } catch (e) {
      console.error('[GameContext SSE] localStorage error:', e);
    }
    
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sse_client_id') return value;
      }
    } catch (e) {
      console.error('[GameContext SSE] cookie error:', e);
    }
    
    return null;
  };

  const setClientIdInStorage = (clientId) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('sse_client_id', clientId);
    } catch (e) {
      console.error('[GameContext SSE] Failed to save to localStorage:', e);
    }
    
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `sse_client_id=${clientId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    } catch (e) {
      console.error('[GameContext SSE] Failed to save to cookie:', e);
    }
  };

  const removeClientIdFromStorage = () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('sse_client_id');
      document.cookie = 'sse_client_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (e) {
      console.error('[GameContext SSE] Error removing client ID:', e);
    }
  };

  // Load data on-demand (not on mount)
  const loadData = async () => {
    if (initialized) return; // Don't reload if already loaded
    
    setLoading(true);
    // Load users (as players) and games from API
    const loadedPlayers = await loadFromServer('users');
    const loadedGames = await loadFromServer('games');
    
    setPlayers(loadedPlayers);
    setGames(loadedGames);
    setInitialized(true);
    setLoading(false);
  };

  // Refresh players from server
  const refreshPlayers = async () => {
    const loadedPlayers = await loadFromServer('users');
    setPlayers(loadedPlayers);
  };

  // Refresh all data from server
  const refreshData = async () => {
    setLoading(true);
    const loadedPlayers = await loadFromServer('users');
    const loadedGames = await loadFromServer('games');
    setPlayers(loadedPlayers);
    setGames(loadedGames);
    setLoading(false);
  };

  // Initialize SSE without loading all games (lightweight for home page)
  const initializeSSE = () => {
    if (!initialized) {
      setInitialized(true); // This triggers the SSE useEffect
    }
  };

  // Set up Server-Sent Events (SSE) for real-time updates
  useEffect(() => {
    if (!initialized) return;
    
    const existingClientId = getClientIdFromStorage();
    if (existingClientId) {
      setSseClientId(existingClientId);
    }
    
    let eventSource = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let isCleanedUp = false;
    
    const connectSSE = () => {
      if (isCleanedUp) return;
      
      if (eventSource) {
        try {
          eventSource.close();
        } catch (e) {
          // Ignore
        }
      }
      
      try {
        const currentClientId = getClientIdFromStorage();
        const streamUrl = currentClientId 
          ? `/api/games/stream?clientId=${currentClientId}`
          : '/api/games/stream';
        
        eventSource = new EventSource(streamUrl);
        
        eventSource.onopen = () => {
          setSseConnected(true);
          reconnectAttempts = 0;
        };
        
        eventSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'connected':
                if (data.clientId) {
                  setSseClientId(data.clientId);
                  setClientIdInStorage(data.clientId);
                }
                break;
                
              case 'game_created':
                // Dispatch custom event for home page to listen
                window.dispatchEvent(new CustomEvent('game_created', { detail: data.payload }));
                
                if (data.payload.game) {
                  setGames(prevGames => {
                    const exists = prevGames.find(g => g.id === data.payload.gameId);
                    if (exists) {
                      return prevGames.map(g => 
                        g.id === data.payload.gameId ? data.payload.game : g
                      );
                    } else {
                      return [...prevGames, data.payload.game];
                    }
                  });
                } else {
                  const loadedGames = await loadFromServer('games');
                  setGames(loadedGames);
                }
                break;
                
              case 'game_updated':
                // Dispatch custom event for home page to listen
                window.dispatchEvent(new CustomEvent('game_updated', { detail: data.payload }));
                
                if (data.payload.game) {
                  setGames(prevGames => 
                    prevGames.map(g => 
                      g.id === data.payload.gameId ? data.payload.game : g
                    )
                  );
                } else {
                  const loadedGames = await loadFromServer('games');
                  setGames(loadedGames);
                }
                break;
                
              default:
                break;
            }
          } catch (error) {
            console.error('[GameContext SSE] Error parsing message:', error);
          }
        };
        
        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource.close();
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectTimeout = setTimeout(connectSSE, delay);
          }
        };
      } catch (error) {
        console.error('[GameContext SSE] Error creating EventSource:', error);
      }
    };
    
    // Initial connection
    connectSSE();
    
    // Note: We no longer need to explicitly disconnect on page unload
    // The server will detect the disconnection via the EventSource close
    // and the cookie ensures we reuse the same client ID on refresh
    
    // Cleanup on unmount
    return () => {
      isCleanedUp = true;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (eventSource) {
        try {
          eventSource.close();
        } catch (e) {
          // Ignore
        }
      }
      
      setSseConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]); // Only depend on initialized to avoid reconnection loops

  const addPlayer = (name) => {
    const avatars = ['🦸‍♂️', '🦹‍♂️', '🕷️', '🦇', '⚡', '💪', '🔥', '⭐', '🎯', '🏆', '👊', '🛡️', '⚔️', '🎪', '🎭', '🎬'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    const newPlayer = {
      id: Date.now().toString(),
      name,
      avatar: randomAvatar,
      wins: 0,
      totalGames: 0,
      winPercentage: 0,
      createdAt: new Date().toISOString()
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    return newPlayer;
  };

  const updatePlayer = (id, updates) => {
    setPlayers(prev => prev.map(player => 
      player.id === id ? { ...player, ...updates } : player
    ));
  };


  const createGame = async (gameType, selectedPlayerIds, maxPoints = 120, playerData = null, createdBy, customTitle = null) => {
    if (!createdBy) {
      console.error('[GameContext] Cannot create game: createdBy is required');
      throw new Error('User ID is required to create a game');
    }
    
    const now = new Date();
    const capitalizedGameType = gameType.charAt(0).toUpperCase() + gameType.slice(1);
    const playersSource = playerData && playerData.length > 0 ? playerData : players;

    // Use custom title if provided, otherwise generate default
    let gameTitle;
    if (customTitle) {
      gameTitle = customTitle;
    } else {
      const gameNumber = games.filter(g => 
        new Date(g.createdAt).toDateString() === now.toDateString()
      ).length + 1;
      gameTitle = `${capitalizedGameType} Game ${gameNumber}`;
    }

    const newGame = {
      id: Date.now().toString(),
      type: capitalizedGameType,
      title: gameTitle,
      createdAt: now.toISOString(),
      createdBy: createdBy,
      players: selectedPlayerIds.map(playerId => {
        const player = playersSource.find(p => p.id === playerId);
        if (!player) {
          console.error(`Player not found: ${playerId}`);
          return null;
        }
        return {
          id: playerId,
          name: player.name,
          avatar: player.avatar,
          totalPoints: 0,
          isLost: false
        };
      }).filter(Boolean),
      rounds: [],
      history: [],
      status: 'in_progress',
      winner: null,
      maxPoints: maxPoints
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    
    const serverResult = await createGameOnServer(newGame);
    
    if (!serverResult) {
      console.error('[GameContext] Failed to save game to server');
    }
    
    return newGame;
  };

  const addPlayerToGame = (gameId, playerId) => {
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    
    const isAce = game.type.toLowerCase() === 'ace';
    
    // For Rummy only: Check if any player has lost (reached max points)
    if (!isAce) {
      const hasLostPlayers = game.players.some(p => p.isLost);
      if (hasLostPlayers) {
        return { 
          success: false, 
          error: 'Cannot add players after someone has reached max points!' 
        };
      }
    }
    
    // Check if player already in game
    if (game.players.find(p => p.id === playerId)) {
      return { success: false, error: 'Player already in game' };
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    // Determine starting points based on game type
    let newPlayerPoints;
    if (isAce) {
      // For Ace games: new players start with 0 points
      newPlayerPoints = 0;
    } else {
      // For Rummy: Get maximum points among existing players and add 1
      const maxPoints = Math.max(...game.players.map(p => p.totalPoints), 0);
      newPlayerPoints = maxPoints + 1;
    }
    
    // Create player addition event
    const playerAddEvent = {
      id: Date.now().toString(),
      type: 'player_added',
      timestamp: new Date().toISOString(),
      playerId: playerId,
      playerName: player.name,
      playerAvatar: player.avatar,
      startingPoints: newPlayerPoints
    };
    
    // If history doesn't exist, initialize it with existing rounds
    let gameHistory = game.history || [];
    if (!game.history && game.rounds && game.rounds.length > 0) {
      // Convert old rounds to history format with type field
      gameHistory = game.rounds.map(round => ({
        ...round,
        type: 'round'
      }));
    }
    
    const updatedGame = {
      ...game,
      players: [...game.players, {
        id: playerId,
        name: player.name,
        avatar: player.avatar,
        totalPoints: newPlayerPoints,
        isLost: false
      }],
      history: [...gameHistory, playerAddEvent]
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
    
    return { success: true };
  };

  const addRound = async (gameId, roundScores, dropInfo = {}, winnerInfo = {}, doubleDropInfo = {}, fullInfo = {}, mustPlayInfo = {}) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return Promise.reject(new Error('Game not found'));
    
    const isAce = game.type.toLowerCase() === 'ace';
    
    const newRound = {
      id: Date.now().toString(),
      type: 'round',
      roundNumber: game.rounds.length + 1,
      scores: roundScores,
      drops: dropInfo, // Track which players dropped in this round (20 points)
      doubleDrops: doubleDropInfo, // Track which players double dropped (40 points)
      winners: winnerInfo, // Track which players won (got 0 points) in this round
      full: fullInfo, // Track which players were marked as Full/Final
      mustPlay: mustPlayInfo, // Track which players were in must-play status (for analytics)
      timestamp: new Date().toISOString()
    };

    let updatedGame;

    // For Ace: no elimination, just track points
    if (isAce) {
      const updatedPlayers = game.players.map(player => {
        const score = roundScores[player.id] || 0;
        const newTotal = player.totalPoints + score;
        return {
          ...player,
          totalPoints: newTotal,
          isLost: false // No elimination in Ace
        };
      });

      updatedGame = {
        ...game,
        rounds: [...game.rounds, newRound],
        history: [...(game.history || []), newRound],
        players: updatedPlayers,
        status: game.status, // Admin manually ends game
        winner: game.winner,
        winners: game.winners
      };
    } else {
      // For Rummy: original logic with elimination + drop status
      const updatedPlayers = game.players.map(player => {
        const score = roundScores[player.id] || 0;
        const newTotal = player.totalPoints + score;
        const hasDropped = dropInfo[player.id] === true;
        
        return {
          ...player,
          totalPoints: newTotal,
          isLost: newTotal >= game.maxPoints,
          isDropped: hasDropped || player.isDropped // Once dropped, stays dropped
        };
      });

      // Check if game is over
      const playersNotLost = updatedPlayers.filter(p => !p.isLost);
      let status = game.status;
      let winner = game.winner;

      if (playersNotLost.length === 1) {
        status = 'completed';
        winner = playersNotLost[0].id;
        
        const updatedPlayerStats = players.map(player => {
          const gamePlayer = updatedPlayers.find(gp => gp.id === player.id);
          if (gamePlayer) {
            const newTotalGames = player.totalGames + 1;
            const newWins = player.wins + (player.id === winner ? 1 : 0);
            const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
            return {
              ...player,
              totalGames: newTotalGames,
              wins: newWins,
              winPercentage
            };
          }
          return player;
        });
        
        setPlayers(updatedPlayerStats);
        saveToServer('players', updatedPlayerStats);
      } else if (playersNotLost.length === 0) {
        status = 'completed';
        // If all lost, the one with lowest score wins
        const sortedPlayers = [...updatedPlayers].sort((a, b) => a.totalPoints - b.totalPoints);
        winner = sortedPlayers[0].id;

        updatedPlayers.forEach(player => {
          updatePlayer(player.id, {
            totalGames: players.find(p => p.id === player.id).totalGames + 1,
            wins: player.id === winner 
              ? players.find(p => p.id === player.id).wins + 1 
              : players.find(p => p.id === player.id).wins
          });
        });

        setTimeout(() => {
          setPlayers(prev => prev.map(p => ({
            ...p,
            winPercentage: p.totalGames > 0 ? Math.round((p.wins / p.totalGames) * 100) : 0
          })));
        }, 100);
      }

      updatedGame = {
        ...game,
        rounds: [...game.rounds, newRound],
        history: [...(game.history || []), newRound],
        players: updatedPlayers,
        status,
        winner
      };
    }
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server and await the promise
    try {
      await updateGameOnServer(updatedGame);
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating game on server:', error);
      return Promise.reject(error);
    }
  };

  const updateRound = async (gameId, roundNumber, roundScores, dropInfo = {}, winnerInfo = {}, doubleDropInfo = {}, fullInfo = {}, mustPlayInfo = {}) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return Promise.reject(new Error('Game not found'));
    
    // Update the specific round
    const updatedRounds = game.rounds.map(round => 
      round.roundNumber === roundNumber 
        ? { ...round, scores: roundScores, drops: dropInfo, doubleDrops: doubleDropInfo, winners: winnerInfo, full: fullInfo, mustPlay: mustPlayInfo }
        : round
    );
    
    // Recalculate player totals from scratch
    const initialPlayers = game.players.map(p => ({ ...p, totalPoints: 0, isLost: false }));
    const isAce = game.type.toLowerCase() === 'ace';
    
    let recalculatedPlayers = [...initialPlayers];
    updatedRounds.forEach(round => {
      recalculatedPlayers = recalculatedPlayers.map(player => {
        const score = round.scores[player.id] || 0;
        const newTotal = player.totalPoints + score;
        const hasDropped = round.drops && round.drops[player.id] === true;
        return {
          ...player,
          totalPoints: newTotal,
          isLost: isAce ? false : newTotal >= game.maxPoints,
          isDropped: hasDropped || player.isDropped
        };
      });
    });
    
    // Check if game should be completed
    const playersNotLost = recalculatedPlayers.filter(p => !p.isLost);
    let status = game.status;
    let winner = game.winner;
    let completedAt = game.completedAt;
    
    if (!isAce && playersNotLost.length === 1) {
      status = 'completed';
      winner = playersNotLost[0].id;
      if (!completedAt) {
        completedAt = new Date().toISOString();
      }
    } else if (!isAce && playersNotLost.length === 0) {
      status = 'completed';
      if (!completedAt) {
        completedAt = new Date().toISOString();
      }
      // If all lost, the one with lowest score wins
      const sortedPlayers = [...recalculatedPlayers].sort((a, b) => a.totalPoints - b.totalPoints);
      winner = sortedPlayers[0].id;
    }
    
    const updatedGame = {
      ...game,
      rounds: updatedRounds,
      history: updatedRounds,
      players: recalculatedPlayers,
      status,
      winner,
      ...(completedAt && { completedAt })
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server and await the promise
    try {
      await updateGameOnServer(updatedGame);
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating game on server:', error);
      return Promise.reject(error);
    }
  };

  const declareWinner = (gameId, winnerId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Update player statistics
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const newWins = player.wins + (player.id === winnerId ? 1 : 0);
        const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          wins: newWins,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      winner: winnerId
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const declareDraw = (gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Update player statistics - totalGames increases but wins don't
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const winPercentage = newTotalGames > 0 ? Math.round((player.wins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      isDraw: true,
      winner: null
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const updateMaxPoints = (gameId, newMaxPoints) => {
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    
    // Validate max points
    if (!newMaxPoints || newMaxPoints < 1) {
      return { 
        success: false, 
        error: 'Max points must be greater than 0' 
      };
    }
    
    // Update max points and recalculate who is lost based on new max
    const updatedPlayers = game.players.map(player => ({
      ...player,
      isLost: player.totalPoints >= newMaxPoints
    }));
    
    const updatedGame = {
      ...game,
      maxPoints: newMaxPoints,
      players: updatedPlayers
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
    
    return { success: true };
  };

  const declareAceWinners = (gameId, winnerIds) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // For Ace: Calculate round wins (0-point rounds) for each player
    // Match winners don't get extra points - only round wins count
    const roundWinCounts = {};
    
    game.players.forEach(player => {
      roundWinCounts[player.id] = 0;
    });
    
    // Count round wins (0-point rounds) for each player
    if (game.rounds && game.rounds.length > 0) {
      game.rounds.forEach(round => {
        if (round.winners) {
          Object.keys(round.winners).forEach(playerId => {
            if (round.winners[playerId] === true) {
              roundWinCounts[playerId] = (roundWinCounts[playerId] || 0) + 1;
            }
          });
        }
      });
    }
    
    // Update player statistics - wins based on round wins, not match wins
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const roundWins = roundWinCounts[player.id] || 0;
        const newWins = player.wins + roundWins; // Add round wins, not match wins
        const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          wins: newWins,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      winners: winnerIds,
      winner: winnerIds[0], // Set first winner as primary (for compatibility)
      completedAt: new Date().toISOString()
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const getGame = (gameId) => {
    return games.find(game => game.id === gameId);
  };

  const getPlayerStats = () => {
    return [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
      return b.totalGames - a.totalGames;
    });
  };

  const value = {
    players,
    games,
    loading,
    sseConnected,
    loadData,
    initializeSSE,
    addPlayer,
    updatePlayer,
    createGame,
    addPlayerToGame,
    addRound,
    updateRound,
    declareWinner,
    declareDraw,
    updateMaxPoints,
    declareAceWinners,
    getGame,
    getPlayerStats,
    refreshPlayers,
    refreshData
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

