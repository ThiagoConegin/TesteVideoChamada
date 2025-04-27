const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

server.on('connection', socket => {
  console.log('Novo cliente conectado!');

  // Retransmitir mensagens entre os clientes conectados
  socket.on('message', message => {
    server.clients.forEach(client => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  socket.on('close', () => {
    console.log('Cliente desconectado!');
  });
});

console.log('Servidor WebSocket rodando!');