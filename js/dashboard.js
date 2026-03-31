// Access Appwrite config
const { client, db, DATABASE_ID, COLLECTION_GAMES, COLLECTION_PLAYERS, COLLECTION_MOVES, COLLECTION_MESSAGES } = window.AppwriteConfig;

// Load username and gameId from localStorage
let gameId = localStorage.getItem("gameId");
let username = localStorage.getItem("username");

if(!gameId || !username){
  alert("Missing username or gameId! Redirecting to join page.");
  window.location.href = "index.html";
}

// Board setup
const BOARD_SIZE = 15;
const boardDiv = document.getElementById("board");
const rackDiv = document.getElementById("rack");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const turnInfo = document.getElementById("turnInfo");

let board = []; // 2D array of tiles
let rack = [];  // Array of tiles for current player
let isMyTurn = false;

// Generate empty board
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

// Generate rack tiles for player
function initRack() {
  rackDiv.innerHTML = "";
  // For demo, generate random letters
  rack = [];
  for(let i=0; i<7; i++){
    const tileLetter = String.fromCharCode(65 + Math.floor(Math.random()*26));
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = tileLetter;
    tile.draggable = true;
    tile.addEventListener("dragstart", dragTile);
    rackDiv.appendChild(tile);
    rack.push(tileLetter);
  }
}

// Drag & Drop handlers
function dragTile(event){
  event.dataTransfer.setData("text", event.target.textContent);
}

function allowDrop(event){
  event.preventDefault();
}

function dropTile(event){
  event.preventDefault();
  if(!isMyTurn) return alert("Wait for your turn!");
  const letter = event.dataTransfer.getData("text");
  event.target.textContent = letter;
  event.target.style.backgroundColor = "#FFD700"; // highlight placed tile
}

// Submit move
async function submitMove(){
  if(!isMyTurn) return alert("Not your turn!");
  const moveTiles = [];
  document.querySelectorAll(".board-cell").forEach(cell=>{
    if(cell.style.backgroundColor === "rgb(255, 215, 0)"){ // #FFD700
      moveTiles.push({
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        letter: cell.textContent
      });
    }
  });

  if(moveTiles.length === 0) return alert("Place some tiles first!");

  try{
    // Save move to Appwrite
    await db.createDocument(DATABASE_ID, COLLECTION_MOVES, "unique()", {
      gameId,
      player: username,
      tiles: moveTiles,
      timestamp: new Date().toISOString()
    });

    alert("Move submitted!");
    endTurn();
  }catch(err){
    console.error("Failed to submit move:", err);
  }
}

// End turn
function endTurn(){
  isMyTurn = false;
  turnInfo.textContent = "Waiting for opponent...";
  // Clear highlighted tiles in rack/board
  document.querySelectorAll(".board-cell").forEach(cell=>{
    if(cell.style.backgroundColor === "rgb(255, 215, 0)") cell.style.backgroundColor = "#eee";
  });
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
  }catch(err){
    console.error("Failed to send message:", err);
  }
}

// Realtime updates for moves & chat
function subscribeRealtime(){
  // Moves
  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MOVES}.documents`, response => {
    const move = response.payload;
    if(move.player !== username && move.gameId === gameId){
      turnInfo.textContent = `${move.player} made a move! Your turn.`;
      isMyTurn = true;
    }
  });

  // Chat
  client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_MESSAGES}.documents`, response => {
    const msg = response.payload;
    if(msg.gameId === gameId){
      const msgDiv = document.createElement("div");
      msgDiv.textContent = `${msg.player}: ${msg.message}`;
      chatBox.appendChild(msgDiv);
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