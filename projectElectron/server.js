const WebSocket = require('ws');
const os = require('os');

// Écouter sur toutes les interfaces réseau (0.0.0.0) pour permettre l'accès depuis le réseau local
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
const users = new Map(); // Map<WebSocket, {pseudo: string, id: string}>
let messageHistory = []; // Historique des messages

// Obtenir l'adresse IP locale
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les adresses IPv6 et les adresses internes
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
console.log('Serveur WebSocket démarré sur le port 8080');
console.log(`Adresse locale: ws://localhost:8080`);
console.log(`Adresse réseau: ws://${localIP}:8080`);
console.log(`\nPour se connecter depuis un autre ordinateur, utilisez: ${localIP}:8080`);

wss.on('connection', (ws) => {
  console.log('Nouvelle connexion');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'register':
          // Enregistrer l'utilisateur
          const userId = Date.now().toString();
          users.set(ws, { pseudo: data.pseudo, id: userId });
          
          // Envoyer l'historique à l'utilisateur
          ws.send(JSON.stringify({
            type: 'history',
            messages: messageHistory
          }));

          // Notifier tous les utilisateurs de la nouvelle connexion
          broadcast({
            type: 'user_connected',
            pseudo: data.pseudo,
            users: Array.from(users.values())
          }, ws);

          // Envoyer la liste des utilisateurs au nouvel utilisateur
          ws.send(JSON.stringify({
            type: 'users_list',
            users: Array.from(users.values())
          }));

          console.log(`Utilisateur connecté: ${data.pseudo}`);
          break;

        case 'message':
          const user = users.get(ws);
          if (!user) break;

          const messageData = {
            type: 'new_message',
            pseudo: user.pseudo,
            message: data.message,
            timestamp: new Date().toLocaleTimeString(),
            isPrivate: data.isPrivate || false,
            targetUser: data.targetUser || null
          };

          // Ajouter à l'historique si c'est un message public
          if (!data.isPrivate) {
            messageHistory.push(messageData);
            // Limiter l'historique à 100 messages
            if (messageHistory.length > 100) {
              messageHistory.shift();
            }
          }

          // Envoyer le message
          if (data.isPrivate && data.targetUser) {
            // Message privé : envoyer seulement à l'expéditeur et au destinataire
            sendToUser(data.targetUser, messageData);
            ws.send(JSON.stringify(messageData));
          } else {
            // Message public : envoyer à tous
            broadcast(messageData);
          }
          break;
      }
    } catch (error) {
      console.error('Erreur traitement message:', error);
    }
  });

  ws.on('close', () => {
    const user = users.get(ws);
    if (user) {
      console.log(`Utilisateur déconnecté: ${user.pseudo}`);
      users.delete(ws);
      
      // Notifier tous les utilisateurs de la déconnexion
      broadcast({
        type: 'user_disconnected',
        pseudo: user.pseudo,
        users: Array.from(users.values())
      });
    }
  });
});

function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendToUser(targetPseudo, data) {
  const message = JSON.stringify(data);
  users.forEach((user, ws) => {
    if (user.pseudo === targetPseudo && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

