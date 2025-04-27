const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream; // Fluxo de mídia local (médico ou paciente)
let peerConnection; // Conexão WebRTC

// Configuração do ICE (STUN) para WebRTC
const iceConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// URL do servidor WebSocket no Render
const signalingServerUrl = 'wss://servidor-websocket-ijig.onrender.com';
const socket = new WebSocket(signalingServerUrl);

socket.onopen = () => {
  console.log('Conexão WebSocket estabelecida!');
};

socket.onmessage = async (event) => {
  try {
    let messageData = event.data;

    if (messageData instanceof Blob) {
      messageData = await messageData.text();
    }

    const message = JSON.parse(messageData);
    console.log('Mensagem recebida:', message);

    switch (message.type) {
      case 'invite':
        handleInvite(message);
        break;
      case 'accept':
        console.log(`Paciente ${message.sender} aceitou o atendimento.`);
        createOffer(); // Médico inicia a chamada
        break;
      case 'decline':
        console.log(`Paciente ${message.sender} recusou o atendimento.`);
        alert(`O paciente ${message.sender} recusou o atendimento.`);
        break;
      case 'offer':
        handleOffer(message);
        break;
      case 'answer':
        handleAnswer(message);
        break;
      case 'candidate':
        handleCandidate(message);
        break;
      case 'users':
        updatePatientList(message.users);
        break;
      default:
        console.error('Tipo de mensagem desconhecido:', message.type);
        break;
    }
  } catch (error) {
    console.error('Erro ao processar mensagem do WebSocket:', error);
  }
};

function sendMessage(message) {
  socket.send(JSON.stringify(message));
}

// Solicita a câmera e microfone
async function getLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    console.log('Acesso à câmera e microfone concedido!');
  } catch (error) {
    console.error('Erro ao acessar mídia:', error);
    alert('Por favor, conceda acesso à câmera e microfone.');
  }
}
getLocalMedia();

// Atualiza a lista de pacientes disponíveis
function updatePatientList(users) {
  const patientSelect = document.getElementById('patientSelect');
  patientSelect.innerHTML = '';
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.name || `Paciente ${user.id}`;
    patientSelect.appendChild(option);
  });
  console.log('Lista de pacientes atualizada:', users);
}

// Envia convite ao paciente selecionado
function startCall() {
  const patientSelect = document.getElementById('patientSelect');
  const selectedPatient = patientSelect.value;
  if (!selectedPatient) {
    alert('Selecione um paciente para iniciar o atendimento!');
    return;
  }
  sendMessage({ type: 'invite', target: selectedPatient, sender: 'medico' });
  console.log(`Convite enviado ao paciente ${selectedPatient}`);
}

// Lida com o convite recebido pelo paciente
function handleInvite(message) {
  const accept = confirm(`O médico ${message.sender} está convidando você para um atendimento. Deseja aceitar?`);
  if (accept) {
    sendMessage({ type: 'accept', sender: message.sender });
    console.log('Convite aceito.');
    createOffer(); // Paciente inicia a chamada
  } else {
    sendMessage({ type: 'decline', sender: message.sender });
    console.log('Convite recusado.');
  }
}

// WebRTC: Cria a conexão
function createPeerConnection() {
  const pc = new RTCPeerConnection(iceConfig);

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({ type: 'candidate', candidate: event.candidate });
    }
  };

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  return pc;
}

// Cria oferta SDP
async function createOffer() {
  peerConnection = createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  sendMessage({ type: 'offer', sdp: offer.sdp });
}

// Recebe oferta SDP
async function handleOffer(message) {
  peerConnection = createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  sendMessage({ type: 'answer', sdp: answer.sdp });
}

// Recebe resposta SDP
async function handleAnswer(message) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
}

// Adiciona candidatos ICE
function handleCandidate(message) {
  const candidate = new RTCIceCandidate(message.candidate);
  peerConnection.addIceCandidate(candidate);
}