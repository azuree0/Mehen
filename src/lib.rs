use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SquarePosition {
    x: f64,
    y: f64,
    angle: f64,
    radius: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SquareData {
    square_type: u8,
    is_valid_move: bool,
    is_center: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CenterPiece {
    player: String,
    index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StartPiece {
    index: usize,
    is_valid_move: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Player {
    Light,
    Dark,
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameState {
    current_player: Player,
    dice_value: u8,
    game_over: bool,
    winner: Option<Player>,
    // Track piece positions for each player
    light_pieces: Vec<usize>, // Positions of light pieces (0 = start, 36 = center/end)
    dark_pieces: Vec<usize>,  // Positions of dark pieces
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GameState {
        GameState {
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
    
    pub fn get_spiral_positions(&self, board_size: f64) -> JsValue {
        let board_radius = board_size / 2.0;
        let center_x = board_radius;
        let center_y = board_radius;
        
        let outer_radius = board_radius * 0.85;
        let middle_radius = board_radius * 0.55;
        let inner_radius = board_radius * 0.25;
        
        let mut positions = Vec::new();
        
        // Outer ring: squares 1-18 (18 squares, indices 0-17)
        let outer_ring_count = 18;
        let outer_angle_step = 360.0 / outer_ring_count as f64;
        let outer_start_angle = 0.0;
        
        for i in 0..outer_ring_count {
            let angle = (outer_start_angle + i as f64 * outer_angle_step) % 360.0;
            let rad = angle.to_radians();
            
            positions.push(SquarePosition {
                x: center_x + outer_radius * rad.cos(),
                y: center_y + outer_radius * rad.sin(),
                angle,
                radius: 85.0,
            });
        }
        
        // Middle ring: squares 19-30 (12 squares, indices 18-29)
        let middle_ring_count = 12;
        let middle_angle_step = 360.0 / middle_ring_count as f64;
        let square18_angle = positions[17].angle;
        let middle_start_angle = (square18_angle + 15.0) % 360.0;
        
        for i in 0..middle_ring_count {
            let angle = (middle_start_angle + i as f64 * middle_angle_step) % 360.0;
            let rad = angle.to_radians();
            
            positions.push(SquarePosition {
                x: center_x + middle_radius * rad.cos(),
                y: center_y + middle_radius * rad.sin(),
                angle,
                radius: 55.0,
            });
        }
        
        // Inner ring: squares 31-36 (6 squares, indices 30-35)
        let inner_ring_count = 6;
        let inner_angle_step = 360.0 / inner_ring_count as f64;
        let square30_angle = positions[29].angle;
        let inner_start_angle = (square30_angle + 30.0) % 360.0;
        
        for i in 0..inner_ring_count {
            let angle = (inner_start_angle + i as f64 * inner_angle_step) % 360.0;
            let rad = angle.to_radians();
            
            positions.push(SquarePosition {
                x: center_x + inner_radius * rad.cos(),
                y: center_y + inner_radius * rad.sin(),
                angle,
                radius: 25.0,
            });
        }
        
        serde_wasm_bindgen::to_value(&positions).unwrap()
    }
    
    pub fn get_square_data(&self) -> JsValue {
        let board_array = self.get_board();
        let valid_moves: Vec<usize> = serde_wasm_bindgen::from_value(
            self.get_valid_moves()
        ).unwrap_or_default();
        
        #[derive(Deserialize)]
        struct Pieces {
            light: Vec<usize>,
            dark: Vec<usize>,
        }
        let pieces: Pieces = serde_wasm_bindgen::from_value(self.get_pieces()).unwrap();
        let player_pieces = match self.current_player {
            Player::Light => &pieces.light,
            Player::Dark => &pieces.dark,
        };
        
        let board: Vec<u8> = serde_wasm_bindgen::from_value(board_array).unwrap_or_default();
        let mut square_data = Vec::new();
        
        for square_index in 0..36 {
            let square_type = board.get(square_index).copied().unwrap_or(0);
            let mut is_valid_move = false;
            
            if square_type != 0 {
                for i in 0..player_pieces.len() {
                    let piece_pos = player_pieces[i];
                    let board_pos = if piece_pos == 36 { 35 } else if piece_pos > 0 { piece_pos - 1 } else { usize::MAX };
                    if board_pos == square_index && valid_moves.contains(&i) {
                        is_valid_move = true;
                        break;
                    }
                }
            }
            
            let is_center = square_index == 35 && (square_type != 0 || is_valid_move);
            
            square_data.push(SquareData {
                square_type,
                is_valid_move,
                is_center,
            });
        }
        
        serde_wasm_bindgen::to_value(&square_data).unwrap()
    }
    
    pub fn get_center_pieces(&self) -> JsValue {
        let mut center_pieces = Vec::new();
        
        for i in 0..self.light_pieces.len() {
            if self.light_pieces[i] == 36 {
                center_pieces.push(CenterPiece {
                    player: "light".to_string(),
                    index: i,
                });
            }
        }
        
        for i in 0..self.dark_pieces.len() {
            if self.dark_pieces[i] == 36 {
                center_pieces.push(CenterPiece {
                    player: "dark".to_string(),
                    index: i,
                });
            }
        }
        
        serde_wasm_bindgen::to_value(&center_pieces).unwrap()
    }
    
    pub fn get_start_pieces(&self) -> JsValue {
        let valid_moves: Vec<usize> = serde_wasm_bindgen::from_value(
            self.get_valid_moves()
        ).unwrap_or_default();
        
        let pieces = match self.current_player {
            Player::Light => &self.light_pieces,
            Player::Dark => &self.dark_pieces,
        };
        
        let mut start_pieces = Vec::new();
        for i in 0..pieces.len() {
            if pieces[i] == 0 {
                start_pieces.push(StartPiece {
                    index: i,
                    is_valid_move: valid_moves.contains(&i),
                });
            }
        }
        
        serde_wasm_bindgen::to_value(&start_pieces).unwrap()
    }
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}

