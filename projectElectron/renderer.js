let ws = null;
let currentPseudo = null;
let connectedUsers = [];
let serverAddress = 'localhost';

// Connexion WebSocket
function connect(address = 'localhost') {
  const wsUrl = `ws://${address}:8080`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Connecté au serveur');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onerror = (error) => {
    console.error('Erreur WebSocket:', error);
    showAlert('Erreur de connexion', 'error');
  };

  ws.onclose = () => {
    console.log('Déconnecté du serveur');
    showAlert('Déconnexion du serveur', 'error');
  };
}

// Gérer les messages reçus
function handleMessage(data) {
  switch (data.type) {
    case 'history':
      // Afficher l'historique
      data.messages.forEach(msg => {
        displayMessage(msg);
      });
      break;

    case 'new_message':
      displayMessage(data);
      break;

    case 'user_connected':
      showAlert(`${data.pseudo} s'est connecté`, 'info');
      updateUsersList(data.users);
      break;

    case 'user_disconnected':
      showAlert(`${data.pseudo} s'est déconnecté`, 'info');
      updateUsersList(data.users);
      break;

    case 'users_list':
      updateUsersList(data.users);
      break;
  }
}

// Afficher un message dans le chat
function displayMessage(msg) {
  const chatArea = document.getElementById('chatArea');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${msg.isPrivate ? 'private' : 'public'}`;
  
  const prefix = msg.isPrivate ? '[PRIVÉ] ' : '';
  messageDiv.innerHTML = `
    <span class="timestamp">${msg.timestamp}</span>
    <span class="pseudo">${prefix}${msg.pseudo}:</span>
    <span class="text">${msg.message}</span>
  `;
  
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Mettre à jour la liste des utilisateurs
function updateUsersList(users) {
  connectedUsers = users;
  const usersList = document.getElementById('usersList');
  usersList.innerHTML = '';
  
  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.textContent = user.pseudo;
    usersList.appendChild(userDiv);
  });
}

// Afficher une alerte
function showAlert(message, type = 'info') {
  const chatArea = document.getElementById('chatArea');
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${type}`;
  alertDiv.textContent = message;
  chatArea.appendChild(alertDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Supprimer l'alerte après 3 secondes
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Envoyer un message
function sendMessage() {
  const messageField = document.getElementById('messageField');
  const message = messageField.value.trim();
  
  if (!message || !ws || ws.readyState !== WebSocket.OPEN) return;

  // Vérifier si c'est un message privé (@user message)
  const privateMatch = message.match(/^@(\w+)\s+(.+)$/);
  
  if (privateMatch) {
    const targetUser = privateMatch[1];
    const privateMessage = privateMatch[2];
    
    // Vérifier si l'utilisateur existe
    const userExists = connectedUsers.some(u => u.pseudo === targetUser);
    if (!userExists) {
      showAlert(`Utilisateur "${targetUser}" non trouvé`, 'error');
      messageField.value = '';
      return;
    }
    
    ws.send(JSON.stringify({
      type: 'message',
      message: privateMessage,
      isPrivate: true,
      targetUser: targetUser
    }));
  } else {
    // Message public
    ws.send(JSON.stringify({
      type: 'message',
      message: message,
      isPrivate: false
    }));
  }
  
  messageField.value = '';
}

// Enregistrer le pseudo
function registerPseudo() {
  const pseudoInput = document.getElementById('pseudoInput');
  const pseudo = pseudoInput.value.trim();
  
  if (!pseudo) {
    alert('Veuillez entrer un pseudo');
    return;
  }
  
  currentPseudo = pseudo;
  
  // Envoyer le pseudo au serveur
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'register',
      pseudo: pseudo
    }));
    
    // Masquer le prompt de pseudo et afficher l'input de message
    document.getElementById('pseudoPrompt').style.display = 'none';
    document.getElementById('messageInput').style.display = 'flex';
    document.getElementById('messageField').focus();
  }
}

// Se connecter au serveur
function connectToServer() {
  const serverInput = document.getElementById('serverInput');
  const address = serverInput.value.trim() || 'localhost';
  
  if (!address) {
    alert('Veuillez entrer une adresse IP');
    return;
  }
  
  serverAddress = address;
  
  // Masquer le prompt serveur et afficher le prompt pseudo
  document.getElementById('serverPrompt').style.display = 'none';
  document.getElementById('pseudoPrompt').style.display = 'flex';
  document.getElementById('pseudoInput').focus();
  
  // Connexion WebSocket
  connect(address);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Gestion de la connexion au serveur
  document.getElementById('serverSubmit').addEventListener('click', connectToServer);
  document.getElementById('serverInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      connectToServer();
    }
  });
  
  // Gestion du pseudo
  document.getElementById('pseudoSubmit').addEventListener('click', registerPseudo);
  document.getElementById('pseudoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      registerPseudo();
    }
  });
  
  // Gestion des messages
  document.getElementById('sendButton').addEventListener('click', sendMessage);
  document.getElementById('messageField').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
});

