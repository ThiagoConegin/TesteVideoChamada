const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream; // Armazena o stream da câmera/microfone
let peerConnection;

const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN público
  ]
};

// Solicitar acesso à câmera e microfone
async function requestMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream; // Exibe o vídeo local
    console.log('Câmera e microfone acessados com sucesso!');
    startConnection();
  } catch (error) {
    console.error('Erro ao acessar câmera/microfone:', error);
    alert('Verifique as permissões para câmera e microfone.');
  }
}

// Inicializar conexão WebRTC
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

  // Manipular candidatos ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({ candidate: event.candidate });
    }
  };
}

// Criar oferta SDP
async function createOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  sendMessage({ sdp: offer });
}

// Criar resposta SDP
async function createAnswer() {
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  sendMessage({ sdp: answer });
}

// Conexão ao servidor WebSocket
const socket = new WebSocket('wss://servidor-websocket-ijig.onrender.com');
socket.onopen = () => {
  console.log('Conexão WebSocket estabelecida!');
};

socket.onmessage = event => {
  const message = JSON.parse(event.data);

  if (message.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
    if (message.sdp.type === 'offer') {
      createAnswer();
    }
  } else if (message.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
};

// Enviar mensagens ao WebSocket
function sendMessage(data) {
  socket.send(JSON.stringify(data));
}

// Solicitar mídia ao carregar a página
requestMedia();