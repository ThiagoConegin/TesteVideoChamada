const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;     // Armazena o fluxo de mídia (vídeo e áudio) do usuário
let peerConnection;  // Conexão WebRTC para a chamada

// Configuração do ICE (STUN) para descobrir nós de rede
const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Conectar ao servidor WebSocket do Render para sinalização
const signalingServerUrl = 'wss://servidor-websocket-ijig.onrender.com';
const socket = new WebSocket(signalingServerUrl);

socket.onopen = () => {
  console.log('Conexão com o WebSocket estabelecida!');
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Mensagem recebida:', message);

  // Diferenciação dos tipos de mensagem para tratamento apropriado
  switch (message.type) {
    case 'offer':
      handleOffer(message);
      break;
    case 'answer':
      handleAnswer(message);
      break;
    case 'candidate':
      handleCandidate(message);
      break;
    default:
      console.log('Tipo de mensagem desconhecido:', message.type);
      break;
  }
};

function sendMessage(message) {
  socket.send(JSON.stringify(message));
}

// Solicitar acesso à câmera e microfone
async function getLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    console.log('Acesso à câmera e microfone concedido!');
  } catch (error) {
    console.error('Erro ao acessar a mídia:', error);
    alert('Não foi possível acessar a câmera e o microfone. Verifique as permissões.');
  }
}

// Chamada inicial para obter o stream local
getLocalMedia();

// Função para criar uma nova conexão WebRTC e incluir os streams
function createPeerConnection() {
  const pc = new RTCPeerConnection(iceConfig);

  // Adiciona os tracks do stream local para a conexão
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  // Dispara o evento de novo candidato ICE
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('Enviando candidato ICE:', event.candidate);
      sendMessage({ type: 'candidate', candidate: event.candidate });
    }
  };

  // Ao receber o stream remoto, mostra no elemento de vídeo
  pc.ontrack = (event) => {
    console.log('Stream remoto recebido');
    remoteVideo.srcObject = event.streams[0];
  };

  return pc;
}

// Função chamada quando o usuário clica em "Iniciar Chamada"
// O usuário que clica gera uma oferta de conexão
async function createOffer() {
  console.log("Criando oferta SDP...");
  peerConnection = createPeerConnection();

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendMessage({ type: 'offer', sdp: offer.sdp });
  } catch (error) {
    console.error('Erro ao criar oferta:', error);
  }
}

// Trata a oferta recebida de outro usuário
async function handleOffer(message) {
  console.log("Oferta recebida:", message);
  peerConnection = createPeerConnection();

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: message.sdp
    }));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendMessage({ type: 'answer', sdp: answer.sdp });
  } catch (error) {
    console.error('Erro ao tratar oferta:', error);
  }
}

// Trata a resposta à oferta enviada
async function handleAnswer(message) {
  console.log("Resposta recebida:", message);
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: message.sdp
    }));
  } catch (error) {
    console.error('Erro ao tratar resposta:', error);
  }
}

// Trata os candidatos ICE enviados pelo outro usuário
function handleCandidate(message) {
  console.log("Candidato ICE recebido:", message.candidate);
  try {
    const candidate = new RTCIceCandidate(message.candidate);
    peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Erro ao adicionar candidato ICE:', error);
  }
}