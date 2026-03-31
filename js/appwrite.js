const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1") // Your endpoint
  .setProject("696f9104001dfedc5e1a");           // Your project ID

const db = new Appwrite.Databases(client);

// Database & collections constants
const DATABASE_ID = "69cb505d0015fbe8a669";
const COLLECTION_GAMES = "games";
const COLLECTION_PLAYERS = "players";
const COLLECTION_MOVES = "moves";
const COLLECTION_MESSAGES = "messages";

// Export constants (if using modules) or attach to window
window.AppwriteConfig = {
  client,
  db,
  DATABASE_ID,
  COLLECTION_GAMES,
  COLLECTION_PLAYERS,
  COLLECTION_MOVES,
  COLLECTION_MESSAGES
};