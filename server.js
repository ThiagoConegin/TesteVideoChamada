const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const users = {}; // Lista de usuários conectados

socket.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'register') {
    // Verifica se o ID já está registrado
    if (!users[message.id]) {
      users[message.id] = { socket, type: message.typeOfUser }; // Registra o tipo (Médico ou Paciente)
      console.log(`Usuário registrado: ${message.id} (${message.typeOfUser})`);
      broadcastUserList(); // Atualiza a lista para os clientes
    } else {
      console.log(`ID já registrado: ${message.id}`);
      socket.send(JSON.stringify({ type: 'error', message: 'ID duplicado. Use um ID único.' }));
    }
  }

  if (message.target && users[message.target]) {
    users[message.target].socket.send(JSON.stringify(message));
    console.log(`Mensagem enviada para o destino: ${message.target}`);
  }
});

console.log('Servidor WebSocket rodando...');