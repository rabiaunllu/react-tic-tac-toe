import * as signalR from '@microsoft/signalr';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'server', 'XoArena.Api');
const baseUrl = 'http://127.0.0.1:5150';

console.log('\x1b[36m====================================================\x1b[0m');
console.log('\x1b[36m   XO ARENA - REAL-TIME SIGNALR E2E TEST (NODE.JS)  \x1b[0m');
console.log('\x1b[36m====================================================\x1b[0m\n');

// 1. Start backend process
console.log('\x1b[33m[1/5] Backend baslatiliyor...\x1b[0m');
const serverProc = spawn('dotnet', ['run', '--launch-profile', 'http'], {
  cwd: apiDir,
  stdio: 'ignore',
  shell: true,
});

async function waitForHealth(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') return true;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

try {
  const isHealthy = await waitForHealth();
  if (!isHealthy) {
    throw new Error('Backend 25 saniye icinde baslatilamadi.');
  }
  console.log('\x1b[32m  -> Backend sagligi ONAYLANDI (Port 5150)\x1b[0m\n');

  // 2. Create room via REST
  console.log('\x1b[33m[2/5] REST uzerinden Oda Olusturuluyor...\x1b[0m');
  const createRes = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: 'RealtimeAlice',
      gameMode: 'classic',
      boardSize: 3,
      winLength: 3,
      targetValue: 3,
      turnTimeLimit: 15,
    }),
  });
  if (!createRes.ok) throw new Error(`Oda olusturulamadi: ${createRes.status}`);
  const createData = await createRes.json();
  const roomCode = createData.room.roomCode;
  const hostId = createData.room.players[0].id;
  const hostSecret = createData.playerSecret;
  console.log(`\x1b[32m  -> Oda kuruldu: ${roomCode} (Host: RealtimeAlice, ID: ${hostId})\x1b[0m\n`);

  // 3. Connect Host via SignalR
  console.log('\x1b[33m[3/5] Host (Alice) SignalR Hub Baglantisi Kuruluyor...\x1b[0m');
  let hostReceivedEmote = null;
  let hostReceivedRoomUpdate = null;

  const hostConn = new signalR.HubConnectionBuilder()
    .withUrl(`${baseUrl}/hubs/rooms`)
    .configureLogging(signalR.LogLevel.None)
    .build();

  hostConn.on('RoomUpdated', (room) => {
    hostReceivedRoomUpdate = room;
  });

  hostConn.on('QuickEmoteReceived', (emote) => {
    hostReceivedEmote = emote;
  });

  await hostConn.start();
  const hostJoinedGroup = await hostConn.invoke('JoinRoomGroup', roomCode, hostId, hostSecret);
  console.log(`\x1b[32m  -> Host SignalR Baglandi ve Odaya Yetkilendirildi: ${hostJoinedGroup}\x1b[0m\n`);

  // 4. Guest joins and connects via SignalR
  console.log('\x1b[33m[4/5] Guest (Bob) Odaya Katiliyor ve SignalR Baglaniyor...\x1b[0m');
  const joinRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'RealtimeBob' }),
  });
  if (!joinRes.ok) throw new Error(`Join basarisiz: ${joinRes.status}`);
  const joinData = await joinRes.json();
  const guestId = joinData.room.players[1].id;
  const guestSecret = joinData.playerSecret;

  let guestReceivedEmote = null;
  let guestReceivedRoomUpdate = null;

  const guestConn = new signalR.HubConnectionBuilder()
    .withUrl(`${baseUrl}/hubs/rooms`)
    .configureLogging(signalR.LogLevel.None)
    .build();

  guestConn.on('RoomUpdated', (room) => {
    guestReceivedRoomUpdate = room;
  });

  guestConn.on('QuickEmoteReceived', (emote) => {
    guestReceivedEmote = emote;
  });

  await guestConn.start();
  await guestConn.invoke('JoinRoomGroup', roomCode, guestId, guestSecret);
  console.log(`\x1b[32m  -> Guest SignalR Baglandi ve Odaya Eklendi\x1b[0m\n`);

  // 5. Test Real-time Quick Emote Broadcast
  console.log('\x1b[33m[5/5] Real-Time Quick Emote ve Oyun Hamlesi Test Ediliyor...\x1b[0m');
  const emoteSent = await guestConn.invoke('SendQuickEmote', roomCode, guestId, guestSecret, 'gg');
  if (!emoteSent) throw new Error('Emote gonderilemedi.');

  // Wait 300ms for broadcast
  await new Promise((r) => setTimeout(r, 300));

  if (hostReceivedEmote && hostReceivedEmote.emoteId === 'gg') {
    console.log('\x1b[32m  [PASS] SignalR QuickEmoteReceived: Host emote paketini aninda aldi (gg)\x1b[0m');
  } else {
    throw new Error('Host emote paketini alamadi!');
  }

  // Host starts game
  const startRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: hostId, playerSecret: hostSecret }),
  });
  if (!startRes.ok) throw new Error('Start room basarisiz.');

  await new Promise((r) => setTimeout(r, 300));

  if (guestReceivedRoomUpdate && guestReceivedRoomUpdate.status === 'playing') {
    console.log('\x1b[32m  [PASS] SignalR RoomUpdated: Guest oyunun basladigini aninda gordu (playing)\x1b[0m');
  } else {
    throw new Error('Guest oyun baslangic guncellemesini alamadi!');
  }

  // Host makes move at index 4 (center)
  const moveRes = await fetch(`${baseUrl}/api/rooms/${roomCode}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: hostId, playerSecret: hostSecret, index: 4 }),
  });
  if (!moveRes.ok) throw new Error('Move basarisiz.');

  await new Promise((r) => setTimeout(r, 300));

  if (guestReceivedRoomUpdate && guestReceivedRoomUpdate.game.squares[4] === 'X') {
    console.log('\x1b[32m  [PASS] SignalR Live Square Sync: Hamle aninda Guest ekranina yansidi (index: 4 -> X)\x1b[0m');
  } else {
    throw new Error('Guest tahta senkronizasyonunu alamadi!');
  }

  await hostConn.stop();
  await guestConn.stop();

  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log('\x1b[32m   TUM REAL-TIME SIGNALR VE E2E TESTLERI KUSURSUZ!  \x1b[0m');
  console.log('\x1b[32m====================================================\x1b[0m\n');
} finally {
  console.log('Backend sureci kapatiliyor...');
  try {
    process.platform === 'win32'
      ? spawn('taskkill', ['/pid', serverProc.pid.toString(), '/f', '/t'])
      : serverProc.kill('SIGKILL');
  } catch {
    // ignore
  }
}
