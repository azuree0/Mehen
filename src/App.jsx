import { useState, useEffect } from 'react';
import init, { GameState, Player } from '../pkg/mehen.js';
import './App.css';
import {
  initDatabase,
  createGame,
  saveMove,
  updateGame,
  getGameMoves
} from './database.js';

function App() {
  const [game, setGame] = useState(null);
  const [spiralPositions, setSpiralPositions] = useState([]);
  const [squareData, setSquareData] = useState([]);
  const [centerPieces, setCenterPieces] = useState([]);
  const [startPieces, setStartPieces] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(Player.Light);
  const [diceValue, setDiceValue] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('');
  const [currentGameId, setCurrentGameId] = useState(null);
  const [moveNumber, setMoveNumber] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);
  const [boardSize, setBoardSize] = useState(600);

  useEffect(() => {
    async function loadGame() {
      // Initialize database
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }

      await init();
      const newGame = new GameState();
      setGame(newGame);
      updateGameState(newGame);
      
      // Create a new game in database
      const gameId = createGame();
      setCurrentGameId(gameId);
      setMoveNumber(0);
    }
    loadGame();
  }, []);

  useEffect(() => {
    // Update board size on window resize
    const handleResize = () => {
      const board = document.getElementById('game-board');
      if (board) {
        setBoardSize(board.offsetWidth || 600);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function loadCurrentGameMoves() {
    if (currentGameId) {
      const moves = getGameMoves(currentGameId);
      setGameMoves(moves);
    } else {
      setGameMoves([]);
    }
  }

  function updateGameState(gameInstance) {
    if (!gameInstance) return;
    
    const boardSize = document.getElementById('game-board')?.offsetWidth || 600;
    const newSpiralPositions = gameInstance.get_spiral_positions(boardSize);
    const newSquareData = gameInstance.get_square_data();
    const newCenterPieces = gameInstance.get_center_pieces();
    const newStartPieces = gameInstance.get_start_pieces();
    const newCurrentPlayer = gameInstance.current_player;
    const newDiceValue = gameInstance.dice_value;
    const newGameOver = gameInstance.game_over;
    
    setSpiralPositions(newSpiralPositions);
    setSquareData(newSquareData);
    setCenterPieces(newCenterPieces);
    setStartPieces(newStartPieces);
    setCurrentPlayer(newCurrentPlayer);
    setDiceValue(newDiceValue);
    setGameOver(newGameOver);
    
    if (newGameOver) {
      setWinner(gameInstance.winner);
      const winnerName = gameInstance.winner === Player.Light ? 'Light' : 'Dark';
      setStatus(`Game Over! ${winnerName} Player Wins!`);
      
      // Update game in database with winner
      if (currentGameId) {
        updateGame(currentGameId, winnerName, moveNumber);
      }
    } else {
      setWinner(null);
      if (newDiceValue === 0) {
        setStatus('');
      } else {
        setStatus('Select a piece to move');
      }
    }
  }

  function handleRollDice() {
    if (!game || gameOver) return;
    
    const rolledValue = game.roll_dice();
    updateGameState(game);
    
    // Check if there are valid moves
    const moves = game.get_valid_moves();
    if (moves.length === 0 && rolledValue !== 0) {
      setStatus('No valid moves. Turn passes.');
      setTimeout(() => {
        game.pass_turn();
        updateGameState(game);
      }, 1000);
    }
  }

  function handleReset() {
    if (!game) return;
    
    // Create a new game in database
    const gameId = createGame();
    setCurrentGameId(gameId);
    setMoveNumber(0);
    
    game.reset();
    
    // Explicitly clear winner and status before updating game state
    setWinner(null);
    setStatus('');
    
    // Clear moves history for the new game
    setGameMoves([]);
    
    updateGameState(game);
  }

  function handleSquareClick(squareIndex) {
    if (!game || gameOver) return;
    
    if (diceValue === 0) return;
    
    const data = squareData[squareIndex];
    if (!data || !data.is_valid_move) return;
    
    // Find which piece is at this square
    const pieces = game.get_pieces();
    const validMoves = game.get_valid_moves();
    const playerPieces = currentPlayer === Player.Light ? pieces.light : pieces.dark;
    
    // Find which piece is at this square and if it can move
    for (let i = 0; i < playerPieces.length; i++) {
      const piecePos = playerPieces[i];
      const boardPos = piecePos === 36 ? 35 : (piecePos > 0 ? piecePos - 1 : -1);
      
      if (boardPos === squareIndex && validMoves.includes(i)) {
        const positionFrom = piecePos;
        const success = game.make_move(i);
        if (success) {
          const piecesAfter = game.get_pieces();
          const playerPiecesAfter = currentPlayer === Player.Light ? piecesAfter.light : piecesAfter.dark;
          const positionTo = playerPiecesAfter[i];
          
          // Record move in database
          if (currentGameId != null && currentGameId > 0) {
            const newMoveNumber = moveNumber + 1;
            setMoveNumber(newMoveNumber);
            const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';
            saveMove(
              currentGameId,
              playerName,
              i,
              positionFrom,
              positionTo,
              diceValue,
              newMoveNumber
            );
            // Refresh moves in history panel if it's open
            if (showHistory) {
              loadCurrentGameMoves();
            }
          }
          
          updateGameState(game);
        }
        return;
      }
    }
  }

  function handlePieceClick(pieceIndex) {
    if (!game || gameOver) return;
    
    const diceValue = game.dice_value;
    if (diceValue === 0) return;
    
    const validMoves = game.get_valid_moves();
    if (!validMoves.includes(pieceIndex)) {
      return;
    }
    
    const pieces = game.get_pieces();
    const playerPieces = currentPlayer === Player.Light ? pieces.light : pieces.dark;
    const positionFrom = playerPieces[pieceIndex];
    
    const success = game.make_move(pieceIndex);
    if (success) {
      const piecesAfter = game.get_pieces();
      const playerPiecesAfter = currentPlayer === Player.Light ? piecesAfter.light : piecesAfter.dark;
      const positionTo = playerPiecesAfter[pieceIndex];
      
      // Record move in database
      if (currentGameId != null && currentGameId > 0) {
        const newMoveNumber = moveNumber + 1;
        setMoveNumber(newMoveNumber);
        const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';
        saveMove(
          currentGameId,
          playerName,
          pieceIndex,
          positionFrom,
          positionTo,
          diceValue,
          newMoveNumber
        );
        if (showHistory) {
          loadCurrentGameMoves();
        }
      }
      
      updateGameState(game);
    }
  }

  const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';
  const squareSize = window.innerWidth <= 768 ? 45 : 55;

  return (
    <div className="container">
      <header>
        <h1>Mehen</h1>
      </header>
      
      <div className="game-info">
        <div className="player-info">
          <div id="current-player" className={`player-indicator ${currentPlayer === Player.Dark ? 'dark' : ''}`}>
            <span>Current: </span>
            <span id="player-name">{playerName}</span>
          </div>
          <div id="dice-display">
            <span>Dice: </span>
            <span id="dice-value">{diceValue || '-'}</span>
          </div>
        </div>
        <div className="controls">
          <button 
            id="roll-btn" 
            className="btn btn-primary"
            onClick={handleRollDice}
            disabled={diceValue !== 0 || gameOver}
          >
            Roll Dice
          </button>
          <button 
            id="reset-btn" 
            className="btn btn-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
          <button 
            className="btn btn-history"
            onClick={() => {
              if (!showHistory) {
                loadCurrentGameMoves();
              }
              setShowHistory(!showHistory);
            }}
          >
            History
          </button>
        </div>
      </div>
      
      <div id="game-board" className="board">
        {spiralPositions.map((pos, squareIndex) => {
          const data = squareData[squareIndex];
          if (!data) return null;
          
          let content = '';
          let squareClassName = 'square spiral-square';
          
          // Determine piece content
          switch (data.square_type) {
            case 1: // LightPiece
              content = '○';
              squareClassName += ' light-piece';
              break;
            case 2: // DarkPiece
              content = '●';
              squareClassName += ' dark-piece';
              break;
            default:
              squareClassName += ' empty';
          }
          
          if (data.is_valid_move) {
            squareClassName += ' valid-move';
          }
          
          if (data.is_center) {
            squareClassName += ' center';
          }
          
          return (
            <div
              key={squareIndex}
              className={squareClassName}
              style={{
                left: `${pos.x - squareSize / 2}px`,
                top: `${pos.y - squareSize / 2}px`
              }}
              onClick={() => handleSquareClick(squareIndex)}
            >
              {content}
              <span className="square-number">{squareIndex + 1}</span>
            </div>
          );
        })}
        
        {/* Center (snake's head) */}
        <div className="center-head">
          {centerPieces.map((p, idx) => (
            <span key={idx} className={`center-piece ${p.player}-piece`}>
              {p.player === 'light' ? '○' : '●'}
            </span>
          ))}
        </div>
      </div>
      
      {/* Start area */}
      {startPieces.length > 0 && (
        <div className="start-area">
          <div className="start-pieces">
            <strong>Add Piece:</strong>
            {startPieces.map((p, idx) => (
              <span
                key={idx}
                className={`start-piece ${p.is_valid_move ? 'valid-move' : ''}`}
                onClick={() => p.is_valid_move && handlePieceClick(p.index)}
              >
                {currentPlayer === Player.Light ? '○' : '●'}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div 
        id="status" 
        className="status"
        style={{ color: gameOver ? '#ff6347' : '#667eea' }}
      >
        {status}
      </div>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h2>Record</h2>
            {currentGameId && (
              <div className="history-game-info">
                <span>Game #{currentGameId}</span>
              </div>
            )}
          </div>
          
          {gameMoves.length === 0 ? (
            <div className="history-empty">No moves.</div>
          ) : (
            <div className="history-content">
              <div className="history-moves">
                <h3>Moves</h3>
                <div className="moves-list">
                  {gameMoves.map((move) => (
                    <div key={move.id} className="move-item">
                      <span className="move-number">#{move.move_number}</span>
                      <span className={`move-player ${move.player.toLowerCase()}`}>
                        {move.player}
                      </span>
                      <span className="move-details">
                        Piece {move.piece_index + 1}: {move.position_from === 0 ? 'Start' : `Pos ${move.position_from}`}
                        {' → '}
                        {move.position_to === 36 ? 'Center' : `Pos ${move.position_to}`}
                      </span>
                      <span className="move-dice">🎲 {move.dice_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
