const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

server.on('connection', socket => {
  console.log('Novo cliente conectado!');

  // Retransmitir mensagens entre os clientes conectados
  socket.on('message', message => {
    try {
      const parsedMessage = JSON.parse(message);
  
      server.clients.forEach(client => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedMessage)); // Retransmite com o formato correto
        }
      });
    } catch (error) {
      console.error('Erro ao retransmitir mensagem:', error);
    }
  });

  socket.on('close', () => {
    console.log('Cliente desconectado!');
  });
});

console.log('Servidor WebSocket rodando!');