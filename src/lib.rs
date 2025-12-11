use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Player {
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Square {
    piece: Option<Player>,
}

impl Default for Square {
    fn default() -> Self {
        Square {
            piece: None,
        }
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameState {
    board: [Square; 36], // Mehen typically has 36 squares in a spiral
    current_player: Player,
    dice_value: u8,
    game_over: bool,
    winner: Option<Player>,
    // Track piece positions for each player
    light_pieces: Vec<usize>, // Positions of light pieces (0 = start, 36 = center/end)
    dark_pieces: Vec<usize>,  // Positions of dark pieces
}

// Mehen spiral path: starts at outer edge, spirals inward to center
// This is a simplified linear representation of the spiral
const SPIRAL_PATH: [usize; 36] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35
];

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GameState {
        let board = [Square::default(); 36];
        
        GameState {
            board,
            current_player: Player::Light,
            dice_value: 0,
            game_over: false,
            winner: None,
            light_pieces: vec![0, 0, 0, 0, 0, 0], // 6 pieces at start (position 0)
            dark_pieces: vec![0, 0, 0, 0, 0, 0],  // 6 pieces at start (position 0)
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_player(&self) -> Player {
        self.current_player
    }
    
    #[wasm_bindgen(getter)]
    pub fn dice_value(&self) -> u8 {
        self.dice_value
    }
    
    #[wasm_bindgen(getter)]
    pub fn game_over(&self) -> bool {
        self.game_over
    }
    
    #[wasm_bindgen(getter)]
    pub fn winner(&self) -> Option<Player> {
        self.winner
    }
    
    pub fn get_board(&self) -> JsValue {
        // Convert board to a format JavaScript can understand
        // Position 0 = start, positions 1-35 = board squares, position 36 = center/end
        let mut board_array = vec![0u8; 36];
        
        // Mark pieces on the board
        for &pos in &self.light_pieces {
            if pos > 0 && pos <= 36 {
                let board_idx = if pos == 36 { 35 } else { pos - 1 };
                if board_idx < 36 {
                    board_array[board_idx] = 1; // LightPiece
                }
            }
        }
        
        for &pos in &self.dark_pieces {
            if pos > 0 && pos <= 36 {
                let board_idx = if pos == 36 { 35 } else { pos - 1 };
                if board_idx < 36 {
                    board_array[board_idx] = 2; // DarkPiece
                }
            }
        }
        
        serde_wasm_bindgen::to_value(&board_array).unwrap()
    }
    
    pub fn get_pieces(&self) -> JsValue {
        // Return piece positions for both players
        #[derive(Serialize)]
        struct Pieces {
            light: Vec<usize>,
            dark: Vec<usize>,
        }
        let pieces = Pieces {
            light: self.light_pieces.clone(),
            dark: self.dark_pieces.clone(),
        };
        serde_wasm_bindgen::to_value(&pieces).unwrap()
    }
    
    pub fn roll_dice(&mut self) -> u8 {
        // Mehen uses dice that give values 1-6
        let random = js_sys::Math::random();
        self.dice_value = ((random * 6.0).floor() as u8) + 1;
        self.dice_value
    }
    
    pub fn can_move(&self, piece_index: usize) -> bool {
        if self.game_over || self.dice_value == 0 {
            return false;
        }
        
        let pieces = match self.current_player {
            Player::Light => &self.light_pieces,
            Player::Dark => &self.dark_pieces,
        };
        
        if piece_index >= pieces.len() {
            return false;
        }
        
        let current_pos = pieces[piece_index];
        
        // Can't move if already at the center (position 36)
        if current_pos >= 36 {
            return false;
        }
        
        let new_pos = current_pos + self.dice_value as usize;
        
        // Can move if new position is within bounds (0-36)
        if new_pos > 36 {
            return false;
        }
        
        // Check if destination is blocked by own piece
        if new_pos < 36 {
            let blocking_pieces = match self.current_player {
                Player::Light => &self.light_pieces,
                Player::Dark => &self.dark_pieces,
            };
            
            for &pos in blocking_pieces {
                if pos == new_pos {
                    return false; // Blocked by own piece
                }
            }
        }
        
        true
    }
    
    pub fn get_valid_moves(&self) -> JsValue {
        let mut moves = Vec::new();
        
        let pieces = match self.current_player {
            Player::Light => &self.light_pieces,
            Player::Dark => &self.dark_pieces,
        };
        
        for i in 0..pieces.len() {
            if self.can_move(i) {
                moves.push(i);
            }
        }
        
        serde_wasm_bindgen::to_value(&moves).unwrap()
    }
    
    pub fn make_move(&mut self, piece_index: usize) -> bool {
        if !self.can_move(piece_index) {
            return false;
        }
        
        let pieces = match self.current_player {
            Player::Light => &mut self.light_pieces,
            Player::Dark => &mut self.dark_pieces,
        };
        
        let current_pos = pieces[piece_index];
        let new_pos = current_pos + self.dice_value as usize;
        
        // Move the piece
        pieces[piece_index] = new_pos;
        
        // Check for capturing opponent piece
        if new_pos < 36 {
            let opponent_pieces = match self.current_player {
                Player::Light => &mut self.dark_pieces,
                Player::Dark => &mut self.light_pieces,
            };
            
            // Send opponent piece back to start if captured
            for pos in opponent_pieces.iter_mut() {
                if *pos == new_pos {
                    *pos = 0; // Send back to start
                    break;
                }
            }
        }
        
        self.dice_value = 0;
        self.check_win_condition();
        if !self.game_over {
            self.switch_player();
        }
        
        true
    }
    
    pub fn pass_turn(&mut self) {
        // Pass turn when no valid moves available
        if self.dice_value != 0 {
            self.dice_value = 0;
            self.switch_player();
        }
    }
    
    fn switch_player(&mut self) {
        self.current_player = match self.current_player {
            Player::Light => Player::Dark,
            Player::Dark => Player::Light,
        };
    }
    
    fn check_win_condition(&mut self) {
        // Check if all pieces have reached the center (position 36)
        let light_won = self.light_pieces.iter().all(|&pos| pos >= 36);
        let dark_won = self.dark_pieces.iter().all(|&pos| pos >= 36);
        
        if light_won {
            self.game_over = true;
            self.winner = Some(Player::Light);
        } else if dark_won {
            self.game_over = true;
            self.winner = Some(Player::Dark);
        }
    }
    
    pub fn reset(&mut self) {
        *self = GameState::new();
    }
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}

