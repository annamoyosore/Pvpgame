// APPWRITE CONFIG
const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("YOUR_PROJECT_ID");

const db = new Appwrite.Databases(client);
const DB = "YOUR_DATABASE_ID";

let username = "";
let gameId = "";
let board = Array(15).fill(null).map(()=>Array(15).fill(""));
let rack = [];
let selectedTile = null;
let placedTiles = [];
let currentTurn = "";
let players = [];

// LETTER DATA
const LETTERS = {
A:{count:9,score:1},B:{count:2,score:3},C:{count:2,score:3},
D:{count:4,score:2},E:{count:12,score:1},F:{count:2,score:4},
G:{count:3,score:2},H:{count:2,score:4},I:{count:9,score:1},
J:{count:1,score:8},K:{count:1,score:5},L:{count:4,score:1},
M:{count:2,score:3},N:{count:6,score:1},O:{count:8,score:1},
P:{count:2,score:3},Q:{count:1,score:10},R:{count:6,score:1},
S:{count:4,score:1},T:{count:6,score:1},U:{count:4,score:1},
V:{count:2,score:4},W:{count:2,score:4},X:{count:1,score:8},
Y:{count:2,score:4},Z:{count:1,score:10}
};

// JOIN GAME
async function joinGame(){
  username = document.getElementById("username").value;
  gameId = document.getElementById("gameId").value;

  rack = drawTiles(createBag(),7);

  drawBoard();
  drawRack();
  listenRealtime();
}

// BOARD
function drawBoard(){
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML="";

  for(let r=0;r<15;r++){
    for(let c=0;c<15;c++){
      const cell = document.createElement("div");
      cell.className="cell";
      cell.innerText = board[r][c];

      cell.ondragover=e=>e.preventDefault();

      cell.ondrop=()=>{
        if(!selectedTile) return;

        board[r][c]=selectedTile;
        placedTiles.push({row:r,col:c,letter:selectedTile});
        selectedTile=null;

        drawBoard();
      };

      boardDiv.appendChild(cell);
    }
  }
}

// RACK
function drawRack(){
  const rackDiv = document.getElementById("rack");
  rackDiv.innerHTML="";

  rack.forEach(letter=>{
    const tile=document.createElement("div");
    tile.className="tile";
    tile.innerText=letter;

    tile.draggable=true;
    tile.ondragstart=()=>selectedTile=letter;

    rackDiv.appendChild(tile);
  });
}

// SUBMIT MOVE
async function submitMove(){

  let word = placedTiles.map(t=>t.letter).join("");

  if(word.length<2) return alert("Invalid");

  let score = calculateScore(word);

  await db.createDocument(DB,"moves","unique()",{
    gameId,player:username,word,positions:placedTiles,score
  });

  placedTiles=[];
}

// SCORE
function calculateScore(word){
  let s=0;
  for(let l of word){
    s+=LETTERS[l].score;
  }
  return s;
}

// BAG
function createBag(){
  let bag=[];
  for(let l in LETTERS){
    for(let i=0;i<LETTERS[l].count;i++) bag.push(l);
  }
  return shuffle(bag);
}

function drawTiles(bag,n){
  let t=[];
  for(let i=0;i<n;i++) t.push(bag.pop());
  return t;
}

function shuffle(a){
  return a.sort(()=>Math.random()-0.5);
}

// REALTIME
const realtime = new Appwrite.Realtime(client);

function listenRealtime(){
  realtime.subscribe(
    `databases.${DB}.collections.moves.documents`,
    res=>{
      let m=res.payload;
      if(m.gameId!==gameId) return;

      m.positions.forEach(p=>{
        board[p.row][p.col]=p.letter;
      });

      drawBoard();
    }
  );
}

// CHAT
async function sendMessage(){
  let text=document.getElementById("chatInput").value;

  await db.createDocument(DB,"messages","unique()",{
    gameId,username,text
  });
}

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}