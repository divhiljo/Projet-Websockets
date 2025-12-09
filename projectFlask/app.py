from flask import Flask, render_template,request
from flask_socketio import SocketIO, emit, disconnect
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

users = {} 
sockets = {}  

def emit_user_list():
    """Émet la liste des utilisateurs connectés à tous les clients."""
    emit("user_list_update", list(users.values()), broadcast=True)

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("register")
def register(username):
    users[request.sid] = username
    sockets[username] = request.sid
    emit_user_list()

@socketio.on("message_input")
def handle_input(data):
    msg = data.strip()
    sender = users.get(request.sid, "inconnu")

    if msg.startswith("@"):
        parts = msg.split(" ", 1)
        if len(parts) < 2:
            return
        target = parts[0][1:]
        text = parts[1]

        if target in sockets:
            emit("private_msg", {"from": sender, "text": text}, room=sockets[target])
            emit("private_msg", {"from": sender, "text": text}, room=request.sid)
        return

    emit("public_msg", {"from": sender, "text": msg}, broadcast=True)
    
@socketio.on("disconnect")
def disconnect_user():
    """Gère la déconnexion d'un utilisateur."""
    # Supprime l'utilisateur de nos dictionnaires
    if request.sid in users:
        username_to_remove = users[request.sid]
        del users[request.sid]
        if username_to_remove in sockets:
            del sockets[username_to_remove]
        emit_user_list()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5003)
