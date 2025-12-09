# Chat Local Electron

Application de chat en local avec Electron et WebSocket.

## Installation

1. Installer les dépendances :
```bash
npm install
```

## Utilisation

### Sur la machine serveur

1. Démarrer l'application :
```bash
npm start
```

2. Noter l'adresse IP affichée dans la console (ex: `192.168.1.100`)
3. Entrer votre pseudo au démarrage

### Sur les autres machines du réseau local

1. Démarrer l'application :
```bash
npm start
```

2. **Se connecter au serveur** :
   - Entrer l'adresse IP du serveur (ex: `192.168.1.100`)
   - Cliquer sur "Se connecter"
   - Par défaut, `localhost` est pré-rempli pour une utilisation locale

3. Entrer votre pseudo
4. Envoyer des messages :
   - **Message public** : tapez simplement votre message
   - **Message privé** : utilisez `@pseudo message` (ex: `@Alice Bonjour !`)

### Trouver l'adresse IP du serveur

Sur Windows :
```bash
ipconfig
```
Cherchez l'adresse IPv4 (ex: `192.168.1.100`)

Sur Linux/Mac :
```bash
ifconfig
```
ou
```bash
ip addr
```

## Fonctionnalités

- ✅ Un seul input pour tout
- ✅ Enregistrement du pseudo au démarrage
- ✅ Messages publics et privés
- ✅ Historique des messages
- ✅ Liste des utilisateurs connectés
- ✅ Alertes de connexion/déconnexion

## Structure

- `main.js` - Processus principal Electron
- `server.js` - Serveur WebSocket local
- `index.html` - Interface utilisateur
- `renderer.js` - Logique côté client
- `style.css` - Styles CSS

