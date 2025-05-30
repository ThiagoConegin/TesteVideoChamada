const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream; // Fluxo de mídia local
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

  // Solicita ID ao usuário
  let userId = prompt('Insira seu ID único (ex.: Paciente1, Médico):');
  let userType;

  // Verifica se é médico ou paciente
  if (userId.toLowerCase().includes('medico')) {
    userType = 'Medico';
  } else {
    userType = 'Paciente';
  }

  // Verifica se o ID é válido ou gera um automaticamente
  if (!userId || userId.trim() === '') {
    userId = `Usuario_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`ID gerado automaticamente: ${userId}`);
  }

  // Envia mensagem de registro ao servidor
  sendMessage({ type: 'register', id: userId, typeOfUser: userType });
  console.log(`Usuário registrado com ID: ${userId} (${userType})`);
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
      case 'users':
        updatePatientList(message.users); // Atualiza lista de usuários conectados
        break;
      case 'invite':
        handleInvite(message); // Trata convites recebidos
        break;
      case 'accept':
        console.log(`Paciente ${message.sender} aceitou o atendimento.`);
        createOffer(); // Continua a chamada
        break;
      case 'decline':
        console.log(`Paciente ${message.sender} recusou o atendimento.`);
        alert(`O paciente ${message.sender} recusou o atendimento.`);
        break;
      case 'offer':
        handleOffer(message); // Trata oferta SDP
        break;
      case 'answer':
        handleAnswer(message); // Trata resposta SDP
        break;
      case 'candidate':
        handleCandidate(message); // Adiciona candidatos ICE
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

// Solicita câmera e microfone
async function getLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    console.log('Acesso à câmera e microfone concedido!');
  } catch (error) {
    console.error('Erro ao acessar mídia:', error);
    alert('Conceda permissão à câmera e ao microfone.');
  }
}
getLocalMedia();

// Atualiza a lista de usuários conectados no <select>
function updatePatientList(users) {
  const patientSelect = document.getElementById('patientSelect');
  patientSelect.innerHTML = ''; // Limpa a lista antes de atualizar

  // Filtra apenas usuários do tipo "Paciente"
  const uniquePatients = users.filter(user => user.type === 'Paciente');

  uniquePatients.forEach(patient => {
    const option = document.createElement('option');
    option.value = patient.id;
    option.textContent = `Paciente ${patient.id}`;
    patientSelect.appendChild(option);
  });

  // Mensagem padrão se não houver pacientes
  if (uniquePatients.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum paciente disponível';
    patientSelect.appendChild(option);
  }

  console.log('Lista de pacientes atualizada:', uniquePatients);
}

// Envia convite ao paciente selecionado
function startCall() {
  const patientSelect = document.getElementById('patientSelect');
  const selectedPatient = patientSelect.value;

  if (!selectedPatient) {
    alert('Selecione um paciente!');
    return;
  }

  sendMessage({ type: 'invite', target: selectedPatient, sender: 'medico' });
  console.log(`Convite enviado ao paciente ${selectedPatient}`);
}

// Lida com o convite recebido pelo paciente
function handleInvite(message) {
  console.log('Convite recebido do médico:', message);

  const accept = confirm(`O médico ${message.sender} está convidando você para um atendimento. Deseja aceitar?`);
  if (accept) {
    sendMessage({ type: 'accept', sender: message.sender }); // Paciente aceita o convite
    console.log('Convite aceito.');
    createOffer(); // Inicia a conexão WebRTC
  } else {
    sendMessage({ type: 'decline', sender: message.sender });
    console.log('Convite recusado.');
  }
}

// Cria conexão WebRTC
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
  console.log('Iniciando criação da oferta SDP...');
  peerConnection = createPeerConnection();

  try {
    const offer = await peerConnection.createOffer();
    console.log('Oferta SDP criada:', offer);

    await peerConnection.setLocalDescription(offer);
    console.log('Descrição local (SDP) configurada.');

    sendMessage({ type: 'offer', sdp: offer.sdp });
    console.log('Oferta SDP enviada ao outro usuário.');
  } catch (error) {
    console.error('Erro ao criar oferta SDP:', error);
  }
}

// Trata oferta SDP
async function handleOffer(message) {
  console.log('Oferta recebida:', message);

  peerConnection = createPeerConnection();

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: message.sdp
    }));
    console.log('Descrição remota (SDP) configurada.');

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('Descrição local (SDP) configurada.');

    sendMessage({ type: 'answer', sdp: answer.sdp });
    console.log('Resposta SDP enviada.');
  } catch (error) {
    console.error('Erro ao tratar oferta:', error);
  }
}

// Trata resposta SDP
async function handleAnswer(message) {
  console.log('Resposta recebida:', message);

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: message.sdp
    }));
    console.log('Descrição remota (SDP) configurada com sucesso.');
  } catch (error) {
    console.error('Erro ao tratar resposta:', error);
  }
}
// Adiciona candidatos ICE
function handleCandidate(message) {
  console.log('Candidato ICE recebido:', message.candidate);

  try {
    const candidate = new RTCIceCandidate(message.candidate); // Cria o candidato
    peerConnection.addIceCandidate(candidate); // Adiciona o candidato à conexão
    console.log('Candidato ICE adicionado com sucesso.');
  } catch (error) {
    console.error('Erro ao adicionar candidato ICE:', error);
  }
}