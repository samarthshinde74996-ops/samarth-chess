/**
 * SAMARTH CHESS - Core Logic
 */

const boardElement = document.getElementById('chess-board');
const turnIndicator = document.getElementById('turn-indicator');
const logContent = document.getElementById('log-content');
const undoBtn = document.getElementById('undo-btn');
const flipBtn = document.getElementById('flip-btn');
const resetBtn = document.getElementById('reset-btn');

// Piece Definitions
const PIECES = {
    white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' }
};

let gameState = {
    board: [], // 8x8 array
    turn: 'white',
    selectedSquare: null,
    validMoves: [],
    history: [],
    isFlipped: false,
    castling: { white: { K: true, Q: true }, black: { K: true, Q: true } },
    enPassant: null
};

// Initialize the game
function initGame() {
    gameState.board = createStartingBoard();
    gameState.turn = 'white';
    gameState.history = [];
    renderBoard();
    updateUI();
}

function createStartingBoard() {
    const layout = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    // Uppercase = White, Lowercase = Black
    return layout.map(row => row.map(p => p === null ? null : {
        type: p.toLowerCase(),
        color: p === p.toUpperCase() ? 'white' : 'black'
    }));
}

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Flip logic for visual display
            const row = gameState.isFlipped ? 7 - r : r;
            const col = gameState.isFlipped ? 7 - c : c;
            
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = gameState.board[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = 'piece';
                pieceSpan.innerText = PIECES[piece.color][piece.type];
                square.appendChild(pieceSpan);
            }

            if (gameState.selectedSquare && gameState.selectedSquare.row === row && gameState.selectedSquare.col === col) {
                square.classList.add('selected');
            }

            if (gameState.validMoves.some(m => m.r === row && m.c === col)) {
                square.classList.add('valid-move');
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    const piece = gameState.board[row][col];

    // If a piece of the current turn's color is clicked, select it
    if (piece && piece.color === gameState.turn) {
        gameState.selectedSquare = { row, col };
        gameState.validMoves = calculateLegalMoves(row, col);
        renderBoard();
        return;
    }

    // If a move is selected
    const move = gameState.validMoves.find(m => m.r === row && m.c === col);
    if (move) {
        executeMove(gameState.selectedSquare.row, gameState.selectedSquare.col, row, col);
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        renderBoard();
        checkGameState();
    } else {
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        renderBoard();
    }
}

function calculateLegalMoves(r, c) {
    const piece = gameState.board[r][c];
    let moves = [];
    
    // Basic directional logic for simplicity
    const directions = {
        'r': [[0,1], [0,-1], [1,0], [-1,0]],
        'b': [[1,1], [1,-1], [-1,1], [-1,-1]],
        'q': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
        'k': [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
        'n': [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]]
    };

    if (piece.type === 'p') {
        const dir = piece.color === 'white' ? -1 : 1;
        // Move forward
        if (!gameState.board[r + dir]?.[c]) {
            moves.push({r: r + dir, c});
            // Double move
            const startRow = piece.color === 'white' ? 6 : 1;
            if (r === startRow && !gameState.board[r + 2 * dir]?.[c]) {
                moves.push({r: r + 2 * dir, c});
            }
        }
        // Captures
        [1, -1].forEach(offset => {
            const target = gameState.board[r + dir]?.[c + offset];
            if (target && target.color !== piece.color) moves.push({r: r + dir, c: c + offset});
        });
    } else if (directions[piece.type]) {
        directions[piece.type].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = gameState.board[nr][nc];
                if (!target) {
                    moves.push({r: nr, c: nc});
                    if (piece.type === 'n' || piece.type === 'k') break;
                } else {
                    if (target.color !== piece.color) moves.push({r: nr, c: nc});
                    break;
                }
                nr += dr; nc += dc;
            }
        });
    }
    return moves;
}

function executeMove(fromR, fromC, toR, toC) {
    const piece = gameState.board[fromR][fromC];
    
    // History for Undo
    gameState.history.push(JSON.parse(JSON.stringify(gameState.board)));
    
    // Log Move
    const moveText = `${piece.type.toUpperCase()}: ${String.fromCharCode(97+fromC)}${8-fromR} → ${String.fromCharCode(97+toC)}${8-toR}`;
    const logItem = document.createElement('div');
    logItem.innerText = moveText;
    logContent.prepend(logItem);

    // Pawn Promotion
    if (piece.type === 'p' && (toR === 0 || toR === 7)) {
        piece.type = 'q';
    }

    gameState.board[toR][toC] = piece;
    gameState.board[fromR][fromC] = null;
    gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
    updateUI();
}

function updateUI() {
    turnIndicator.innerText = `${gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1)}'s Turn`;
}

function checkGameState() {
    // Simplified: Checkmate/Stalemate logic would go here
    // In a full version, we'd simulate all legal moves and see if king is safe
}

// Controls
undoBtn.onclick = () => {
    if (gameState.history.length > 0) {
        gameState.board = gameState.history.pop();
        gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
        logContent.removeChild(logContent.firstChild);
        renderBoard();
        updateUI();
    }
};

flipBtn.onclick = () => {
    gameState.isFlipped = !gameState.isFlipped;
    renderBoard();
};

resetBtn.onclick = () => {
    if (confirm("Reset the game?")) {
        logContent.innerHTML = '';
        initGame();
    }
};

// Start
initGame();