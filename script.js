const rooms = [
  { name: '물의 방', member: 'SUHO', icon: '💧', color: '#2ea8ff', rgb: '46,168,255', code: '3', intro: '정화의 시작', orb: '수호의 수룡 원석', nextStory: "정화된 물길이 차가운 식어버린 화로로 흘러들어가며, 붉은 기운에 억눌려 있던 불꽃의 동력을 깨우기 시작한다."},
  { name: '불의 방', member: 'CHANYEOL', icon: '🔥', color: '#ff3b30', rgb: '255,59,48', code: '0', intro: '꺼진 불꽃', orb: '찬열의 불꽃 원석', nextStory: "다시 타오른 거대한 불꽃이 어둠을 밝히자, 단절되어 가로막혀 있던 차원의 틈새와 공간의 경계가 흔들리기 시작한다.<br>이제 내부로 들어갈 수 있다." },
  { name: '순간이동의 방', member: 'KAI', icon: '🛸', color: '#9ca3af', rgb: '156,163,175', code: '0', intro: '뒤틀린 공간', orb: '카이의 공간 원석', nextStory: "비틀린 공간을 뛰어넘어 진입하자, 코어실로 향하는 통로를 가로막고 있던 억눌린 바람과 난류가 거세게 소용돌이친다." },
  { name: '바람의 방', member: 'SEHUN', icon: '🌀', color: '#35c96d', rgb: '53,201,109', code: '2', intro: '붉은 안개', orb: '세훈의 바람 원석', nextStory: "바람이 붉은 안개와 시공간의 난류를 가르자, 마침내 코어실을 단단히 감싸고 있는 최후의 힘의 결계가 모습을 드러낸다." },
  { name: '힘의 방', member: 'D.O.', icon: '✊', color: '#8b5cf6', rgb: '139,92,246', code: '9', intro: '파쇄의 벽', orb: 'D.O.의 대지 원석', nextStory: "단단했던 결계와 바위벽이 강렬한 충격으로 무너지며, 오염된 채 폭주하려 하는 아지트의 메인 코어실 내부가 드러난다." },
  { name: '치유의 방', member: 'LAY', icon: '🌿', color: '#ff6fb5', rgb: '255,111,181', code: '5', intro: '생명력의 완치', orb: '레이의 치유 원석',nextStory: "온전한 치유의 빛이 오염된 코어를 감싸 안자 붉은 기운이 완전히 사라지며, 봉인되었던 메인 게이트가 열리기 시작한다.." } 
];

const ITEMS = {
  torch: { name: '플래시 라이트', icon: '🔦' },
  fanKey: { name: '환풍구 스패너', icon: '🔧' },
  chisel: { name: '강철 정', icon: '🔨' }
};

let room = 0, codes = [];
let inventory = [];
let selectedItem = null;
let roomState = {};
let gateOpening = false;

// ⏱️ 붉은 기운 확산 타이머 (10분 = 600초)
let timeLeft = 1800;
let timerInterval = null;

// 💎 수집한 초능력 원석들
let collectedOrbs = [];

const screen = document.querySelector('#screen');

function theme(x) {
  document.documentElement.style.setProperty('--room', x.color);
  document.documentElement.style.setProperty('--room-rgb', x.rgb);
}

