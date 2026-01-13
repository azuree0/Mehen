import initSqlJs from 'sql.js';

let db = null;
let SQL = null;

/**
 * Initialize the SQL.js database
 */
export async function initDatabase() {
  if (db) return db;
  
  try {
    // Initialize SQL.js
    SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });
    
    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('mehen_database');
    if (savedDb) {
      try {
        const binary = atob(savedDb);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          buffer[i] = binary.charCodeAt(i);
        }
        db = new SQL.Database(buffer);
        // Verify database has tables
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        if (tables.length === 0) {
          createTables();
        }
      } catch (e) {
        console.warn('Failed to load saved database, creating new one:', e);
        db = new SQL.Database();
        createTables();
      }
    } else {
      // Create new database
      db = new SQL.Database();
      createTables();
    }
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Return null if database can't be initialized
    // The app should still work without database features
    return null;
  }
}

/**
 * Create database tables
 */
function createTables() {
  if (!db) return;
  
  // Games table
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1 TEXT DEFAULT 'Light',
      player2 TEXT DEFAULT 'Dark',
      winner TEXT,
      moves_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Moves table
  db.run(`
    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER,
      player TEXT NOT NULL,
      piece_index INTEGER,
      position_from INTEGER,
      position_to INTEGER,
      dice_value INTEGER,
      move_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);
  
  // Game states table (for saving/loading games)
  db.run(`
    CREATE TABLE IF NOT EXISTS game_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER,
      board_state TEXT NOT NULL,
      current_player TEXT NOT NULL,
      dice_value INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);
  
  saveDatabase();
}

/**
 * Save database to localStorage
 */
function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    // Convert Uint8Array to base64 (browser-compatible)
    const binary = String.fromCharCode.apply(null, data);
    const base64 = btoa(binary);
    localStorage.setItem('mehen_database', base64);
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

/**
 * Create a new game record
 */
export function createGame(player1 = 'Light', player2 = 'Dark') {
  if (!db) {
    console.warn('Database not initialized');
    return null;
  }
  
  try {
    db.run(
      'INSERT INTO games (player1, player2) VALUES (?, ?)',
      [player1, player2]
    );
    saveDatabase();
    
    // Get the last insert rowid using db.exec
    const result = db.exec('SELECT last_insert_rowid() as id');
    
    if (result.length > 0 && result[0].values && result[0].values.length > 0) {
      const gameId = result[0].values[0][0];
      // If gameId is 0 or falsy, try alternative method: get MAX(id) from games table
      if (!gameId || gameId === 0) {
        const maxResult = db.exec('SELECT MAX(id) as id FROM games');
        if (maxResult.length > 0 && maxResult[0].values && maxResult[0].values.length > 0) {
          const maxId = maxResult[0].values[0][0];
          return maxId || null;
        }
      } else {
        return gameId;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to create game:', error);
    return null;
  }
}

/**
 * Update game with winner and move count
 */
export function updateGame(gameId, winner, movesCount) {
  if (!db || !gameId) return;
  
  try {
    db.run(
      'UPDATE games SET winner = ?, moves_count = ? WHERE id = ?',
      [winner, movesCount, gameId]
    );
    saveDatabase();
  } catch (error) {
    console.error('Failed to update game:', error);
  }
}

/**
 * Save a move to the database
 */
export function saveMove(gameId, player, pieceIndex, positionFrom, positionTo, diceValue, moveNumber) {
  if (!db || !gameId) {
    return;
  }
  
  try {
    db.run(
      `INSERT INTO moves (game_id, player, piece_index, position_from, position_to, dice_value, move_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [gameId, player, pieceIndex, positionFrom, positionTo, diceValue, moveNumber]
    );
    saveDatabase();
  } catch (error) {
    console.error('Failed to save move:', error);
  }
}

/**
 * Save game state
 */
export function saveGameState(gameId, boardState, currentPlayer, diceValue) {
  if (!db || !gameId) return;
  
  try {
    const boardJson = JSON.stringify(boardState);
    db.run(
      `INSERT INTO game_states (game_id, board_state, current_player, dice_value)
       VALUES (?, ?, ?, ?)`,
      [gameId, boardJson, currentPlayer, diceValue]
    );
    saveDatabase();
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Get all games
 */
export function getAllGames() {
  if (!db) return [];
  
  try {
    const result = db.exec('SELECT * FROM games ORDER BY created_at DESC');
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
      const game = {};
      columns.forEach((col, idx) => {
        game[col] = row[idx];
      });
      return game;
    });
  } catch (error) {
    console.error('Failed to get games:', error);
    return [];
  }
}

/**
 * Get moves for a specific game
 */
export function getGameMoves(gameId) {
  if (!db || !gameId) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM moves WHERE game_id = ? ORDER BY move_number ASC');
    stmt.bind([gameId]);
    const result = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      result.push(row);
    }
    
    stmt.free();
    return result;
  } catch (error) {
    console.error('Failed to get moves:', error);
    return [];
  }
}

/**
 * Get game statistics
 */
export function getGameStats(games = null) {
  if (!db) return { totalGames: 0, lightWins: 0, darkWins: 0, totalMoves: 0 };
  
  try {
    const gamesList = games || getAllGames();
    const totalGames = gamesList.length;
    const lightWins = gamesList.filter(g => g.winner === 'Light').length;
    const darkWins = gamesList.filter(g => g.winner === 'Dark').length;
    
    const movesResult = db.exec('SELECT COUNT(*) as count FROM moves');
    const totalMoves = movesResult.length > 0 && movesResult[0].values.length > 0
      ? movesResult[0].values[0][0]
      : 0;
    
    return {
      totalGames,
      lightWins,
      darkWins,
      totalMoves
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { totalGames: 0, lightWins: 0, darkWins: 0, totalMoves: 0 };
  }
}

/**
 * Clear all database data
 */
export function clearDatabase() {
  if (!db) return;
  
  try {
    db.run('DELETE FROM moves');
    db.run('DELETE FROM game_states');
    db.run('DELETE FROM games');
    saveDatabase();
  } catch (error) {
    console.error('Failed to clear database:', error);
  }
}
