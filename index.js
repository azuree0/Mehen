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
    
    const boardArray = game.get_board();
    const pieces = game.get_pieces();
    const validMoves = game.get_valid_moves();
    
    // Mehen board layout: circular spiral with concentric rings
    // Based on archaeological artifacts: outer ring ~18, middle ~12, inner ~6, center
    const spiralPositions = createCircularSpiralLayout();
    
    spiralPositions.forEach((pos, squareIndex) => {
        const square = document.createElement('div');
        square.className = 'square spiral-square';
        square.dataset.index = squareIndex;
        
        // Position the square absolutely based on calculated x, y
        // Square size is 55px (45px on mobile), so offset by half
        const squareSize = window.innerWidth <= 768 ? 45 : 55;
        const squareHalf = squareSize / 2;
        square.style.left = `${pos.x - squareHalf}px`;
        square.style.top = `${pos.y - squareHalf}px`;
        
        const squareType = boardArray[squareIndex];
        let content = '';
        
        // Determine piece content
        switch (squareType) {
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
        
        // Check if this square has a valid piece to move
        const currentPlayer = game.current_player;
        const playerPieces = currentPlayer === Player.Light ? pieces.light : pieces.dark;
        let hasValidPiece = false;
        
        if (squareType !== 0) {
            // Check if any piece at this position can move
            for (let i = 0; i < playerPieces.length; i++) {
                const piecePos = playerPieces[i];
                const boardPos = piecePos === 36 ? 35 : (piecePos > 0 ? piecePos - 1 : -1);
                if (boardPos === squareIndex && validMoves.includes(i)) {
                    hasValidPiece = true;
                    break;
                }
            }
        }
        
        if (hasValidPiece) {
            square.className += ' valid-move';
        }
        
        // Add center square styling (position 35, which is the end)
        // Only highlight if there's a piece there or it's a valid move
        if (squareIndex === 35 && (squareType !== 0 || hasValidPiece)) {
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
    });
    
    // Add center (snake's head) - position 36
    const center = document.createElement('div');
    center.className = 'center-head';
    center.dataset.index = 35; // Use 35 for center display
    
    // Check if any pieces are at the center
    const centerPieces = [];
    for (let i = 0; i < pieces.light.length; i++) {
        if (pieces.light[i] === 36) {
            centerPieces.push({ player: 'light', index: i });
        }
    }
    for (let i = 0; i < pieces.dark.length; i++) {
        if (pieces.dark[i] === 36) {
            centerPieces.push({ player: 'dark', index: i });
        }
    }
    
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
    renderStartArea(pieces, validMoves);
}

function createCircularSpiralLayout() {
    // Create circular spiral layout matching archaeological artifacts
    // Based on specific spiral path connections:
    // 21-22, 32-33, 35-36, 27-28, 24-25, 30-19, 1-18, 11-10
    // These pairs indicate adjacent squares in the spiral path
    
    const positions = new Array(36);
    // Get actual board size (600px default, or responsive size)
    const board = document.getElementById('game-board');
    const boardSize = board ? board.offsetWidth : 600;
    const boardRadius = boardSize / 2;
    const centerX = boardRadius;
    const centerY = boardRadius;
    
    // Define ring radii
    const outerRadius = boardRadius * 0.85;
    const middleRadius = boardRadius * 0.55;
    const innerRadius = boardRadius * 0.25;
    
    // Outer ring: squares 1-18 (18 squares, indices 0-17)
    // Start angle positioned so square 1 aligns with square 18 (wrap connection)
    const outerRingCount = 18;
    const outerAngleStep = 360 / outerRingCount;
    // Position square 1 at angle 0, square 18 will be at 340° (17 * 20°)
    // This makes 1 and 18 adjacent (20° apart, which is one step)
    const outerStartAngle = 0;
    
    for (let i = 0; i < outerRingCount; i++) {
        const squareIndex = i; // 0-17 for squares 1-18
        const angle = (outerStartAngle + i * outerAngleStep) % 360;
        const rad = (angle * Math.PI) / 180;
        
        positions[squareIndex] = {
            angle: angle,
            radius: 85,
            x: centerX + outerRadius * Math.cos(rad),
            y: centerY + outerRadius * Math.sin(rad),
        };
    }
    
    // Middle ring: squares 19-30 (12 squares, indices 18-29)
    // Square 19 connects to square 30 (transition point)
    // Square 30 should be positioned near square 19's location
    const middleRingCount = 12;
    const middleAngleStep = 360 / middleRingCount;
    // Position square 19 to align with transition from square 18
    // Square 19 at same angle as square 18 but on middle ring
    const square18Angle = positions[17].angle;
    const middleStartAngle = (square18Angle + 15) % 360; // Offset slightly
    
    for (let i = 0; i < middleRingCount; i++) {
        const squareIndex = 18 + i; // Indices 18-29 for squares 19-30
        const angle = (middleStartAngle + i * middleAngleStep) % 360;
        const rad = (angle * Math.PI) / 180;
        
        positions[squareIndex] = {
            angle: angle,
            radius: 55,
            x: centerX + middleRadius * Math.cos(rad),
            y: centerY + middleRadius * Math.sin(rad),
        };
    }
    
    // Inner ring: squares 31-36 (6 squares, indices 30-35)
    // Align squares 32-33, 35-36 (adjacent pairs)
    // Square 31 transitions from square 30
    const innerRingCount = 6;
    const innerAngleStep = 360 / innerRingCount;
    // Position square 31 near square 30
    const square30Angle = positions[29].angle;
    const innerStartAngle = (square30Angle + 30) % 360;
    
    for (let i = 0; i < innerRingCount; i++) {
        const squareIndex = 30 + i; // Indices 30-35 for squares 31-36
        const angle = (innerStartAngle + i * innerAngleStep) % 360;
        const rad = (angle * Math.PI) / 180;
        
        positions[squareIndex] = {
            angle: angle,
            radius: 25,
            x: centerX + innerRadius * Math.cos(rad),
            y: centerY + innerRadius * Math.sin(rad),
        };
    }
    
    return positions;
}

function renderStartArea(pieces, validMoves) {
    // Remove existing start area if present
    const existingStartArea = document.querySelector('.start-area');
    if (existingStartArea) {
        existingStartArea.remove();
    }
    
    // Create start area display for pieces not yet on the board
    const startArea = document.createElement('div');
    startArea.className = 'start-area';
    
    const currentPlayer = game.current_player;
    const playerPieces = currentPlayer === Player.Light ? pieces.light : pieces.dark;
    
    const startPieces = document.createElement('div');
    startPieces.className = 'start-pieces';
    startPieces.innerHTML = '<strong>Add Piece:</strong> ';
    
    for (let i = 0; i < playerPieces.length; i++) {
        const piecePos = playerPieces[i];
        if (piecePos === 0) {
            const pieceEl = document.createElement('span');
            pieceEl.className = 'start-piece';
            pieceEl.textContent = currentPlayer === Player.Light ? '○' : '●';
            pieceEl.dataset.pieceIndex = i;
            
            if (validMoves.includes(i)) {
                pieceEl.className += ' valid-move';
                pieceEl.addEventListener('click', () => handlePieceClick(i));
            }
            
            startPieces.appendChild(pieceEl);
        }
    }
    
    startArea.appendChild(startPieces);
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
    if (!game || game.game_over) {
        return;
    }
    
    const diceValue = game.dice_value;
    if (diceValue === 0) {
        return;
    }
    
    const pieces = game.get_pieces();
    const validMoves = game.get_valid_moves();
    const currentPlayer = game.current_player;
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

