import init, { GameState, Player } from './pkg/mehen.js';

let game = null;

async function run() {
    await init();
    game = new GameState();
    renderBoard();
    updateUI();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('roll-btn').addEventListener('click', () => {
        if (!game || game.game_over) {
            return;
        }
        
        const diceValue = game.roll_dice();
        renderBoard();
        updateUI();
        
        // Check if there are valid moves
        const validMoves = game.get_valid_moves();
        if (validMoves.length === 0 && diceValue !== 0) {
            document.getElementById('status').textContent = 'No valid moves. Turn passes.';
            setTimeout(() => {
                game.pass_turn();
                renderBoard();
                updateUI();
            }, 1000);
        }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!game) {
            return;
        }
        game.reset();
        renderBoard();
        updateUI();
    });
}

function renderBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    // Get board size for spiral calculation
    const boardSize = board.offsetWidth || 600;
    const spiralPositions = game.get_spiral_positions(boardSize);
    const squareData = game.get_square_data();
    const centerPieces = game.get_center_pieces();
    const startPieces = game.get_start_pieces();
    
    for (let squareIndex = 0; squareIndex < spiralPositions.length; squareIndex++) {
        const pos = spiralPositions[squareIndex];
        const square = document.createElement('div');
        square.className = 'square spiral-square';
        square.dataset.index = squareIndex;
        
        // Position the square absolutely based on calculated x, y
        const squareSize = window.innerWidth <= 768 ? 45 : 55;
        const squareHalf = squareSize / 2;
        square.style.left = `${pos.x - squareHalf}px`;
        square.style.top = `${pos.y - squareHalf}px`;
        
        const data = squareData[squareIndex];
        let content = '';
        
        // Determine piece content
        switch (data.square_type) {
            case 1: // LightPiece
                content = '○';
                square.className += ' light-piece';
                break;
            case 2: // DarkPiece
                content = '●';
                square.className += ' dark-piece';
                break;
            default:
                square.className += ' empty';
        }
        
        if (data.is_valid_move) {
            square.className += ' valid-move';
        }
        
        if (data.is_center) {
            square.className += ' center';
        }
        
        square.textContent = content;
        
        // Add square number
        const number = document.createElement('span');
        number.className = 'square-number';
        number.textContent = squareIndex + 1;
        square.appendChild(number);
        
        square.addEventListener('click', () => handleSquareClick(squareIndex));
        board.appendChild(square);
    }
    
    // Add center (snake's head) - position 36
    const center = document.createElement('div');
    center.className = 'center-head';
    center.dataset.index = 35;
    
    if (centerPieces.length > 0) {
        centerPieces.forEach(p => {
            const piece = document.createElement('span');
            piece.className = `center-piece ${p.player}-piece`;
            piece.textContent = p.player === 'light' ? '○' : '●';
            center.appendChild(piece);
        });
    }
    
    board.appendChild(center);
    
    // Render start area pieces
    renderStartArea(startPieces);
}


function renderStartArea(startPieces) {
    // Remove existing start area if present
    const existingStartArea = document.querySelector('.start-area');
    if (existingStartArea) {
        existingStartArea.remove();
    }
    
    // Create start area display for pieces not yet on the board
    const startArea = document.createElement('div');
    startArea.className = 'start-area';
    
    const currentPlayer = game.current_player;
    const startPiecesDiv = document.createElement('div');
    startPiecesDiv.className = 'start-pieces';
    startPiecesDiv.innerHTML = '<strong>Add Piece:</strong> ';
    
    startPieces.forEach(p => {
        const pieceEl = document.createElement('span');
        pieceEl.className = 'start-piece';
        pieceEl.textContent = currentPlayer === Player.Light ? '○' : '●';
        pieceEl.dataset.pieceIndex = p.index;
        
        if (p.is_valid_move) {
            pieceEl.className += ' valid-move';
            pieceEl.addEventListener('click', () => handlePieceClick(p.index));
        }
        
        startPiecesDiv.appendChild(pieceEl);
    });
    
    startArea.appendChild(startPiecesDiv);
    document.getElementById('game-board').parentNode.insertBefore(startArea, document.getElementById('game-board').nextSibling);
}

function updateUI() {
    const currentPlayer = game.current_player;
    const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';
    const playerNameEl = document.getElementById('player-name');
    playerNameEl.textContent = playerName;
    playerNameEl.className = currentPlayer === Player.Light ? '' : 'dark';
    
    const diceValue = game.dice_value;
    document.getElementById('dice-value').textContent = diceValue || '-';
    
    const rollBtn = document.getElementById('roll-btn');
    rollBtn.disabled = diceValue !== 0 || game.game_over;
    
    const statusEl = document.getElementById('status');
    if (game.game_over) {
        const winner = game.winner;
        const winnerName = winner === Player.Light ? 'Light' : 'Dark';
        statusEl.textContent = `Game Over! ${winnerName} Player Wins!`;
        statusEl.style.color = '#ff6347';
    } else if (diceValue === 0) {
        statusEl.textContent = '';
        statusEl.style.color = '#667eea';
    } else {
        statusEl.textContent = 'Select a piece to move';
        statusEl.style.color = '#667eea';
    }
}

function handleSquareClick(squareIndex) {
    if (!game || game.game_over()) {
        return;
    }
    
    const diceValue = game.dice_value();
    if (diceValue === 0) {
        return;
    }
    
    const squareData = game.get_square_data();
    const data = squareData[squareIndex];
    
    if (!data.is_valid_move) {
        return;
    }
    
    // Find which piece is at this square
    const pieces = game.get_pieces();
    const validMoves = game.get_valid_moves();
    const currentPlayer = game.current_player();
    const playerPieces = currentPlayer === Player.Light ? pieces.light : pieces.dark;
    
    // Find which piece is at this square and if it can move
    for (let i = 0; i < playerPieces.length; i++) {
        const piecePos = playerPieces[i];
        const boardPos = piecePos === 36 ? 35 : (piecePos > 0 ? piecePos - 1 : -1);
        
        if (boardPos === squareIndex && validMoves.includes(i)) {
            const success = game.make_move(i);
            if (success) {
                renderBoard();
                updateUI();
            }
            return;
        }
    }
}

function handlePieceClick(pieceIndex) {
    if (!game || game.game_over) {
        return;
    }
    
    const diceValue = game.dice_value;
    if (diceValue === 0) {
        return;
    }
    
    const validMoves = game.get_valid_moves();
    if (!validMoves.includes(pieceIndex)) {
        return;
    }
    
    const success = game.make_move(pieceIndex);
    if (success) {
        renderBoard();
        updateUI();
    }
}

run().catch(console.error);

