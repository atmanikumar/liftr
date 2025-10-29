import { createClient } from '@libsql/client';

// Create Turso client
let client = null;

export function getTursoClient() {
  if (!client) {
    try {
      client = createClient({
        url: process.env.TURSO_DATABASE_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      });
    } catch (error) {
      return null;
    }
  }
  return client;
}

// Initialize database tables (migration only - add profilePhoto column)
export async function initDatabase() {

}

// Users operations
export async function getUsers() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    const result = await db.execute('SELECT * FROM users');
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt,
      profilePhoto: row.profilePhoto || null
    }));
  } catch (error) {
    return [];
  }
}

export async function saveUsers(users) {
  const db = getTursoClient();
  if (!db) {
    return false;
  }

  try {
    // Get existing users to preserve profilePhoto
    const existingUsersResult = await db.execute('SELECT id, profilePhoto FROM users');
    const existingPhotos = {};
    existingUsersResult.rows.forEach(row => {
      if (row.profilePhoto) {
        existingPhotos[row.id] = row.profilePhoto;
      }
    });
    
    // Upsert all users (preserve existing profilePhotos)
    for (const user of users) {
      // Ensure all values are primitive types (strings, numbers, etc.)
      const safeUser = {
        id: String(user.id || ''),
        username: String(user.username || ''),
        password: String(user.password || ''),
        name: String(user.name || ''),
        role: String(user.role || 'player'),
        createdAt: String(user.createdAt || new Date().toISOString()),
        // Preserve existing profilePhoto if not provided in user object
        profilePhoto: user.profilePhoto 
          ? String(user.profilePhoto) 
          : (existingPhotos[user.id] || null)
      };
      
      await db.execute({
        sql: `INSERT OR REPLACE INTO users (id, username, password, name, role, createdAt, profilePhoto) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          safeUser.id,
          safeUser.username,
          safeUser.password,
          safeUser.name,
          safeUser.role,
          safeUser.createdAt,
          safeUser.profilePhoto
        ]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

// Players operations
export async function getPlayers() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    const result = await db.execute('SELECT * FROM players');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      wins: row.wins || 0,
      gamesPlayed: row.gamesPlayed || 0,
      totalGames: row.totalGames || 0,
      winPercentage: row.winPercentage || 0,
      rank: row.rank || 0
    }));
  } catch (error) {
    return [];
  }
}

export async function savePlayers(players) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    // Avoid duplicates
    const uniquePlayers = Array.from(
      new Map(players.map(p => [p.id, p])).values()
    );
    
    // Use INSERT OR REPLACE to upsert each player
    for (const player of uniquePlayers) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO players (id, name, avatar, wins, gamesPlayed, totalGames, winPercentage, rank) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          player.id || '',
          player.name || '',
          player.avatar || '👤',
          player.wins || 0,
          player.gamesPlayed || 0,
          player.totalGames || 0,
          player.winPercentage || 0,
          player.rank || 0
        ]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving players:', error);
    return false;
  }
}

// Games operations
export async function getGames() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    // Get Rummy games
    const gamesResult = await db.execute('SELECT * FROM games');
    const rummyGames = gamesResult.rows.map(row => JSON.parse(row.data));
    
    // Get Chess games from separate table
    const chessResult = await db.execute('SELECT * FROM chess_games');
    const chessGames = chessResult.rows.map(row => ({
      id: row.id,
      type: 'Chess',
      title: row.title,
      createdAt: row.createdAt,
      status: row.status,
      winner: row.winner,
      isDraw: row.isDraw === 1 || row.isDraw === true,
      maxPoints: null,
      players: [
        {
          id: row.player1_id,
          name: row.player1_name,
          avatar: row.player1_avatar,
          totalPoints: 0,
          isLost: false
        },
        {
          id: row.player2_id,
          name: row.player2_name,
          avatar: row.player2_avatar,
          totalPoints: 0,
          isLost: false
        }
      ],
      rounds: [],
      history: []
    }));
    
    // Get Ace games from separate table
    const aceResult = await db.execute('SELECT * FROM ace_games');
    const aceGames = aceResult.rows.map(row => {
      const gameData = JSON.parse(row.data);
      // Add winners array if completed
      if (row.status === 'completed' && row.winners) {
        gameData.winners = row.winners.split(',');
      }
      return gameData;
    });
    
    // Combine all arrays
    return [...rummyGames, ...chessGames, ...aceGames];
  } catch (error) {
    return [];
  }
}

export async function getGameById(gameId) {
  const db = getTursoClient();
  if (!db) return null;

  try {
    // Try Rummy games table first
    const rummyResult = await db.execute({
      sql: 'SELECT * FROM games WHERE id = ?',
      args: [gameId]
    });
    
    if (rummyResult.rows.length > 0) {
      return JSON.parse(rummyResult.rows[0].data);
    }
    
    // Try Chess games table
    const chessResult = await db.execute({
      sql: 'SELECT * FROM chess_games WHERE id = ?',
      args: [gameId]
    });
    
    if (chessResult.rows.length > 0) {
      const row = chessResult.rows[0];
      return {
        id: row.id,
        type: 'Chess',
        title: row.title,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        status: row.status,
        winner: row.winner,
        isDraw: row.isDraw === 1 || row.isDraw === true,
        maxPoints: null,
        players: [
          {
            id: row.player1_id,
            name: row.player1_name,
            avatar: row.player1_avatar,
            totalPoints: 0,
            isLost: false
          },
          {
            id: row.player2_id,
            name: row.player2_name,
            avatar: row.player2_avatar,
            totalPoints: 0,
            isLost: false
          }
        ],
        rounds: [],
        history: []
      };
    }
    
    // Try Ace games table
    const aceResult = await db.execute({
      sql: 'SELECT * FROM ace_games WHERE id = ?',
      args: [gameId]
    });
    
    if (aceResult.rows.length > 0) {
      const row = aceResult.rows[0];
      const gameData = JSON.parse(row.data);
      // Add winners array if completed
      if (row.status === 'completed' && row.winners) {
        gameData.winners = row.winners.split(',');
      }
      return gameData;
    }
    
    // Game not found in any table
    return null;
  } catch (error) {
    console.error('Error fetching game by ID:', error);
    return null;
  }
}

export async function saveGames(games) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    // Separate games by type
    const chessGames = games.filter(g => g.type.toLowerCase() === 'chess');
    const aceGames = games.filter(g => g.type.toLowerCase() === 'ace');
    const rummyGames = games.filter(g => g.type.toLowerCase() === 'rummy');
    
    // Upsert Rummy games
    for (const game of rummyGames) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO games (id, type, title, createdAt, status, winner, maxPoints, createdBy, data) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.type,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.maxPoints,
          game.createdBy,
          JSON.stringify(game)
        ]
      });
    }
    
    // Upsert Chess games to separate table
    for (const game of chessGames) {
      // Chess requires exactly 2 players
      if (game.players.length === 2) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO chess_games (id, title, createdAt, status, winner, isDraw, createdBy,
                player1_id, player1_name, player1_avatar, 
                player2_id, player2_name, player2_avatar) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            game.id,
            game.title,
            game.createdAt,
            game.status,
            game.winner || null,
            game.isDraw ? 1 : 0,
            game.createdBy,
            game.players[0].id,
            game.players[0].name,
            game.players[0].avatar,
            game.players[1].id,
            game.players[1].name,
            game.players[1].avatar
          ]
        });
      }
    }
    
    // Upsert Ace games to separate table
    for (const game of aceGames) {
      // winners is a comma-separated list of winner IDs
      const winners = game.status === 'completed' && game.winners 
        ? game.winners.join(',') 
        : null;
      
      await db.execute({
        sql: `INSERT OR REPLACE INTO ace_games (id, title, createdAt, status, winners, createdBy, data) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          winners,
          game.createdBy,
          JSON.stringify(game)
        ]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving games:', error);
    return false;
  }
}

// Update or Insert a specific game in database
export async function updateGameInDB(game) {
  const db = getTursoClient();
  if (!db) {
    console.error('[Turso updateGameInDB] No database client');
    return false;
  }

  try {
    const type = game.type.toLowerCase();
    console.log('[Turso updateGameInDB] Inserting game:', {
      id: game.id,
      type: type,
      createdBy: game.createdBy,
      status: game.status
    });
    
    if (type === 'chess') {
      // Chess requires exactly 2 players
      if (game.players.length !== 2) {
        return false;
      }
      
      // Try to insert, if exists then update
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO chess_games 
              (id, title, createdAt, status, winner, isDraw, createdBy,
               player1_id, player1_name, player1_avatar,
               player2_id, player2_name, player2_avatar)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.isDraw ? 1 : 0,
          game.createdBy,
          game.players[0].id,
          game.players[0].name,
          game.players[0].avatar,
          game.players[1].id,
          game.players[1].name,
          game.players[1].avatar
        ]
      });
    } else if (type === 'ace') {
      const winners = game.status === 'completed' && game.winners 
        ? game.winners.join(',') 
        : null;
      
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO ace_games (id, title, createdAt, status, winners, createdBy, data)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          winners,
          game.createdBy,
          JSON.stringify(game)
        ]
      });
    } else if (type === 'rummy') {
      console.log('[Turso updateGameInDB] Inserting Rummy game with createdBy:', game.createdBy);
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO games (id, type, title, createdAt, status, winner, maxPoints, createdBy, data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.type,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.maxPoints,
          game.createdBy,
          JSON.stringify(game)
        ]
      });
      console.log('[Turso updateGameInDB] Rummy game inserted successfully, rows affected:', result.rowsAffected);
    } else {
      console.error('[Turso updateGameInDB] Unknown game type:', type);
      return false;
    }
    
    console.log('[Turso updateGameInDB] Game saved successfully');
    return true;
  } catch (error) {
    console.error('[Turso updateGameInDB] Error saving game:', error);
    return false;
  }
}


// Update user profile photo
export async function updateUserProfilePhoto(userId, photoUrl) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    const result = await db.execute({
      sql: `UPDATE users SET profilePhoto = ? WHERE id = ?`,
      args: [photoUrl, userId]
    });
    
    return result.rowsAffected > 0;
  } catch (error) {
    return false;
  }
}

// Get user by ID
export async function getUserById(userId) {
  const db = getTursoClient();
  if (!db) return null;

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt,
      profilePhoto: row.profilePhoto || null
    };
  } catch (error) {
    return null;
  }
}

// Helper function for generic data operations
export async function getData(key) {
  switch (key) {
    case 'users':
      return getUsers();
    case 'players':
      return getPlayers();
    case 'games':
      return getGames();
    default:
      return [];
  }
}

export async function saveData(key, data) {
  switch (key) {
    case 'users':
      return saveUsers(data);
    case 'players':
      return savePlayers(data);
    case 'games':
      return saveGames(data);
    default:
      return false;
  }
}

