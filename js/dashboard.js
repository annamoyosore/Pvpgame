// dashboard.js - Scrabble Pro Full Working

// Import Appwrite config from js/appwrite.js
const { client, db, DATABASE_ID, COLLECTION_GAMES, COLLECTION_PLAYERS, COLLECTION_MOVES, COLLECTION_MESSAGES } = window.AppwriteConfig;

// Get HTML elements
const boardDiv = document.getElementById("board");
const rackDiv = document.getElementById("rack");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const turnInfo = document.getElementById("turnInfo");
const scoresList = document.getElementById("scoresList");

// Game constants
const BOARD_SIZE = 15;
const RACK_SIZE = 7;
const LETTER_POINTS = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

// Game state
let gameId = localStorage.getItem("gameId");
let username = localStorage.getItem("username");
let board = [];
let rack = [];
let scores = {};
let isMyTurn = false;

// --- INIT BOARD ---
function initBoard() {
  boardDiv.innerHTML = "";
  board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("dragover", allowDrop);
      cell.addEventListener("drop", dropTile);
      boardDiv.appendChild(cell);
      row.push(null);
    }
    board.push(row);
  }
}

// --- INIT RACK ---
function initRack() {
  rackDiv.innerHTML = "";
  rack = [];
  for (let i = 0; i < RACK_SIZE; i++) {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    rack.push(letter);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = letter;
    tile.draggable = true;
    tile.addEventListener("dragstart", dragTile);
    rackDiv.appendChild(tile);
  }
}

// --- DRAG & DROP ---
function dragTile(event) {
  event.dataTransfer.setData("text", event.target.textContent);
  // remove from rack visually
  event.target.style.visibility = "hidden";
}

function allowDrop(event) {
  event.preventDefault();
}

function dropTile(event) {
  event.preventDefault();
  if (!isMyTurn) return alert("Wait for your turn!");
  const letter = event.dataTransfer.getData("text");
  if (!event.target.textContent) {
    event.target.textContent = letter;
    event.target.style.backgroundColor = "#FFD700";
  }
}

// --- CALCULATE SCORE ---
function calculateMoveScore(tiles) {
  let score = 0;
  tiles.forEach(t => {
    const pts = LETTER_POINTS[t.letter.toUpperCase()] || 0;
    score += pts;
  });
  return score;
}

// --- SUBMIT MOVE ---
async function submitMove() {
  if (!isMyTurn) return alert("Not your turn!");
  const moveTiles = [];
  document.querySelectorAll(".board-cell").forEach(cell => {
    if (cell.style.backgroundColor === "rgb(255, 215, 0)") {
      moveTiles.push({
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        letter: cell.textContent
      });
    }
  });
  if (moveTiles.length === 0) return alert("Place tiles first!");
  const moveScore = calculateMoveScore(moveTiles);

  try {
    await db.createDocument(DATABASE_ID, COLLECTION_MOVES, "unique()", {
      gameId,
      player: username,
      tiles: moveTiles,
      score: moveScore,
      timestamp: new Date().toISOString()
    });
    alert(`Move submitted! +${moveScore} points`);
    updateScores(username, moveScore);
    endTurn();
  } catch (err) {
    console.error("Submit move error:", err);
  }
}

// --- END TURN ---
function endTurn() {
  isMyTurn = false;
  turnInfo.textContent = "Waiting for opponent...";
  document.querySelectorAll(".board-cell").forEach(cell => {
    if (cell.style.backgroundColor === "rgb(255, 215, 0)") cell.style.backgroundColor = "#eee";
  });
}

// --- UPDATE SCORES ---
function updateScores(player, points) {
  if (!scores[player]) scores[player] = 0;
  scores[player] += points;

  scoresList.innerHTML = "";
  for (const p in scores) {
    const div = document.createElement("div");
    div.textContent = `${p}: ${scores[p]} pts`;
    scoresList.appendChild(div);
  }
}

// --- CHAT ---
async function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  try {
    await db.createDocument(DATABASE_ID, COLLECTION_MESSAGES, "unique()", {
      gameId,
      player: username,
      message: msg,
      timestamp: new Date().toISOString()
    });
    chatInput.value = "";
  } catch (err) {
    console.error("Send chat error:", err);
  }
}

// --- REALTIME SUBSCRIPTIONS ---
function subscribeRealtime() {
  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MOVES}.documents`, res => {
    const move = res.payload;
    if (move.gameId === gameId && move.player !== username) {
      isMyTurn = true;
      turnInfo.textContent = `${move.player} moved! Your turn.`;

      move.tiles.forEach(t => {
        const cell = document.querySelector(`.board-cell[data-row='${t.row}'][data-col='${t.col}']`);
        if (cell) {
          cell.textContent = t.letter;
          cell.style.backgroundColor = "#eee";
        }
      });

      updateScores(move.player, move.score);
    }
  });

  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MESSAGES}.documents`, res => {
    const msg = res.payload;
    if (msg.gameId === gameId) {
      const div = document.createElement("div");
      div.textContent = `${msg.player}: ${msg.message}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
}

// --- INITIALIZE DASHBOARD ---
initBoard();
initRack();
subscribeRealtime();
isMyTurn = true;
turnInfo.textContent = "Your turn!";