const rooms = [
  { name: '물의 방', member: 'SUHO', icon: '💧', color: '#2ea8ff', rgb: '46,168,255', code: '3', intro: '정화의 시작', orb: '수호의 수룡 원석', nextStory: "정화된 물줄기가 불의 방으로 흘러가며, 뜨겁게 타오르던 열기를 가라앉힌다."},
  { name: '불의 방', member: 'CHANYEOL', icon: '🔥', color: '#ff3b30', rgb: '255,59,48', code: '0', intro: '꺼진 불꽃', orb: '찬열의 불꽃 원석', nextStory: "타오르는 불꽃이 차원의 균열을 비추자, 닫혀있던 공간의 문이 흔들리기 시작한다." },
  { name: '순간이동의 방', member: 'KAI', icon: '🛸', color: '#9ca3af', rgb: '156,163,175', code: '0', intro: '뒤틀린 공간', orb: '카이의 공간 원석', nextStory: "열린 차원문 사이로 강한 바람이 불어와, 굳게 닫혔던 바람의 통로를 두드린다." },
  { name: '바람의 방', member: 'SEHUN', icon: '🌀', color: '#35c96d', rgb: '53,201,109', code: '2', intro: '붉은 안개', orb: '세훈의 바람 원석', nextStory: "안개가 걷히자 드러난 벽면 뒤로, 굳게 막혀있던 힘의 방 통로가 모습을 드러낸다." },
  { name: '힘의 방', member: 'D.O.', icon: '✊', color: '#8b5cf6', rgb: '139,92,246', code: '9', intro: '파쇄의 벽', orb: 'D.O.의 대지 원석', nextStory: "무너진 벽 너머, 상처 입은 아지트의 핵심 제어실이 모습을 드러낸다. 마지막 치유만이 남았다." },
  { name: '치유의 방', member: 'LAY', icon: '🌿', color: '#ff6fb5', rgb: '255,111,181', code: '5', intro: '생명력의 완치', orb: '레이의 치유 원석',nextStory: "정화된 치유의 빛이 온 공간을 감싸자, 봉인되었던 차원의 게이트가 굉음과 함께 열리기 시작한다." } 
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

        <p style="color:var(--room); font-weight:bold; margin-top:15px;">이 봉인을 풀 수 있는 건 오직 외부에서 온 당신뿐.<br>여섯 개의 방을 차례로 해결하고 암호 코드를 수집하라.</p>
        <hr>
        <button class="primary-button" onclick="firstEnter()">아지트 진입 <span>→</span></button>
      </article>
    </section>`;
}

function firstEnter() {
  startTimer();
  hub();
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
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectWater(0)">🔍 <b>수질 정화 유리관</b><br><small style="color:#aaa; font-size:11px;">수호의 수룡 기운이 가라앉은 높은 관</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectWater(1)">🔍 <b>수호의 관리 일지</b><br><small style="color:#aaa; font-size:11px;">붉은 오염을 씻어내기 위한 메모</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('water')">🔒 <b>수문 터치패드</b><br><small style="color:#aaa; font-size:11px;">수로 복구 영문 도어락</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 1: 불의 방 (CHANYEOL)
  if (room === 1) {
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectFire(0)">🔍 <b>방치된 공구 상자</b><br><small style="color:#aaa; font-size:11px;">찬열이 작업할 때 쓰던 녹슨 철제함</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectFire(1)">🔍 <b>식어버린 화로 벽면</b><br><small style="color:#aaa; font-size:11px;">불꽃의 열기가 멈춘 어두운 벽</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('fire')">🔒 <b>불꽃 동력 장치</b><br><small style="color:#aaa; font-size:11px;">화염을 되살릴 알파벳 암호 패드</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 2: 순간이동의 방 (KAI)
  if (room === 2) {
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectTeleport(0)">🔍 <b>미로 구슬 장치</b><br><small style="color:#aaa; font-size:11px;">시공간의 좌표가 뒤틀린 차원의 틀</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectTeleport(1)">🔍 <b>카이의 세계관 기록집</b><br><small style="color:#aaa; font-size:11px;">공간 이동의 흔적이 적힌 서적</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('teleport')">🔒 <b>차원문 제어반</b><br><small style="color:#aaa; font-size:11px;">포탈을 고정할 키워드 입력기. 한글로 작성하여라.</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 3: 바람의 방 (SEHUN)
  if (room === 3) {
    return top + scene(`
      <button class="scene-object" style="left:8%;top:20%" onclick="inspectWind(0)">🔍 <b>작업대 선반</b><br><small style="color:#aaa; font-size:11px;">세훈의 바람 선풍 스패너와 일지</small></button>
      <button class="scene-object" style="right:8%;top:20%" onclick="inspectWind(1)">🔍 <b>밀폐 환풍구</b><br><small style="color:#aaa; font-size:11px;">붉은 안개가 소용돌이치는 해치</small></button>
      <button class="scene-object" style="left:38%;bottom:20%" onclick="openTypeModal('wind')">🔒 <b>풍향 제어 스위치</b><br><small style="color:#aaa; font-size:11px;">기류를 정상화할 영문 키워드 패드</small></button>
    `) + `<p id="status" class="status"></p></div>`;
  }

  // 4: 힘의 방 (D.O.)
  if (room === 4) {
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

// [불의 방] - HERO (8741)
function inspectFire(id) {
  if (id === 0) {
    if (!inventory.includes('torch') && !roomState.torchUsed) {
      getItem('torch');
      showStoryModal('📦 방치된 공구 상자', '<p>구석진 철제 상자 속에서 [플래시 라이트 🔦]를 주웠다.</p>');
    } else status('상자 안은 비어 있다.');
  } else {
    if (selectedItem === 'torch' || roomState.torchUsed) {
      roomState.torchUsed = true;
      showStoryModal('💡 식어버린 화로 벽면 비추기', `
        <div style="background:#1a0505; border:1px solid #ff3b30; padding:20px; text-align:center; font-family:monospace;">
          <p style="color:#aaa; font-size:14px; margin-bottom:10px;">
            222 : TWO<br>
            4973 : FIVE<br>
            3495 : TONE
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
        🌀 카이가 차원을 넘나들던 순간의 잔상이 응축된 구슬 판.<br>
        작은 균열 하나가 수많은 갈림길로 번져 나가고 있다.<br>
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
    if (!inventory.includes('fanKey') && !roomState.windCleared) {
      getItem('fanKey');
      showStoryModal('🔧 작업대 선반', '<p>기름때 묻은 선반 구석에서 [환풍구 스패너 🔧]를 발견했다.</p>');
    } else status('선반엔 더 이상 아무것도 없다.');
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
    if (!inventory.includes('chisel') && !roomState.rockBroken) {
      getItem('chisel');
      showStoryModal('🔨 파쇄 도구 상자', '<p>[강철 정 🔨]을 획득했다!</p>');
    } else status('상자는 비어 있다.');
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
      <p style="text-align:center; font-size:28px; color:#ff6fb5; letter-spacing:8px; margin:15px 0;"><b>N U P P</b></p>
    `);
  } else {
    showStoryModal('🌿 레이의 치유 문양', `
      <div style="line-height:1.8;">
        <p>레이를 상징하는 해독 열쇠말(Key): <b style="color:#ff6fb5;">LAY</b></p>
        <hr style="border-color:#333; margin:10px 0;">
        <p style="color:#d0d4e0; font-size:13px;">
          <b>[비즈네르 복호화 힌트]</b><br>
          암호문(NUPP)의 알파벳 순번에서 열쇠말(LAY)의 알파벳 순번을 순서대로 빼면 치유의 코드가 도출됩니다.<br>
          열쇠말이 부족한 경우 반복하세요.
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
    guideText = "NUPP를 열쇠말 LAY로 복호화한 4자리 단어를 입력하세요.";
    targetAns = "CURE";
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

      <p>에너지 서명 <b>${r.code}</b>가 성공적으로 전송되었습니다.</p>
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
    screen.innerHTML = `
      <section class="view success">
        <div class="success-icon" style="font-size:72px; text-shadow:0 0 40px #fff;">☀</div>
        <p class="eyebrow" style="color:#8fffc3;">ECLIPSE ENDED // MISSION COMPLETE</p>
        <h2 style="font-size:36px; margin:15px 0;">여섯 원석의 빛이 되살아났다!</h2>
        
        <p style="line-height:1.9; max-width:620px; margin:20px auto; color:#e0e4f0; font-size:15px; text-align:center;">
          여섯 개의 원석이 차례로 찬란하게 빛을 발하기 시작했다.<br>
          ( 💧 물 ➔ 🔥 불 ➔ 🛸 순간이동 ➔ 🌀 바람 ➔ ✊ 힘 ➔ 🌿 치유 )<br><br>
          아지트를 집어삼키던 붉은 기운이 걷히며 개기일식의 구름이 지나간다.<br><br>
          <b style="font-size:18px; color:#8fffc3;">"당신 덕분에 EXO의 힘이 완전히 복구되었다—탈출 성공!"</b>
        </p>

        <div style="margin:25px auto; padding:18px; background:rgba(255, 255, 255, 0.05); border:1px solid #8fffc3; border-radius:8px; max-width:500px; text-align:center;">
          <p style="font-size:13px; color:#aaa; margin-bottom:5px;">🌒 Astronomical Archive Information</p>
          <p style="font-size:15px; color:#fff; margin:0;">
            한반도에서 관측 가능한 향후 가장 빠른 개기일식 날짜는<br>
            <strong style="color:#8fffc3; font-size:18px;">2035년 9월 2일 (350902)</strong> 입니다.
          </p>
        </div>

        <button class="primary-button" onclick="restartGame()">처음부터 다시하기 <span>↺</span></button>
      </section>`;
}

restartGame();
