import init, { GameState } from './pkg/mehen.js';

let game = null;
let boardSize = 600;

async function loadGame() {
    await init();
    game = new GameState();
    updateGameState();
}

function updateGameState() {
    if (!game) return;
    
    const board = document.getElementById('game-board');
    boardSize = board ? board.offsetWidth : 600;
    
    const statusDisplay = game.get_status_display();
    updateStatus(statusDisplay.message, statusDisplay.color);
    renderBoard();
    updateUI();
}

function renderBoard() {
    const board = document.getElementById('game-board');
    if (!board) return;
    
    const existingSquares = board.querySelectorAll('.spiral-square');
    existingSquares.forEach(sq => sq.remove());
    
    const squareSize = game.get_square_size(window.innerWidth);
    const spiralPositions = game.get_spiral_positions(boardSize);
    
    spiralPositions.forEach((pos, squareIndex) => {
        const renderInfo = game.get_square_render_info(squareIndex, squareSize, boardSize);
        
        const square = document.createElement('div');
        square.className = renderInfo.classes;
        square.style.left = `${renderInfo.left}px`;
        square.style.top = `${renderInfo.top}px`;
        square.innerHTML = renderInfo.inner_html;
        square.onclick = () => handleSquareClick(squareIndex);
        
        board.appendChild(square);
    });
    
    const centerHead = board.querySelector('.center-head');
    if (centerHead) {
        centerHead.innerHTML = '';
        const centerPieces = game.get_center_pieces_html();
        centerPieces.forEach((p) => {
            const piece = document.createElement('span');
            piece.className = p.class;
            piece.textContent = p.text;
            centerHead.appendChild(piece);
        });
    }
    
    const startArea = document.querySelector('.start-area');
    const startPieces = game.get_start_pieces_html();
    if (startPieces.length > 0) {
        if (!startArea) {
            const area = document.createElement('div');
            area.className = 'start-area';
            const piecesDiv = document.createElement('div');
            piecesDiv.className = 'start-pieces';
            piecesDiv.innerHTML = '<strong>Add Piece:</strong>';
            area.appendChild(piecesDiv);
            document.querySelector('.container').insertBefore(area, document.getElementById('status'));
        }
        
        const piecesDiv = document.querySelector('.start-pieces');
        if (piecesDiv) {
            const existingPieces = piecesDiv.querySelectorAll('.start-piece');
            existingPieces.forEach(p => p.remove());
            
            startPieces.forEach((p) => {
                const piece = document.createElement('span');
                piece.className = p.class;
                piece.textContent = p.text;
                if (p.is_valid) {
                    piece.onclick = () => handlePieceClick(p.index);
                }
                piecesDiv.appendChild(piece);
            });
        }
    } else if (startArea) {
        startArea.remove();
    }
}

function updateUI() {
    const playerNameEl = document.getElementById('player-name');
    const diceValueEl = document.getElementById('dice-value');
    const rollBtn = document.getElementById('roll-btn');
    const playerIndicator = document.getElementById('current-player');
    const uiState = game.get_ui_state();
    
    if (playerNameEl) {
        playerNameEl.textContent = game.get_player_name();
        playerIndicator.className = game.get_player_indicator_class();
    }
    
    if (diceValueEl) {
        diceValueEl.textContent = game.get_dice_display();
    }
    
    if (rollBtn) {
        rollBtn.disabled = uiState.roll_button_disabled;
    }
}

function updateStatus(message, color) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = color;
    }
}

function handleRollDice() {
    if (!game || game.game_over) return;
    
    const rolledValue = game.roll_dice();
    updateGameState();
    
    if (game.should_auto_pass_turn(rolledValue)) {
        setTimeout(() => {
            game.pass_turn();
            updateGameState();
        }, 1000);
    }
}

function handleReset() {
    if (!game) return;
    
    game.reset();
    const statusDisplay = game.get_status_display();
    updateStatus(statusDisplay.message, statusDisplay.color);
    updateGameState();
}

function handleSquareClick(squareIndex) {
    if (!game || game.game_over) return;
    
    const pieceIndex = game.handle_square_click(squareIndex);
    if (pieceIndex !== null && pieceIndex !== undefined) {
        if (game.make_move(pieceIndex)) {
            updateGameState();
        }
    }
}

function handlePieceClick(pieceIndex) {
    if (!game || game.game_over) return;
    
    if (game.make_move(pieceIndex)) {
        updateGameState();
    }
}

function handleResize() {
    const board = document.getElementById('game-board');
    if (board) {
        boardSize = board.offsetWidth || 600;
        if (game) {
            updateGameState();
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    
    document.getElementById('roll-btn').onclick = handleRollDice;
    document.getElementById('reset-btn').onclick = handleReset;
    
    window.addEventListener('resize', handleResize);
    handleResize();
});
