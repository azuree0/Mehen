<img width="972" height="823" alt="M" src="https://github.com/user-attachments/assets/2fc7f5b1-f0af-4ae0-af97-cdc3b622145b" />

# Prerequisites

- Rust (latest stable version)
wasm-pack, install with: 
```bash
cargo install wasm-pack
```

### Build Steps

1. Build the WebAssembly module:
```bash
wasm-pack build --target web
```

2. Serve the files with a local web server (required for WebAssembly):
```bash
python -m http.server 8000
```

3. Open browser:
```bash
http://localhost:8000
```
<br>

# Game Rules
Be the first player to move all six of your pieces from the start area to the center of the spiral board.

### Setup
- **Light Player**: Starts with 6 pieces in the start area (position 0).
- **Dark Player**: Starts with 6 pieces in the start area (position 0).
- **Starting Player**: Light player goes first.
- **Board Layout**: Circular board with 36 squares arranged in concentric rings:
  - **Outer Ring**: 18 squares at the perimeter
  - **Middle Ring**: 12 squares
  - **Inner Ring**: 6 squares
  - **Center**: Snake's head (final destination)
  - The spiral path winds from the outer edge inward toward the center.

### Turn Sequence

1. **Roll the Dice**: Click "Roll Dice" to get a value from 1-6.
2. **Select a Piece**: After rolling, valid pieces will be highlighted in green.
3. **Make a Move**: Click on one of your highlighted pieces to move it forward by the dice value.
4. **End Turn**: After moving, the turn automatically passes to your opponent.

### Movement Rules

- **Forward Movement Only**: Pieces always move forward along the spiral path (toward the center).
- **Exact Roll to Reach Center**: To reach the center (position 36), you must roll the exact number needed.
- **Blocking**: You cannot land on a square occupied by your own piece.
- **No Valid Moves**: If you roll but have no valid moves, your turn automatically passes after 1 second.
- **Must Move**: If you have a valid move, you must make it (you cannot pass voluntarily).

### Capturing Opponent Pieces

- **Landing on Opponent**: If you land on a square occupied by an opponent's piece, you **capture** it.
- **Capture Effect**: The opponent's piece is sent back to the start area (position 0).
- **Your Piece Stays**: Your piece remains on the captured square.

### Winning the Game

- **Victory Condition**: Move all six of your pieces to the center (position 36).
- **Game End**: The game ends immediately when one player has all pieces at the center.
- **Winner**: The player who successfully moves all pieces to the center wins.

<br>

# Mehen - Ancient Egyptian Snake Game

Mehen (also known as the "Game of the Snake") is an ancient Egyptian board game dating back to around 3000 BCE. The game is played on a spiral board representing a coiled snake, with players moving pieces along the spiral path from the outer edge toward the center.

Mehen is one of the oldest known board games, predating even Senet. The game board features a spiral design, typically with a snake's head at the center and body coiling outward. Archaeological evidence shows Mehen boards with varying numbers of squares, but the most common design features a spiral path.

### Symbolic Meaning

The game's design reflects deeper spiritual and mythological concepts:

- **The Spiral**: Represents the cyclical nature of life and the journey through different realms.
- **The Snake**: In Egyptian mythology, snakes were associated with protection, rebirth, and the underworld.
- **The Center**: The goal of reaching the center symbolizes completion of a spiritual or physical journey.
- **Moving Forward**: Each move forward along the spiral path represents progress through the journey, overcoming obstacles and trials.

### Archaeological Context

Mehen boards have been found in various archaeological contexts:

- **Tomb Discoveries**: Mehen boards have been discovered in ancient Egyptian tombs, indicating their importance in funerary practices.
- **Board Variations**: Archaeological evidence shows boards with different numbers of squares, but the spiral design remains consistent.
- **Game Pieces**: Spherical pieces made of various materials (stone, faience, wood) have been found alongside boards, suggesting the game's widespread popularity.

This combination of gameplay and symbolic meaning makes Mehen a unique window into ancient Egyptian culture, representing both entertainment and deeper spiritual beliefs about the journey through life and the afterlife.

<br>

# Project Structure

```
.
├── Cargo.toml          # Rust project configuration
├── src/
│   ├── lib.rs          # Main game logic
│   └── main.rs         # Entry point
├── index.html          # Web interface
├── style.css           # Styling
├── index.js            # JavaScript bindings
├── build.bat           # Windows build script
├── build.sh            # Unix build script
└── README.md           # This file
```
