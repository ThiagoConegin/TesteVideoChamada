const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });
const users = {};

server.on('connection', (socket) => {
  socket.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.type === 'register') {
      users[message.id] = socket;
      broadcastUserList();
    }

    if (message.target && users[message.target]) {
      users[message.target].send(data);
    }
  });

  socket.on('close', () => {
    for (const id in users) {
      if (users[id] === socket) {
        delete users[id];
        break;
      }
    }
    broadcastUserList();
  });

  function broadcastUserList() {
    const userList = Object.keys(users).map(id => ({ id }));
    const message = JSON.stringify({ type: 'users', users: userList });
    Object.values(users).forEach(userSocket => userSocket.send(message));
  }
});
console.log('Servidor WebSocket rodando...');