// Dashboard.js - upgraded Scrabble Pro

const { client, db, DATABASE_ID, COLLECTION_GAMES, COLLECTION_PLAYERS, COLLECTION_MOVES, COLLECTION_MESSAGES } = window.AppwriteConfig;

// Load username and gameId
let gameId = localStorage.getItem("gameId");
let username = localStorage.getItem("username");

if(!gameId || !username){
  alert("Missing username/gameId! Redirecting...");
  window.location.href = "index.html";
}

// HTML elements
const boardDiv = document.getElementById("board");
const rackDiv = document.getElementById("rack");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const turnInfo = document.getElementById("turnInfo");

// Game variables
const BOARD_SIZE = 15;
let board = [];
let rack = [];
let isMyTurn = false;
let gameData = null; // game state from Appwrite
let scores = {}; // username -> score

// Scrabble letter points
const LETTER_POINTS = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

// Initialize board
function initBoard() {
  boardDiv.innerHTML = "";
  board = [];
  for(let r=0; r<BOARD_SIZE; r++){
    let row = [];
    for(let c=0; c<BOARD_SIZE; c++){
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("drop", dropTile);
      cell.addEventListener("dragover", allowDrop);
      boardDiv.appendChild(cell);
      row.push(null);
    }
    board.push(row);
  }
}

// Initialize rack
function initRack() {
  rackDiv.innerHTML = "";
  rack = [];
  for(let i=0;i<7;i++){
    const letter = String.fromCharCode(65+Math.floor(Math.random()*26));
    rack.push(letter);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = letter;
    tile.draggable = true;
    tile.addEventListener("dragstart", dragTile);
    rackDiv.appendChild(tile);
  }
}

// Drag & drop
function dragTile(event){ event.dataTransfer.setData("text", event.target.textContent); }
function allowDrop(event){ event.preventDefault(); }
function dropTile(event){
  event.preventDefault();
  if(!isMyTurn) return alert("Wait for your turn!");
  const letter = event.dataTransfer.getData("text");
  event.target.textContent = letter;
  event.target.style.backgroundColor = "#FFD700"; 
}

// Calculate move score
function calculateMoveScore(tiles){
  let score = 0;
  tiles.forEach(t=>{
    const letterScore = LETTER_POINTS[t.letter.toUpperCase()]||0;
    // TODO: apply premium squares
    score += letterScore;
  });
  return score;
}

// Submit move
async function submitMove(){
  if(!isMyTurn) return alert("Not your turn!");
  const moveTiles = [];
  document.querySelectorAll(".board-cell").forEach(cell=>{
    if(cell.style.backgroundColor === "rgb(255, 215, 0)"){
      moveTiles.push({row:parseInt(cell.dataset.row), col:parseInt(cell.dataset.col), letter:cell.textContent});
    }
  });
  if(moveTiles.length===0) return alert("Place tiles first!");
  const moveScore = calculateMoveScore(moveTiles);

  try{
    // Save move
    await db.createDocument(DATABASE_ID, COLLECTION_MOVES, "unique()", {
      gameId,
      player: username,
      tiles: moveTiles,
      score: moveScore,
      timestamp: new Date().toISOString()
    });

    alert(`Move submitted! +${moveScore} points`);
    endTurn();
  }catch(err){ console.error(err); }
}

// End turn & switch player
async function endTurn(){
  isMyTurn = false;
  turnInfo.textContent = "Waiting for opponent...";
  // Reset tile highlights
  document.querySelectorAll(".board-cell").forEach(cell=>{
    if(cell.style.backgroundColor === "rgb(255, 215, 0)") cell.style.backgroundColor = "#eee";
  });
  // TODO: update game currentTurnIndex in Appwrite
}

// Chat
async function sendMessage(){
  const msg = chatInput.value.trim();
  if(!msg) return;
  try{
    await db.createDocument(DATABASE_ID, COLLECTION_MESSAGES, "unique()", {
      gameId,
      player: username,
      message: msg,
      timestamp: new Date().toISOString()
    });
    chatInput.value = "";
  }catch(err){ console.error(err); }
}

// Realtime subscription
function subscribeRealtime(){
  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MOVES}.documents`, res=>{
    const move = res.payload;
    if(move.gameId===gameId && move.player!==username){
      isMyTurn = true;
      turnInfo.textContent = `${move.player} moved! Your turn.`;
      // TODO: update board with opponent tiles
    }
  });

  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MESSAGES}.documents`, res=>{
    const msg = res.payload;
    if(msg.gameId===gameId){
      const div = document.createElement("div");
      div.textContent = `${msg.player}: ${msg.message}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
}

// Initialize dashboard
initBoard();
initRack();
subscribeRealtime();
isMyTurn = true;
turnInfo.textContent = "Your turn!";

// Optional: AI move simulation
async function aiMove(){
  if(!isMyTurn) return;
  // Simple random AI: pick random rack letter and random empty cell
  const emptyCells = [];
  document.querySelectorAll(".board-cell").forEach(cell=>{
    if(!cell.textContent) emptyCells.push(cell);
  });
  if(emptyCells.length===0) return;
  const cell = emptyCells[Math.floor(Math.random()*emptyCells.length)];
  const letter = rack[Math.floor(Math.random()*rack.length)];
  cell.textContent = letter;
  cell.style.backgroundColor = "#FFD700";
  await submitMove();
}