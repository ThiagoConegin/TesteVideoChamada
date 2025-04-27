const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream; // Variável para armazenar o stream local
let peerConnection;

// Configuração do servidor STUN
const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Solicitar acesso à câmera e microfone
async function requestMedia() {
  console.log('Iniciando a solicitação de mídia local...');
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    console.log('Acesso à câmera e microfone concedido!');
    startConnection();
  } catch (error) {
    console.error('Erro ao acessar câmera/microfone:', error);
  }
}

// Inicializar conexão peer-to-peer
function startConnection() {
  peerConnection = new RTCPeerConnection(iceConfig);

  // Adicionar stream local à conexão
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Receber stream remoto
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Enviar candidatos ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      console.log('Novo candidato ICE:', event.candidate);
    }
  };
}

// Criar oferta SDP
async function createOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Oferta SDP criada:', offer);
}

// Conectar ao servidor WebSocket
const socket = new WebSocket('ws://192.168.1.8:8080'); // Substitua pelo IP local correto
socket.onopen = () => {
  console.log('Conexão WebSocket estabelecida!');
};

// Quando o cliente carregar, solicitar acesso à câmera/microfone
requestMedia();