document.getElementById('joinBtn').addEventListener('click', function() {
  const username = document.getElementById('username').value.trim();
  const gameId = document.getElementById('gameId').value.trim();

  if(!username || !gameId){
    alert("Enter username and game ID");
    return;
  }

  localStorage.setItem("username", username);
  localStorage.setItem("gameId", gameId);

  window.location.href = "dashboard.html";
});