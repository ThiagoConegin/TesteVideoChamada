const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const users = {}; // Lista de usuários conectados

server.on('connection', (socket) => {
  console.log('Novo cliente conectado.');

  socket.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.type === 'register') {
      // Registra o usuário conectado
      users[message.id] = socket;
      console.log(`Usuário registrado: ${message.id}`);
      broadcastUserList(); // Atualiza lista de usuários
    }

    if (message.target && users[message.target]) {
      users[message.target].send(JSON.stringify(message)); // Reenvia a mensagem ao destinatário
    }
  });

  socket.on('message', (data) => {
    const message = JSON.parse(data);
  
    if (message.type === 'register') {
      // Verifica se o ID já está registrado
      if (!users[message.id]) {
        users[message.id] = socket;
        console.log(`Usuário registrado: ${message.id}`);
        broadcastUserList(); // Atualiza a lista de usuários conectados
      } else {
        console.log(`ID já registrado: ${message.id}`);
      }
    }
  
    if (message.target && users[message.target]) {
      users[message.target].send(JSON.stringify(message));
      console.log(`Mensagem enviada para o destino: ${message.target}`);
    }
  });

  function broadcastUserList() {
    const userList = Object.keys(users).map(id => ({ id }));
    const message = JSON.stringify({ type: 'users', users: userList });
    Object.values(users).forEach(userSocket => userSocket.send(message));
  }
});

console.log('Servidor WebSocket rodando...');