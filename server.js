const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const users = {}; // Lista de usuários conectados

server.on('connection', (socket) => { // "socket" é criado para cada conexão
  console.log('Novo cliente conectado.');

  // Quando o cliente envia uma mensagem
  socket.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Mensagem recebida do cliente:', message);

    if (message.type === 'register') {
      // Verifica se o ID já está registrado
      if (!users[message.id]) {
        users[message.id] = { socket, type: message.typeOfUser }; // Registra o tipo (Médico ou Paciente)
        console.log(`Usuário registrado: ${message.id} (${message.typeOfUser})`);
        broadcastUserList(); // Atualiza a lista para os clientes
      } else {
        console.log(`ID já registrado: ${message.id}`);
        socket.send(JSON.stringify({ type: 'error', message: 'ID duplicado. Use um ID único.' })); // Feedback para duplicação
      }
    }

    // Reencaminha a mensagem para o destino correto
    if (message.target && users[message.target]) {
      users[message.target].socket.send(JSON.stringify(message));
      console.log(`Mensagem enviada para o destino: ${message.target}`);
    }
  });

  // Quando o cliente se desconecta
  socket.on('close', () => {
    // Remove o usuário desconectado
    for (const id in users) {
      if (users[id].socket === socket) {
        console.log(`Usuário desconectado: ${id}`);
        delete users[id];
        break;
      }
    }
    broadcastUserList(); // Atualiza a lista quando alguém desconecta
  });
});

// Função para enviar a lista de usuários conectados
function broadcastUserList() {
  const userList = Object.keys(users).map(id => ({ id, type: users[id].type })); // Envia IDs e tipos
  const message = JSON.stringify({ type: 'users', users: userList });
  Object.values(users).forEach(user => user.socket.send(message));
}

console.log('Servidor WebSocket rodando...');