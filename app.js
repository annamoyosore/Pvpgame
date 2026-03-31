// ==================== Appwrite Init ====================
const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("696f9104001dfedc5e1a");

const db = new Appwrite.Databases(client);

// ==================== Collections & DB ====================
const DATABASE_ID = "69cb505d0015fbe8a669"; // Your database
const COLLECTION_GAMES = "games";
const COLLECTION_PLAYERS = "players";
const COLLECTION_MOVES = "moves";
const COLLECTION_MESSAGES = "messages";

let gameId = '';
let username = '';
let board = [];
let boardPrev = [];
let rack = [];

// ==================== Join Game ====================
async function joinGame() {
  username = document.getElementById('username').value.trim();
  gameId = document.getElementById('gameId').value.trim();

  if (!username || !gameId) {
    alert("Enter username and game ID");
    return;
  }

  await loadGame();
  document.getElementById('turnInfo').textContent = `Your turn, ${username}`;
}

// ==================== Load Game ====================
async function loadGame() {
  try {
    const gameDoc = await db.getDocument(DATABASE_ID, COLLECTION_GAMES, gameId);

    let playerDoc;
    try {
      playerDoc = await db.getDocument(DATABASE_ID, COLLECTION_PLAYERS, username);
    } catch {
      playerDoc = await db.createDocument(DATABASE_ID, COLLECTION_PLAYERS, username, {
        gameId,
        username,
        rack: JSON.stringify(generateInitialRack()),
        score: 0,
        walletBalance: 1000,
        isAI: false
      });
    }

    board = JSON.parse(gameDoc.board);
    boardPrev = JSON.parse(JSON.stringify(board));
    rack = JSON.parse(playerDoc.rack);

    renderBoard();
    renderRack();
    loadChat();
    subscribeRealtime();

  } catch (err) {
    console.error(err);
    alert("Game not found. Make sure the Game ID is correct.");
  }
}

// ==================== Render Board ====================
function renderBoard() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'board-cell';
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;
      cellDiv.textContent = cell;

      cellDiv.addEventListener('dragover', e => e.preventDefault());
      cellDiv.addEventListener('drop', e => dropTile(e, r, c));

      boardDiv.appendChild(cellDiv);
    });
  });
}

// ==================== Render Rack ====================
function renderRack() {
  const rackDiv = document.getElementById('rack');
  rackDiv.innerHTML = '';
  rack.forEach((letter, index) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true;
    tile.textContent = letter;
    tile.dataset.index = index;

    tile.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));

    rackDiv.appendChild(tile);
  });
}

// ==================== Drop Tile ====================
async function dropTile(event, row, col) {
  event.preventDefault();
  const tileIndex = event.dataTransfer.getData('text/plain');
  const letter = rack[t