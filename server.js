const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const users = {}; // Lista de usuários conectados

server.on('connection', (socket) => {
  console.log('Novo cliente conectado.');

  socket.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.type === 'register') {
      // Evita registrar IDs duplicados
      if (!users[message.id]) {
        users[message.id] = { socket, type: message.typeOfUser }; // Registra o tipo (médico ou paciente)
        console.log(`Usuário registrado: ${message.id} (${message.typeOfUser})`);
        broadcastUserList();
      } else {
        console.log(`ID já registrado: ${message.id}`);
        socket.send(JSON.stringify({ type: 'error', message: 'ID duplicado. Por favor, use um ID único.' }));
      }
    }

    if (message.target && users[message.target]) {
      users[message.target].socket.send(JSON.stringify(message));
      console.log(`Mensagem enviada para o destino: ${message.target}`);
    }
  });

  socket.on('close', () => {
    // Remove o usuário desconectado
    for (const id in users) {
      if (users[id].socket === socket) {
        console.log(`Usuário desconectado: ${id}`);
        delete users[id];
        break;
      }
    }
    broadcastUserList();
  });

  function broadcastUserList() {
    const userList = Object.keys(users).map(id => ({ id, type: users[id].type })); // Envia IDs e tipos
    const message = JSON.stringify({ type: 'users', users: userList });
    Object.values(users).forEach(user => user.socket.send(message));
  }
});