// --- AJOUT DANS script.js ---

const socket = io();
let registered = false;
let pseudo = "";

function send() {
    const field = document.getElementById("field");
    const text = field.value.trim();
    if (!text) return;

    if (!registered) {
        pseudo = text;
        socket.emit("register", pseudo);
        field.placeholder = "Écrire un message...";
        registered = true;
        field.value = "";
        return;
    }

    socket.emit("message_input", text);
    field.value = "";
}

socket.on("public_msg", data => {
    const chat = document.getElementById("chat");
    chat.innerHTML += "<div><b>" + data.from + " :</b> " + data.text + "</div>";
});

socket.on("private_msg", data => {
    const chat = document.getElementById("chat");
    chat.innerHTML += "<div><b>[Privé] " + data.from + " :</b> " + data.text + "</div>";
});

// NOUVEL ÉVÉNEMENT : Mise à jour de la liste des utilisateurs
socket.on("user_list_update", users_list => {
    const userListElement = document.getElementById("user-list");
    userListElement.innerHTML = ""; // Efface la liste précédente

    users_list.forEach(user => {
        const listItem = document.createElement("li");
        listItem.textContent = user;

        // Optionnel : mettre en évidence votre propre pseudo
        if (user === pseudo) {
            listItem.style.fontWeight = "bold";
            listItem.textContent += " (vous)";
        }

        userListElement.appendChild(listItem);
    });
});