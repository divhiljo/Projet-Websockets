# Documentation Technique - Fonctionnement du Code

Ce document explique en détail le fonctionnement de chaque composant de l'application de chat local Electron.

---

## 📋 Table des matières

1. [Architecture générale](#architecture-générale)
2. [package.json - Configuration du projet](#packagejson---configuration-du-projet)
3. [main.js - Processus principal Electron](#mainjs---processus-principal-electron)
4. [server.js - Serveur WebSocket](#serverjs---serveur-websocket)
5. [index.html - Interface utilisateur](#indexhtml---interface-utilisateur)
6. [renderer.js - Logique côté client](#rendererjs---logique-côté-client)
7. [style.css - Styles CSS](#stylecss---styles-css)
8. [Flux de communication](#flux-de-communication)

---

## Architecture générale

L'application utilise une architecture **client-serveur** avec :

- **Processus principal Electron** (`main.js`) : Gère la fenêtre et lance le serveur
- **Serveur WebSocket** (`server.js`) : Gère les connexions et la communication entre clients
- **Interface HTML** (`index.html`) : Structure de l'interface utilisateur
- **Script client** (`renderer.js`) : Logique JavaScript côté client
- **Styles CSS** (`style.css`) : Apparence de l'interface

### Flux de données

```
Electron (main.js)
    ↓
Serveur WebSocket (server.js) ←→ Clients (renderer.js)
    ↓
Interface HTML (index.html + style.css)
```

---

## package.json - Configuration du projet

### Rôle
Définit les métadonnées du projet et les dépendances nécessaires.

### Dépendances

- **electron** (^28.0.0) : Framework pour créer des applications desktop avec des technologies web
- **ws** (^8.16.0) : Bibliothèque WebSocket pour Node.js, permet la communication temps réel

### Scripts

- `npm start` : Lance l'application Electron
- `npm dev` : Alias pour le développement

---

## main.js - Processus principal Electron

### Rôle
C'est le point d'entrée de l'application Electron. Il gère le cycle de vie de l'application et coordonne le serveur WebSocket avec la fenêtre.

### Variables globales

```javascript
let mainWindow;      // Référence à la fenêtre principale
let serverProcess;   // Référence au processus serveur WebSocket
```

### Fonction `createWindow()`

**Lignes 8-22**

Crée et configure la fenêtre principale de l'application :

- **Dimensions** : 900x700 pixels
- **webPreferences** :
  - `nodeIntegration: true` : Permet l'utilisation de Node.js dans le renderer
  - `contextIsolation: false` : Désactive l'isolation de contexte (simplifie le code)
- **Chargement** : Charge le fichier `index.html`

### Fonction `startServer()`

**Lignes 24-34**

Démarre le serveur WebSocket en tant que processus enfant :

- Utilise `spawn()` pour lancer `node server.js`
- `stdio: 'inherit'` : Les logs du serveur s'affichent dans la console Electron
- Gère les erreurs de démarrage

### Cycle de vie de l'application

#### `app.whenReady()` (lignes 36-48)

Déclenché quand Electron est prêt :

1. Démarre le serveur WebSocket
2. Attend 1 seconde pour que le serveur soit prêt
3. Crée la fenêtre principale
4. Gère la réactivation de l'application (macOS)

#### `app.on('window-all-closed')` (lignes 50-57)

Quand toutes les fenêtres sont fermées :

- Sur macOS : L'application reste active
- Sur autres OS : Arrête le serveur et quitte l'application

#### `app.on('before-quit')` (lignes 59-63)

Avant la fermeture de l'application :

- Arrête proprement le processus serveur pour éviter les processus zombies

---

## server.js - Serveur WebSocket

### Rôle
Gère toutes les communications entre les clients via WebSocket. C'est le cœur de l'application.

### Variables globales

```javascript
const wss = new WebSocket.Server({ port: 8080 });
const users = new Map();           // Map<WebSocket, {pseudo: string, id: string}>
let messageHistory = [];           // Historique des messages publics
```

- **wss** : Instance du serveur WebSocket sur le port 8080
- **users** : Map associant chaque connexion WebSocket à un objet utilisateur
- **messageHistory** : Tableau contenant les 100 derniers messages publics

### Événement `connection` (lignes 9-96)

Déclenché à chaque nouvelle connexion client.

#### Gestion des messages (`ws.on('message')`)

Les messages sont reçus en JSON et traités selon leur type :

##### Type `register` (lignes 17-42)

Enregistre un nouvel utilisateur :

1. **Création d'un ID unique** : Utilise `Date.now()` pour générer un identifiant
2. **Stockage dans la Map** : Associe la connexion WebSocket à l'utilisateur
3. **Envoi de l'historique** : Le nouveau client reçoit les 100 derniers messages publics
4. **Notification aux autres** : Tous les autres clients sont notifiés de la nouvelle connexion
5. **Liste des utilisateurs** : Le nouveau client reçoit la liste complète des utilisateurs connectés

##### Type `message` (lignes 44-75)

Traite un message envoyé par un client :

1. **Vérification** : Vérifie que l'expéditeur est enregistré
2. **Création de l'objet message** :
   - Pseudo de l'expéditeur
   - Contenu du message
   - Timestamp formaté
   - Indicateur privé/public
   - Destinataire (si privé)
3. **Ajout à l'historique** : Si public, ajoute au tableau (limité à 100 messages)
4. **Distribution** :
   - **Message privé** : Envoyé uniquement à l'expéditeur et au destinataire
   - **Message public** : Diffusé à tous les clients

#### Événement `close` (lignes 82-95)

Quand un client se déconnecte :

1. Récupère les informations de l'utilisateur depuis la Map
2. Supprime l'utilisateur de la Map
3. Notifie tous les autres clients de la déconnexion
4. Met à jour la liste des utilisateurs pour tous

### Fonction `broadcast(data, excludeWs)` (lignes 98-105)

Diffuse un message à tous les clients connectés :

- **Paramètres** :
  - `data` : Objet à envoyer (sera converti en JSON)
  - `excludeWs` : Connexion WebSocket à exclure (optionnel)
- **Fonctionnement** :
  - Parcourt toutes les connexions actives
  - Vérifie que la connexion est ouverte (`readyState === WebSocket.OPEN`)
  - Exclut la connexion spécifiée si fournie
  - Envoie le message en JSON

### Fonction `sendToUser(targetPseudo, data)` (lignes 107-114)

Envoie un message à un utilisateur spécifique :

- **Paramètres** :
  - `targetPseudo` : Pseudo du destinataire
  - `data` : Objet à envoyer
- **Fonctionnement** :
  - Parcourt la Map des utilisateurs
  - Trouve l'utilisateur avec le pseudo correspondant
  - Vérifie que la connexion est ouverte
  - Envoie le message uniquement à cet utilisateur

---

## index.html - Interface utilisateur

### Rôle
Définit la structure HTML de l'interface utilisateur.

### Structure

#### Container principal
- **Sidebar** : Liste des utilisateurs connectés (200px de largeur)
- **Main content** : Zone de chat principale

#### Sidebar (lignes 11-14)
- Titre "Utilisateurs connectés"
- Div `usersList` : Contiendra dynamiquement la liste des utilisateurs

#### Main content (lignes 16-29)
- **Chat area** (`chatArea`) : Zone d'affichage des messages (scrollable)
- **Input area** : Zone de saisie avec deux états :
  - **Pseudo prompt** (`pseudoPrompt`) : Visible au démarrage pour saisir le pseudo
  - **Message input** (`messageInput`) : Visible après enregistrement du pseudo

### Éléments interactifs

- `pseudoInput` : Champ de saisie du pseudo
- `pseudoSubmit` : Bouton de validation du pseudo
- `messageField` : Champ de saisie des messages
- `sendButton` : Bouton d'envoi des messages

---

## renderer.js - Logique côté client

### Rôle
Gère toute la logique côté client : connexion WebSocket, affichage, interactions utilisateur.

### Variables globales

```javascript
let ws = null;              // Connexion WebSocket
let currentPseudo = null;   // Pseudo de l'utilisateur actuel
let connectedUsers = [];    // Liste des utilisateurs connectés
```

### Fonction `connect()` (lignes 6-27)

Établit la connexion WebSocket avec le serveur :

- **URL** : `ws://localhost:8080`
- **Événements** :
  - `onopen` : Connexion établie
  - `onmessage` : Message reçu → appelle `handleMessage()`
  - `onerror` : Erreur de connexion → affiche une alerte
  - `onclose` : Connexion fermée → affiche une alerte

### Fonction `handleMessage(data)` (lignes 30-57)

Traite les messages reçus du serveur selon leur type :

#### Type `history`
Affiche tous les messages de l'historique dans la zone de chat.

#### Type `new_message`
Affiche un nouveau message reçu.

#### Type `user_connected`
- Affiche une alerte de connexion
- Met à jour la liste des utilisateurs

#### Type `user_disconnected`
- Affiche une alerte de déconnexion
- Met à jour la liste des utilisateurs

#### Type `users_list`
Met à jour la liste des utilisateurs connectés.

### Fonction `displayMessage(msg)` (lignes 60-74)

Affiche un message dans la zone de chat :

1. Crée un élément `<div>` avec la classe `message`
2. Ajoute la classe `private` ou `public` selon le type
3. Structure HTML :
   - Timestamp
   - Pseudo (avec préfixe `[PRIVÉ]` si privé)
   - Contenu du message
4. Ajoute le message au DOM
5. Scroll automatique vers le bas

### Fonction `updateUsersList(users)` (lignes 77-88)

Met à jour la sidebar avec la liste des utilisateurs :

1. Met à jour le tableau `connectedUsers`
2. Vide la liste actuelle
3. Crée un élément `<div>` pour chaque utilisateur
4. Ajoute chaque élément à la sidebar

### Fonction `showAlert(message, type)` (lignes 91-103)

Affiche une alerte temporaire dans le chat :

- **Types** : `info` (bleu) ou `error` (rouge)
- **Durée** : 3 secondes avant suppression automatique
- **Position** : Ajoutée en bas du chat avec scroll automatique

### Fonction `sendMessage()` (lignes 106-143)

Envoie un message au serveur :

1. **Récupération** : Lit la valeur du champ de saisie
2. **Validation** : Vérifie que le message n'est pas vide et que la connexion est ouverte
3. **Détection message privé** : Utilise une regex `/^@(\w+)\s+(.+)$/` pour détecter `@pseudo message`
4. **Traitement** :
   - **Si privé** :
     - Extrait le pseudo cible et le message
     - Vérifie que l'utilisateur existe
     - Envoie avec `isPrivate: true` et `targetUser`
   - **Si public** :
     - Envoie avec `isPrivate: false`
5. **Nettoyage** : Vide le champ de saisie

### Fonction `registerPseudo()` (lignes 146-169)

Enregistre le pseudo de l'utilisateur :

1. **Validation** : Vérifie que le pseudo n'est pas vide
2. **Stockage** : Sauvegarde dans `currentPseudo`
3. **Envoi au serveur** : Envoie un message de type `register`
4. **Changement d'interface** :
   - Masque le prompt de pseudo
   - Affiche le champ de saisie de message
   - Met le focus sur le champ de message

### Initialisation (lignes 172-191)

Au chargement de la page (`DOMContentLoaded`) :

1. Établit la connexion WebSocket
2. Ajoute les event listeners :
   - Bouton de validation du pseudo
   - Touche Entrée dans le champ pseudo
   - Bouton d'envoi de message
   - Touche Entrée dans le champ message

---

## style.css - Styles CSS

### Rôle
Définit l'apparence visuelle de l'interface.

### Structure générale

- **Reset CSS** : Réinitialise les marges et paddings
- **Body** : Fond gris clair, police Segoe UI
- **Container** : Flexbox pour la disposition sidebar + contenu principal

### Composants principaux

#### Sidebar
- Fond sombre (#2c3e50)
- Liste des utilisateurs scrollable
- Items utilisateur avec fond gris (#34495e)

#### Zone de chat
- Fond gris clair (#ecf0f1)
- Messages avec ombre légère
- Messages privés : fond jaune clair avec bordure jaune
- Messages publics : bordure bleue

#### Zone de saisie
- Fond blanc avec bordure supérieure
- Deux états : prompt pseudo et input message
- Boutons colorés (bleu pour pseudo, vert pour message)

#### Alertes
- **Info** : Fond bleu clair avec bordure bleue
- **Error** : Fond rouge clair avec bordure rouge

#### Scrollbars personnalisées
- Largeur de 8px
- Couleur grise avec effet hover

---

## Flux de communication

### 1. Connexion initiale

```
Client → Serveur : Connexion WebSocket établie
Client → Serveur : {type: "register", pseudo: "Alice"}
Serveur → Client : {type: "history", messages: [...]}
Serveur → Tous : {type: "user_connected", pseudo: "Alice", users: [...]}
Serveur → Client : {type: "users_list", users: [...]}
```

### 2. Envoi d'un message public

```
Client → Serveur : {type: "message", message: "Bonjour", isPrivate: false}
Serveur → Tous : {type: "new_message", pseudo: "Alice", message: "Bonjour", ...}
```

### 3. Envoi d'un message privé

```
Client → Serveur : {type: "message", message: "Salut", isPrivate: true, targetUser: "Bob"}
Serveur → Client (Alice) : {type: "new_message", pseudo: "Alice", message: "Salut", isPrivate: true, ...}
Serveur → Client (Bob) : {type: "new_message", pseudo: "Alice", message: "Salut", isPrivate: true, ...}
```

### 4. Déconnexion

```
Client → Serveur : Fermeture de la connexion WebSocket
Serveur → Tous : {type: "user_disconnected", pseudo: "Alice", users: [...]}
```

---

## Points techniques importants

### Gestion de l'historique

- Seuls les messages **publics** sont stockés dans l'historique
- Limité à **100 messages** maximum (FIFO : First In First Out)
- Chaque nouveau client reçoit l'historique complet à la connexion

### Détection des messages privés

Utilise une expression régulière : `/^@(\w+)\s+(.+)$/`

- `^@` : Commence par @
- `(\w+)` : Capture le pseudo (lettres, chiffres, underscore)
- `\s+` : Au moins un espace
- `(.+)$` : Capture le reste du message jusqu'à la fin

Exemple : `@Alice Bonjour !` → pseudo: "Alice", message: "Bonjour !"

### Gestion des erreurs

- **Connexion WebSocket** : Alertes visuelles en cas d'erreur
- **Utilisateur inexistant** : Vérification avant envoi de message privé
- **Messages invalides** : Try-catch dans le serveur pour éviter les crashes

### Performance

- **Map pour les utilisateurs** : Accès O(1) pour trouver un utilisateur
- **Historique limité** : Évite la consommation excessive de mémoire
- **Scroll automatique** : Meilleure expérience utilisateur

---

## Sécurité et limitations

### Limitations actuelles

- Pas de validation des pseudos (doublons possibles)
- Pas d'authentification
- Pas de chiffrement des messages
- Serveur accessible uniquement en localhost
- Pas de persistance des données (tout est en mémoire)

### Améliorations possibles

- Validation des pseudos uniques
- Sauvegarde de l'historique dans un fichier
- Chiffrement des messages privés
- Gestion des erreurs réseau plus robuste
- Interface de configuration (port, etc.)

---

## Conclusion

Cette application utilise une architecture simple mais efficace pour créer un système de chat local. La séparation claire entre le serveur WebSocket et le client Electron permet une communication temps réel fluide. Le code est structuré de manière modulaire pour faciliter la maintenance et les extensions futures.