// ⏱️ 타이머 및 수집된 원석 HUD 업데이트
function hud() {
  const codePanel = document.querySelector('.code-panel');
  if (!codePanel) return;

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const timerClass = timeLeft <= 120 ? 'style="color:#ff3b30; animation:blink 1s infinite;"' : '';

  codePanel.innerHTML = `
    <div style="font-size:10px; color:#aaa; margin-bottom:2px;">
      🚨 붉은 기운 잠식까지 <b ${timerClass}>${minutes}:${seconds}</b>
    </div>
    <div class="orb-slots">
      ${rooms.map((r, i) => `
        <span class="hud-orb ${collectedOrbs.includes(r.orb) ? 'collected' : ''}" data-room-index="${i}" style="--orb-color:${r.color};" title="${r.orb}">
          ${r.icon}
        </span>
      `).join('')}
    </div>
    <div id="codeSlots" class="code-slots">
      ${Array.from({ length: 6 }, (_, i) => `<span class="code-slot ${codes[i] ? 'filled' : ''}">${codes[i] || '·'}</span>`).join('')}
    </div>
  `;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      hud();
      document.body.classList.toggle('timer-critical', timeLeft <= 120);
    } else {
      clearInterval(timerInterval);
      gameOver();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function gameOver() {
  roomState.inGame = false;
  renderInventory();
  closeModal();
  screen.innerHTML = `
    <section class="view success" style="background:#110000;">
      <div class="success-icon" style="color:#ff3b30;">☠️</div>
      <p class="eyebrow" style="color:#ff3b30;">ECLIPSE OVERTAKEN</p>
      <h2>붉은 기운에 아지트가 삼켜졌다</h2>
      <p style="color:#aaa; margin:15px 0;">시간이 초과되어 여섯 초능력 원석이 영원히 봉인되었습니다.</p>
      <button class="primary-button" onclick="restartGame()">다시 도전하기 <span>↺</span></button>
    </section>`;
}

// 🎒 인벤토리 관리
function renderInventory() {
  const panel = document.getElementById('inventoryPanel');
  if (roomState.inGame) panel.classList.remove('hidden');
  else panel.classList.add('hidden');

  const slots = document.querySelectorAll('.inventory-slot');
  slots.forEach((slot, index) => {
    const itemId = inventory[index];
    if (itemId && ITEMS[itemId]) {
      slot.innerHTML = ITEMS[itemId].icon;
      slot.title = ITEMS[itemId].name;
      slot.onclick = () => selectItem(itemId);
    } else {
      slot.innerHTML = '';
      slot.title = '';
      slot.onclick = null;
    }
    slot.classList.remove('selected');
  });

  if (selectedItem) {
    const selectedIdx = inventory.indexOf(selectedItem);
    if (selectedIdx !== -1 && slots[selectedIdx]) {
      slots[selectedIdx].classList.add('selected');
    }
  }
}

function getItem(itemId) {
  if (inventory.includes(itemId)) return;
  inventory.push(itemId);
  status(`[${ITEMS[itemId].name}]을(를) 손에 쥐었다.`, true);
  renderInventory();
}

function selectItem(itemId) {
  if (selectedItem === itemId) {
    selectedItem = null;
    status('소지품 선택을 해제했다.');
  } else {
    selectedItem = itemId;
    status(`[${ITEMS[itemId].name}]을(를) 사용 준비했다.`, true);
  }
  renderInventory();
}

function restartGame() {
  stopTimer();
  room = 0;
  codes = [];
  collectedOrbs = [];
  inventory = [];
  selectedItem = null;
  timeLeft = 1800;
  gateOpening = false;
  document.body.classList.remove('timer-critical');
  roomState = { inGame: false };
  hud();
  renderInventory();
  theme({ color: '#e33b3b', rgb: '227,59,59' });
  screen.innerHTML = document.querySelector('#introTemplate').innerHTML;
}

function startGame() {
  showBriefing();
}

// 🌌 프롤로그 서사
function showBriefing() {
  roomState.inGame = false;
  renderInventory();
  screen.innerHTML = `
    <section class="view briefing">
      <article class="document">
        <p class="eyebrow">PROLOGUE // RED FORCE INCIDENT</p>
        <h2>초능력 아지트 봉인 사건</h2>
        <p>붉은 기운이 아지트를 삼켜버린 그날 밤, 여섯 초능력 원석이 빛을 잃었다.</p>
        <p>각 구역에 흩어진 단서들을 탐색해 동력을 되살리고 메인 게이트를 해제하라.</p>

        <p style="color:var(--room); font-weight:bold; margin-top:15px;">EXO의 힘을 직접 가진 사람은 이미 붉은 기운에 잠식되어 원석에 접근할 수 없다.<br>외부인은 오염의 영향을 받지 않기 때문에 오직 당신만이 봉인을 풀 수 있다.<br>여섯 개의 방을 차례로 해결하고 암호 코드를 수집하라.</p>
        <hr>
        <button class="primary-button" onclick="firstEnter()">아지트 진입 <span>→</span></button>
      </article>
    </section>`;
}

function firstEnter() {
  startTimer();
  showLetterModal();
}

function showLetterModal() {
  closeModal();
  const modal = document.createElement('div');
  modal.id = 'gameModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0, 0, 0, 0.92); display: grid; place-items: center; padding: 20px;
    animation: fadeIn 0.4s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="width: min(500px, 92%); background: #0f111a; border: 1px solid var(--room); border-top: 4px solid var(--room); padding: 28px 24px; border-radius: 6px; box-shadow: 0 0 40px rgba(0,0,0,0.9); text-align: left; position: relative;">
      
      <div style="font-size: 11px; color: var(--room); font-family: Orbitron, sans-serif; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <span>✉️</span> URGENT LETTER FROM EXO
      </div>
      
      <h3 style="margin: 0 0 16px; color: #fff; font-size: 18px; border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 10px;">
        아지트 입구에 남겨진 긴급 메모
      </h3>

      <div style="color: #d0d4e0; font-size: 14px; line-height: 1.8; word-break: keep-all; font-style: italic; margin-bottom: 24px;">
        "이 글을 읽고 있다면, 붉은 기운이 이미 아지트를 완전히 삼켰다는 뜻이겠지.<br><br>
        지금 아지트 내부의 모든 제어장치는 차단 되었고, 코어실로향하는 통로들은 각 초능력 구역의 봉인뒤로 굳게 잠겨버렸어.<br><br> 
        EXO의 힘을 가진 우리는 이미 오염되어 직접 원석에 접근할 수 없어. 오직 외부에서 온 당신만이 이 봉인을 풀 수 있어.<br><br>
        우리는 결계가 무너지기 전, 코어가 있는 가장 깊은 곳으로 먼저 들어간다. 
        붉은 기운을 정화하고 동력을 되살려 우리를 따라와 줘.<br><br>
        여섯 초능력의 흐름을 차례로 이어준다면, 코어실의 최후 게이트 앞에서 다시 만날 수 있을 거야."
      </div>

      <button onclick="closeModal(); hub();" style="width: 100%; padding: 14px; background: var(--room); border: 0; color: #000; font-weight: bold; font-size: 15px; cursor: pointer; border-radius: 3px; transition: transform 0.1s;">
        편지를 접고 중앙 제어실로 이동 ➔
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

function hub() {
  roomState.inGame = true;
  renderInventory();
  hud();
  let r = rooms[room];
  theme(r);
  screen.innerHTML = `
    <section class="hub">
      <div class="hub-title">
        <p class="sector">MAIN HIDEOUT // CENTRAL HALL</p>
        <h2>메인 아지트 중앙 제어실</h2>
      </div>
      <div class="sector-map">
        ${rooms.map((x, i) => `
          <button class="sector-card ${i === room ? 'active' : 'locked'}" ${i === room ? 'onclick="showRoom()"' : ''}>
            <span class="card-icon">${x.icon}</span>
            <b>0${i + 1}. ${x.name}</b>
            <small style="display:block; margin-top:2px; color:var(--room);">${x.intro}</small>
            <small>${i < room ? 'RESTORED ✨' : i === room ? 'ACCESS GRANTED' : 'ENERGY LOCKED'}</small>
          </button>
        `).join('')}
      </div>
    </section>`;
}

function scene(objects) {
  const sceneTheme = ['water', 'fire', 'teleport', 'wind', 'strength', 'healing'][room];
  return `
    <div class="room-scene room-scene--${sceneTheme}">
      ${objects}
      <span class="scene-status">RED FORCE RESIDUE DETECTED</span>
    </div>`;
}

function showRoom() {
  let r = rooms[room];
  theme(r);
  roomState = { inGame: true };
  screen.innerHTML = `
    <section class="room">
      <div class="room-heading">
        <p class="sector">SECTOR 0${room + 1} // ${r.intro}</p>
        <h2>${r.icon} ${r.name}</h2>
        <p class="member">${r.member}</p>
      </div>
      ${puzzle()}
    </section>`;
}

// 🧩 방별 퍼즐 및 장치 배치
function puzzle() {
  let top = '<div class="puzzle">';

  // 0: 물의 방 (SUHO)
  if (room === 0) {
    top += `<h3>"붉은 기운에 오염된 수로로 인해 아지트의 정화 장치가 멈췄다. 맑은 물길을 다시 흐르게 하라."</h3>
            <p class="puzzle-guide">수질 정화 유리관의 수치와 수호의 일지 단서를 조합하여 수문 암호를 풀어내세요.</p>`;
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectWater(0)">🔍 <b>수질 정화 유리관</b><br><small style="color:#aaa; font-size:11px;">수호의 수룡 기운이 가라앉은 높은 관</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectWater(1)">🔍 <b>수호의 관리 일지</b><br><small style="color:#aaa; font-size:11px;">붉은 오염을 씻어내기 위한 메모</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('water')">🔒 <b>수문 터치패드</b><br><small style="color:#aaa; font-size:11px;">수로 복구 영문 도어락</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 1: 불의 방 (CHANYEOL)
  if (room === 1) {
    top += `<h3>"동력원의 화로가 서늘하게 식어버렸다. 차가운 어둠 속에 불꽃의 온기를 다시 피워라."</h3>
            <p class="puzzle-guide">공구 상자에서 빛을 찾고, 화로 벽면에 드러난 영문 패턴을 해독하여 점화하세요.</p>`;
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectFire(0)">🔍 <b>방치된 공구 상자</b><br><small style="color:#aaa; font-size:11px;">찬열이 작업할 때 쓰던 녹슨 철제함</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectFire(1)">🔍 <b>식어버린 화로 벽면</b><br><small style="color:#aaa; font-size:11px;">불꽃의 열기가 멈춘 어두운 벽</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('fire')">🔒 <b>불꽃 동력 장치</b><br><small style="color:#aaa; font-size:11px;">화염을 되살릴 암호패드.<br>찬열은 점화암호를 항상 영어로 기록했다. </small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 2: 순간이동의 방 (KAI)
  if (room === 2) {
    top += `<h3>"차원의 좌표가 비틀려 내부 통로가 가로막혔다. 뒤틀린 공간을 바로잡고 도약하라."</h3>
            <p class="puzzle-guide">미로 구슬 장치와 공간 기록지를 탐색해 차원문을 고정할 키워드를 찾아내세요.</p>`;
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectTeleport(0)">🔍 <b>미로 구슬 장치</b><br><small style="color:#aaa; font-size:11px;">시공간의 좌표가 뒤틀린 차원의 틀</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectTeleport(1)">🔍 <b>카이의 세계관 기록집</b><br><small style="color:#aaa; font-size:11px;">공간 이동의 흔적이 적힌 서적</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('teleport')">🔒 <b>차원문 제어반</b><br><small style="color:#aaa; font-size:11px;">포탈을 고정할 키워드 입력기. <br>같은 나라에 태어나서 같은 언어로 말을 해서 참 다행이야.</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 3: 바람의 방 (SEHUN)
  if (room === 3) {
    top += `<h3>"코어실로 향하는 통로가 짙은 붉은 안개에 잠겼다. 바람을 일으켜 안개를 가라앉혀라."</h3>
            <p class="puzzle-guide">환풍구를 열어 안개 속에 감춰진 암호를 찾고, 어긋난 시간만큼 신호를 되감으세요.</p>`;
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectWind(0)">🔍 <b>작업대 선반</b><br><small style="color:#aaa; font-size:11px;">세훈의 바람 선풍 스패너와 일지</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectWind(1)">🔍 <b>밀폐 환풍구</b><br><small style="color:#aaa; font-size:11px;">붉은 안개가 소용돌이치는 해치</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('wind')">🔒 <b>풍향 제어 스위치</b><br><small style="color:#aaa; font-size:11px;">기류를 정상화할 영문 키워드 패드</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 4: 힘의 방 (D.O.)
  if (room === 4) {
    top += `<h3>"최후의 결계가 바위처럼 단단하게 코어실 입구를 막아섰다. 강력한 공명으로 벽을 깨부숴라."</h3>
            <p class="puzzle-guide">파쇄 정으로 바위를 가르고, 단단한 암벽에 새겨진 충격의 파동 순서를 복원하세요.</p>`;
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectStrength(0)">🔍 <b>파쇄 도구 상자</b><br><small style="color:#aaa; font-size:11px;">디오의 강한 충격을 견디는 강철 정</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectStrength(1)">🔍 <b>파쇄의 거대 암벽</b><br><small style="color:#aaa; font-size:11px;">대지의 힘으로 균열이 간 단단한 바위</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('strength')">🔒 <b>대지 공명 단자대</b><br><small style="color:#aaa; font-size:11px;">진동을 완화할 알파벳 제어기</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 5: 치유의 방 (LAY)
  top += `<h3>"레이의 치유력이 붉은 기운에 잠식된 아지트의 심장부에 갇혔다. 마지막 생명력을 되찾아라."</h3>
          <p class="puzzle-guide">고대 벽화의 암호문과, 그 옆에 적힌 열쇠말을 함께 조사해 코드를 복호화하세요.</p>`;
  return top + scene(`
    <button class="scene-object" style="left:8%;top:20%" onclick="inspectHealing(0)">🔍 <b>심장부 고대 벽화</b><br><small style="color:#aaa; font-size:11px;">유니콘 상징 옆에 새겨진 4글자 암호</small></button>
    <button class="scene-object" style="right:8%;top:20%" onclick="inspectHealing(1)">🔍 <b>벽화 옆 레이의 문양</b><br><small style="color:#aaa; font-size:11px;">치유의 빛을 이끄는 해독 열쇠말</small></button>
    <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('healing')">🔒 <b>치유의 코어 게이트</b><br><small style="color:#aaa; font-size:11px;">최종 초능력 복구 알파벳 시스템</small></button>
  `) + `<p id="status" class="status"></p></div>`;
}

// [물의 방] - 스토리텔링 강화
function inspectWater(id) {
  if (id === 0) {
    showStoryModal('💧 세 개의 수문 유리관', `
      <div style="padding:10px; line-height:1.8;">
        <p>수호의 수룡 기운이 흐르던 세 개의 대형 유리 기둥에 붉은 오염수가 차올라 있다.</p>
        <p style="color:#2ea8ff; margin:15px 0;">
          • 상단 수면 위에 부유하는 수치: <b>14</b><br>
          • 중단 수면 속에 침전된 수치: <b>21</b><br>
          • 바닥 침전물 사이에 음각된 수치: <b>19</b>
        </p>
        <p style="color:#aaa; font-size:13px;">세 유리관에 잔류한 수치 기호들이 수문 제어와 연동되어 있는 듯하다.<br> 답은 총 3자리이다.</p>
      </div>
    `);
  } else {
    showStoryModal('📜 수호의 관리 일지', `
      <div style="padding:10px; line-height:1.8;">
        <p>붉은 기운은 수로의 가장 낮은 곳에 먼저 고여 있었다. 바닥의 물이 탁한 채로는, 아무리 위에서 새 물이 흘러도 정화된 파동은 끝내 아래로 가라앉아 사라질 뿐이었다.

        <br>수호의 기록:<br>
        “가라앉은 어둠부터 깨워.<br>
        가장 낮은 물결이 맑아져야,<br>
        그 울림이 위쪽 수로까지 거슬러 오를 수 있어.”
        </p>
      </div>
    `);
  }
}

// [불의 방] 
function inspectFire(id) {
  if (id === 0) {
    if (!inventory.includes('torch')) {
      getItem('torch');
    }
    showStoryModal('📦 방치된 공구 상자', `
      <p>구석진 철제 상자 속에서 [플래시 라이트 🔦]를 주웠다.</p>
      <hr style="border-color:#333; margin:12px 0;">
      <p style="color:#ff3b30; font-style:italic;">
        "화로 벽에 예비 점화 코드를 숨겨두었어. 불빛이 아니라 빛으로 확인해."
      </p>
      <p style="text-align:right; color:#ff3b30; font-weight:bold; margin-top:10px;">— CHANYEOL</p>
    `);
  } else {
    if (selectedItem === 'torch' || roomState.torchUsed) {
      roomState.torchUsed = true;
      showStoryModal('💡 식어버린 화로 벽면 비추기', `
        <div style="background:#1a0505; border:1px solid #ff3b30; padding:20px; text-align:center; font-family:monospace;">
          <p style="color:#aaa; font-size:14px; margin-bottom:10px;">
            222 : TWO<br>
            4973 : FIVE<br>
            3495 : TONE<br>
            ⁙숫자의 크기보다 자리수에 집중해보세요.
          </p>
          <hr style="border-color:#441111; margin:12px 0;">
          <p style="font-size:24px; color:#ff3b30; letter-spacing:6px; margin:0;">
            <b>5535 : ????</b>
          </p>
        </div>
      `);
    } else {
      status('어두워서 보이지 않는다. 손에 [플래시 라이트]를 들어야 한다.');
    }
  }
}

// [순간이동의 방] - 나비효과 
function inspectTeleport(id) {
  if (id === 0) {
    showStoryModal('🛸 미로 구슬 장치', `
      <p style="text-align:center; color:#9ca3af; margin:15px 0; font-size:15px;">
        차원의 문이 붉은 기운에 뒤틀렸다.<br>
        공간을 이동해 게이트 내부로 들어왔지만 잘못된 좌표 하나가 구슬에 존재한다.<br>
        구슬의 가장자리에는 네 개의 문장이 희미하게 떠오른다.<br>
        갈라진 세계의 기록은 언제나 시작점에서 서로 다른 결말을 만든다.
      </p>
    `);
  } else {
    showStoryModal('📓 카이의 공간 기록지', `
      <div style="color:#ccc; padding:10px; line-height:1.9;">
        <p>나는 한 번의 이동쯤은 아무것도 바꾸지 못할 거라 믿었다.</p>
        <p>비틀린 좌표 하나가 수많은 세계를 갈라놓기 전까지는.</p>
        <p>효력을 잃은 구슬은 미세한 떨림에도 새로운 길을 뱉어 냈다.</p>
        <p>과거의 한 걸음을 바꾸자, 현재로 돌아오는 길마저 달라졌다.</p>
       </div>
    `);
  }
}

// [바람의 방] - 시저 암호 (-3)
function inspectWind(id) {
  if (id === 0) {
    if (!inventory.includes('fanKey')) {
      getItem('fanKey');
    }
      showStoryModal('🔧 작업대 선반', `
      <p>기름때 묻은 선반 구석에서 [환풍구 스패너 🔧]를 발견했다.</p>
      <hr style="border-color:#333; margin:12px 0;">
      <p style="color:#35c96d; font-style:italic;">
        <b>[세훈의 관찰일지]</b><br>
        붉은 안개가 내부 깊은 곳까지 침식해 들어오고 있다.<br>
        코어실의 문을 열 수 있는건, 오직 시공간을 가르는 바람 뿐이다.<br>
        바람의 흐름을 되살려 짙은 안개를 거두어내야해.
      </p>
    `);
  } else {
    if (selectedItem === 'fanKey' || roomState.windCleared) {
      roomState.windCleared = true;
      showStoryModal('🌀 밀폐 환풍구 내부', `
        <div style="padding:10px; line-height:1.8;">
          <p>스패너로 조여진 볼트를 풀자 바람의 통로를 가로막던 붉은 안개가 거세게 뿜어져 나온다.</p>
          <p style="text-align:center; font-size:28px; color:#35c96d; letter-spacing:6px; margin:15px 0;"><b>Z L Q G</b></p>
          <p style="color:#aaa; font-size:13px; text-align:center;">
           폭풍이 지나간 뒤, 풍향계의 바늘은 정상 위치에서 어긋난 채 멈춰 있었다.<br>
           옆의 고장 난 시계는 <b>9시</b>를, 기준 시계는 <b>12시</b>를 가리킨다.
           </p>

        <p style="color:#aaa; font-size:13px; text-align:center;">
        “바람의 눈금과 기록의 문자는 같은 고리를 돈다.<br>
         어긋난 시간만큼, 신호를 되감아라.”
          </p>
        </div>
      `);
    } else {
      status('볼트로 단단히 닫혀 있다. [환풍구 스패너]가 필요하다.');
    }
  }
}

// [힘의 방]
function inspectStrength(id) {
  if (id === 0) {
    if (!inventory.includes('chisel')) {
      getItem('chisel');
    }
      showStoryModal('🔨 파쇄 도구 상자', `
        <p>[강철 정 🔨]을 획득했다!</p>
        <hr style="border-color:#333; margin:12px 0;">
        <p style="color:#c4b5fd; font-style:italic;">
          "붉은 기운이 코어실 앞의 결계를 돌처럼 단단하게 굳혀버렸다.<br>
          내 모든 힘을 실어 내려쳤지만 미세한 균열만 남았어. 맨손으로는 결코 부술 수 없다.<br><br>
          이 강철 정으로 내가 남긴 균열을 따라 강하게 공명시켜라. 가장 처음 시작된 충격의 파동을 찾는 순간, 최후의 결계는 무너질 것이다."
        </p>
        <p style="text-align:right; color:#c4b5fd; font-weight:bold; margin-top:10px;">— D.O.</p>
      `);
  } else {
    if (selectedItem === 'chisel' || roomState.rockBroken) {
      roomState.rockBroken = true;
      showStoryModal('💥 거대 암석 파쇄', `
      <p>
       정이 암석을 가르자, 서로 다른 시점에 생긴 세 개의 충격 흔적이 드러났다.
       처음의 충격은 가느다란 금 하나만 남겼지만,
        파동이 거듭될수록 균열은 하나씩 늘어나 벽을 갈라놓았다.
        </p>

      <div style="margin:20px auto; max-width:250px; font-size:24px;
            line-height:2; color:#c4b5fd; font-family:monospace;">
        <div>XV &nbsp;&nbsp;&nbsp; ///</div>
        <div>V &nbsp;&nbsp;&nbsp;&nbsp; /</div>
        <div>XXIV &nbsp; //</div>
      </div>

       <p style="color:#aaa; font-size:13px; text-align:center;">
         “가장 처음 생긴 균열부터, 충격의 순서를 되짚어라.”
       </p>
     </div>
   `);
    } else status('단단하게 봉인된 바위벽이다. [강철 정]이 필요하다.');
  }
}

// [치유의 방] - 암호 원리 힌트 조율 (풀이 정답 제거)
function inspectHealing(id) {
  if (id === 0) {
    showStoryModal('📜 심장부 고대 벽화', `
      <p>빛을 잃어가는 치유의 유니콘 벽화 중앙에 4글자의 암호문이 뚜렷하게 각인되어 있다.</p>
      <p style="text-align:center; font-size:28px; color:#ff6fb5; letter-spacing:8px; margin:15px 0;"><b>N O P P</b></p>
      <div style="padding:10px; line-height:1.8; font-style:italic; color:#e0e4f0;">
        <p>"무사히 여기까지 도착해 줘서 고마워.</p>
        <p>폭주하는 코어를 막아섰지만, 붉은 기운이 너무 강해 내 치유 원석마저 빛을 잃고 말았어.</p>
        <p>하지만 난 믿고 있었어. 밖에서 물과 불, 차원과 바람을 뚫고 걸어오는 당신이 있다는 걸.</p>
        <p><b style="color:#ff6fb5;">이제 마지막 하나야. 빛을 잃은 원석에 다시 치유의 생명력을 불어넣어 줘.</b><br>
        코어가 정화되는 순간, 아지트의 메인 게이트가 열릴 거야."</p>
        <p style="text-align:right; color:#ff6fb5; font-weight:bold; margin-top:10px;">— LAY</p>
      </div>
    `);
  } else {
    showStoryModal('🌿 레이의 치유 문양', `
      <div style="line-height:1.8;">
        <p>레이를 상징하는 해독 열쇠말(Key): <b style="color:#ff6fb5;">LAY</b></p>
        <hr style="border-color:#333; margin:10px 0;">
        <p style="color:#d0d4e0; font-size:13px;">
          <b>[비즈네르 복호화 힌트]</b><br>
          암호문(NOPP)의 알파벳 순번에서 열쇠말(LAY)의 알파벳 순번을 순서대로 빼면 치유의 코드가 도출됩니다.<br>
          열쇠말이 부족한 경우 반복하세요.(알파벳의 순서는 0-25까지로 사용하세요.)
          (※ 음수일 경우 26을 더해서 계산하세요.)
        </p>
      </div>
    `);
  }
}

// ⌨️ 키보드 타자 입력 암호 모달
function openTypeModal(type) {
  let title = "🔒 보안 패드";
  let guideText = "";
  let targetAns = "";

  if (type === 'water') {
    title = "💧 수문 영문 도어락";
    targetAns = "SUN";
  } else if (type === 'fire') {
    title = "🔥 불꽃 동력 점화 패드";
    targetAns = "FIRE";
  } else if (type === 'teleport') {
    title = "🛸 차원문 수호자 제어반";
    targetAns = "나비효과";
  } else if (type === 'wind') {
    title = "🌀 풍향 제어 스위치";
    targetAns = "WIND";
  } else if (type === 'strength') {
    title = "✊ 대지 공명 단자대";
    targetAns = "EXO";
  } else if (type === 'healing') {
    title = "🌿 치유의 메인 게이트";
    guideText = "NOPP를 열쇠말 LAY로 복호화한 4자리 단어를 입력하세요.";
    targetAns = "CORE";
  }

  showInputModal(title, guideText, targetAns);
}

function showInputModal(title, guide, answer) {
  closeModal();
  const modal = document.createElement('div');
  modal.id = 'gameModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0, 0, 0, 0.88); display: grid; place-items: center; padding: 20px;
  `;
  modal.innerHTML = `
    <div style="width:min(440px, 95%); background:#0a0c14; border:1px solid var(--room); padding:25px; border-radius:4px; box-shadow:0 0 35px rgba(0,0,0,0.9);">
      <h3 style="margin:0 0 10px; color:var(--room); font-family:Orbitron, sans-serif; font-size:16px;">${title}</h3>
      ${guide ? `<p style="color:#aaa; font-size:13px; line-height:1.5; margin-bottom:15px;">${guide}</p>` : ''}
      
      <form onsubmit="checkTyping(event, '${answer}')">
        <input type="text" id="typeInput" autocomplete="off" placeholder="암호 입력..." 
          style="width:100%; padding:12px; background:#000; border:1px solid var(--room); color:#fff; font-size:18px; text-align:center; text-transform:uppercase; font-family:Orbitron, sans-serif;">
        <button type="submit" style="margin-top:15px; width:100%; padding:12px; background:var(--room); border:0; color:#000; font-weight:bold; cursor:pointer;">[ ENTER / 해제 ]</button>
      </form>
      <button onclick="closeModal()" style="margin-top:10px; width:100%; padding:8px; background:transparent; border:1px solid #444; color:#aaa; cursor:pointer;">닫기</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('typeInput')?.focus(), 100);
}

function checkTyping(e, targetAns) {
  e.preventDefault();
  const inputVal = document.getElementById('typeInput').value.trim().toUpperCase();
  if (inputVal === targetAns) {
    alert('🔓 해제되었습니다.');
    closeModal();
    clear();
  } else {
    alert('❌ [ACCESS DENIED] 잘못된 암호입니다.');
    document.getElementById('typeInput').value = '';
  }
}

function showStoryModal(title, contentHtml) {
  closeModal();
  const modal = document.createElement('div');
  modal.id = 'gameModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0, 0, 0, 0.88); display: grid; place-items: center; padding: 20px;
  `;
  modal.innerHTML = `
    <div style="width:min(480px, 95%); background:#0c0d16; border:1px solid rgba(255,255,255,0.2); border-left:4px solid var(--room); padding:25px; border-radius:2px; box-shadow:0 0 35px rgba(0,0,0,0.9);">
      <h3 style="margin:0 0 15px; color:var(--room); font-size:16px;">${title}</h3>
      <div style="color:#d0d4e0; font-size:14px; line-height:1.8;">${contentHtml}</div>
      <button onclick="closeModal()" style="margin-top:20px; width:100%; padding:10px; background:#181a26; border:1px solid #444; color:#fff; cursor:pointer;">닫기 [X]</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeModal() {
  const m = document.getElementById('gameModal');
  if (m) m.remove();
}

function status(t, g = false) {
  let x = document.querySelector('#status');
  if (x) {
    x.textContent = t;
    x.className = 'status ' + (g ? 'good' : '');
  }
}

// 🏁 각 방 해금 성공 연출
async function clear() {
  if (roomState.clearing) return;
  roomState.clearing = true;
  let r = rooms[room];
  await launchOrbToHud(r, room);
  codes.push(r.code);
  collectedOrbs.push(r.orb);
  hud();
  document.querySelector(`.hud-orb[data-room-index="${room}"]`)?.classList.add('orb-arrived');
  roomState.inGame = false;
  renderInventory();

  // 다음 방 연결 문구 (데이터에 등록해둔 문구를 불러오거나 기본값 적용)
  const nextStoryText = r.nextStory || "차원의 기운이 정화되며 다음 섹터의 봉인이 해제됩니다.";

  screen.innerHTML = `
    <section class="view success">
      <div class="success-icon" style="filter:drop-shadow(0 0 15px ${r.color});">${r.icon}</div>
      <p class="eyebrow">SECTOR RESTORED</p>
      <h2>${r.name} 복구 완료</h2>
      
      <div style="margin:20px 0; padding:15px; background:rgba(255,255,255,0.05); border:1px dashed var(--room); border-radius:4px;">
        <span style="font-size:12px; color:#aaa; display:block;">💎 연결 오브제 획득</span>
        <b style="font-size:18px; color:#fff;">[ ${r.orb} ]</b>
      </div>

      <!-- 📜 [신규] 다음 방 연결 문구 카드 -->
      <div style="margin: 15px 0 25px; padding: 14px 18px; background: rgba(var(--room-rgb), 0.12); border-left: 3px solid var(--room); text-align: left; max-width: 500px;">
        <span style="font-size: 10px; color: var(--room); font-family: Orbitron; font-weight: 700; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">SEQUENTIAL NARRATIVE</span>
        <p style="margin: 0; color: #d0d4df; font-size: 13px; line-height: 1.6; word-break: keep-all;">
          "${nextStoryText}"
        </p>
      </div>

      <p>에너지 서명 <b>${r.code}</b>이 성공적으로 전송되었습니다.</p>
      <div class="code-reveal">CODE ${r.code}</div>
      <button class="primary-button" onclick="next()">${room === 5 ? '메인 게이트로' : '다음 방으로'} <span>→</span></button>
    </section>`;
}
function launchOrbToHud(roomData, roomIndex) {
  const target = document.querySelector(`.hud-orb[data-room-index="${roomIndex}"]`) || document.querySelector('.code-panel');
  const source = document.querySelector('.room-scene') || screen;
  if (!target || !source) return Promise.resolve();

  const start = source.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const orb = document.createElement('div');
  orb.className = 'orb-flight';
  orb.textContent = roomData.icon;
  orb.style.setProperty('--orb-color', roomData.color);
  orb.style.left = `${start.left + start.width / 2 - 24}px`;
  orb.style.top = `${start.top + start.height / 2 - 24}px`;
  document.body.appendChild(orb);

  const animation = orb.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${end.left + end.width / 2 - (start.left + start.width / 2)}px, ${end.top + end.height / 2 - (start.top + start.height / 2)}px) scale(.28)`, opacity: .95 }
  ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });

  return animation.finished.catch(() => {}).then(() => orb.remove());
}

function next() {
  room++;
  room < 6 ? hub() : finalRoom();
}

// ⛩️ 메인 게이트 (최종 정답 로직: 350902)
function finalRoom() {
  stopTimer();
  roomState.inGame = false;
  renderInventory();
  theme({ color: '#e33b3b', rgb: '227,59,59' });
  screen.innerHTML = `
    <section class="view final">
      <div class="gate-chamber">
        <div class="gate-ring gate-ring--outer"></div>
        <div class="gate-ring gate-ring--inner"></div>
        <div class="gate">⛩</div>
        <div class="gate-orbs">
          ${rooms.map(r => `<span style="--orb-color:${r.color};">${r.icon}</span>`).join('')}
        </div>
      </div>
      <p class="eyebrow">MAIN GATE // ECLIPSE CORE</p>
      <h2>아지트 메인 게이트</h2>

      <p style="color:#888; font-size:12px; margin-bottom:20px;">6개의 초능력 원석이 모두 반응합니다.</p>

      <div style="margin: 0 auto 20px; padding: 14px 18px; background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 6px; max-width: 480px; text-align: center;">
        <span style="font-size: 11px; color: #8fffc3; font-family: Orbitron, sans-serif; letter-spacing: 1px; display: block; margin-bottom: 6px;">
          ✨ RESONATING ORB INSCRIPTION
        </span>
        <p style="margin: 0; color: #fff; font-size: 14px; line-height: 1.6; word-break: keep-all; font-weight: 500;">
          "흩어졌던 우리가 하나로 모였을 때,<br>그 어떤 개기일식의 어둠도 우리를 가릴 수 없어."
        </p>
      </div>
      <p style="color:#ff3b30; font-weight:bold; margin-bottom:10px;">
        ⚠️ 수집한 6개의 코드 번호를 초능력을 가진 자들의 나이 순서대로 배치하여 입력하시오.
      </p>

      <div class="final-code">
        ${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" oninput="jump(this,${i})">`).join('')}
      </div>
      <button class="primary-button" onclick="finish()">최종 봉인 해제 <span>→</span></button>
      <p id="status" class="status"></p>
    </section>`;
}

function jump(e, i) {
  if (e.value && i < 5) document.querySelectorAll('.final-code input')[i + 1].focus();
}

// 🎉 클라이맥스 엔딩 연출
function finish() {
  let v = [...document.querySelectorAll('.final-code input')].map(x => x.value).join('');
  
  // 최종 정답: 350902 (수호(3) -> 레이(5) -> 찬열(0) -> D.O.(9) -> 카이(0) -> 세훈(2))
  if (v === '350902') {
    if (gateOpening) return;
    gateOpening = true;
    document.querySelector('.final')?.classList.add('gate-opening');
    setTimeout(showEnding, 1200);
  } else {
    status('게이트가 응답하지 않는다. 수집한 코드 번호를 나이 순서대로 다시 배치해보자.');
  }
}

function showEnding() {
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  screen.innerHTML = `
    <section class="view success" style="padding: 30px 20px;">
      <div class="success-icon" style="font-size:64px; text-shadow:0 0 30px #8fffc3; margin-bottom:10px;">☀</div>
      <p class="eyebrow" style="color:#8fffc3; letter-spacing:2px;">ECLIPSE ENDED // MISSION COMPLETE</p>
      <h2 style="font-size:32px; margin:10px 0 20px;">빛을 찾은 아지트: WE ARE ONE</h2>

      <!-- 🏆 클리어 스탯 카드 -->
      <div style="display:flex; justify-content:center; gap:15px; max-width:480px; margin:0 auto 20px;">
        <div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(143,255,195,0.3); padding:12px; border-radius:6px;">
          <span style="font-size:11px; color:#aaa; display:block;">⏱️ 남은 정화 시간</span>
          <b style="font-size:18px; color:#8fffc3;">${minutes}분 ${seconds}초</b>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(143,255,195,0.3); padding:12px; border-radius:6px;">
          <span style="font-size:11px; color:#aaa; display:block;">🎖️ 부여된 칭호</span>
          <b style="font-size:16px; color:#fff;">EXO-L</b>
        </div>
      </div>

      <!-- 💎 6개 원석 정화 연출 -->
      <div style="display:flex; justify-content:center; gap:8px; margin-bottom:25px;">
        ${rooms.map(r => `
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.5); border:2px solid ${r.color}; display:grid; place-items:center; font-size:18px; box-shadow:0 0 12px ${r.color};" title="${r.name}">
            ${r.icon}
          </div>
        `).join('')}
      </div>

      <!-- 💬 멤버들의 감동 메시지 카드 -->
      <div style="background:rgba(15, 17, 26, 0.85); border-left:4px solid #8fffc3; padding:20px; max-width:520px; margin:0 auto 25px; text-align:left; line-height:1.85; font-size:13.5px; color:#e0e4f0;">
        <p style="margin:0 0 10px; color:#8fffc3; font-weight:bold; font-size:14px;">✉️ 코어실 게이트 너머에서 들려온 목소리</p>
        <p style="margin:0; font-style:italic;">
         "수로가 정화되고 불꽃이 피어올라, 비틀린 차원과 붉은 안개를 가르던 그 순간부터 알고 있었어.<br>
          단단한 결계를 부수고 마지막 치유의 빛까지 되살려내며 끝까지 걸어와 줘서 고마워.<br><br>
          <b style="color:#fff;">여섯 개의 원석이 하나로 모여 다시 빛나는 한, 앞으로 어떤 어둠이 찾아와도 우린 이겨낼 수 있을 거야.</b><br>
          지나가는 일식 구름 너머로 다시 빛날 우리를 위해, 앞으로도 항상 함께해 줘."
        </p>
        <p style="text-align:right; color:#8fffc3; font-weight:bold; margin:12px 0 0;">— EXO</p>
      </div>

      <!-- 🌒 천문 정보 -->
      <p style="color:#888; font-size:12px; margin-bottom:20px;">
        🌒 한반도 다음 개기일식 예측일: <strong style="color:#aaa;">2035년 9월 2일 (350902)</strong>
      </p>

      <button class="primary-button" onclick="restartGame()">처음부터 다시하기 <span>↺</span></button>
    </section>`;
}

restartGame();
