/* ============================================================
   SABIX — estado global, roteador de telas e tela inicial.
   ============================================================ */

// Ao abrir o app, sorteia um cartão (evitando repetir o último sorteado),
// para que cada partida não comece sempre com as mesmas perguntas.
function pickStartDeck() {
  const ids = DECKS.map((d) => d.id);
  let last = null;
  try { last = localStorage.getItem('sabix-last-start-deck'); } catch (e) {}
  const pool = ids.length > 1 ? ids.filter((id) => id !== last) : ids;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem('sabix-last-start-deck', pick); } catch (e) {}
  return pick;
}

const App = {
  screen: 'home', // home | solo | multi-lobby | multi-room
  deckId: pickStartDeck(),
  playerName: localStorage.getItem('verbixse-name') || ''
};

const root = document.getElementById('app');

function totalFor(deckId) { return questionsForDeck(deckId).length; }

function render() {
  if (App.screen === 'home') return renderHome();
  if (App.screen === 'solo') return renderSolo();
  if (App.screen === 'multi-lobby') return renderMultiLobby();
  if (App.screen === 'multi-room') return renderMultiRoom();
}

function setScreen(screen) { App.screen = screen; render(); }

function deckLabel(deckId) { return deckId === 'ALL' ? 'Todos' : deckId; }

// Texto curto para os botões de jogar: "Cartão 014" ou "Todas".
function deckButtonLabel(deckId) { return deckId === 'ALL' ? 'Todas' : 'Cartão ' + deckId.replace('C', ''); }

function nextDeckId(currentId) {
  const order = DECKS.map((d) => d.id);
  if (currentId === 'ALL') return order[0];
  const idx = order.indexOf(currentId);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

function renderDeckSeals(onSelect) {
  // "Todos" fica por último, depois de todos os cartões.
  const items = [...DECKS, { id: 'ALL', count: QUESTIONS.length }];
  return `<div class="deck-row" role="tablist" aria-label="Selecionar cartão">
    ${items.map((d) => `
      <button class="seal ${App.deckId === d.id ? 'active' : ''}" role="tab" aria-selected="${App.deckId === d.id}" data-deck="${d.id}">
        <span class="seal-mark">${d.id === 'ALL' ? '●' : d.id.replace('C', '')}</span>
        <span class="seal-label">${d.id === 'ALL' ? 'Todos' : d.id}</span>
      </button>`).join('')}
  </div>`;
}

function wireDeckSeals(onSelect) {
  root.querySelectorAll('[data-deck]').forEach((btn) => {
    btn.addEventListener('click', () => {
      App.deckId = btn.dataset.deck;
      Sound.click();
      onSelect();
    });
  });
  scrollActiveSealIntoView();
}

// Rola a fileira de cartões (só na horizontal) até o cartão selecionado,
// para o jogador ver qual cartão está ativo e que existem outros.
function scrollActiveSealIntoView() {
  const row = root.querySelector('.deck-row');
  const active = row && row.querySelector('.seal.active');
  if (!row || !active) return;
  const target = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
  row.scrollLeft = Math.max(0, target);
}

// ---------- Instalar o app (iPhone e navegadores que permitem) ----------
const Install = {
  prompt: null, // evento beforeinstallprompt (Android/Chrome/Edge no navegador)
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.startsWith('android-app://');
  },
  isIOS() {
    const ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  },
  available() {
    if (this.isStandalone()) return null;
    if (this.isIOS()) return 'ios';
    if (this.prompt) return 'prompt';
    return null;
  }
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  Install.prompt = e;
  if (App.screen === 'home') render();
});
window.addEventListener('appinstalled', () => {
  Install.prompt = null;
  if (App.screen === 'home') render();
});

function installButtonHTML() {
  const mode = Install.available();
  if (!mode) return '';
  const label = mode === 'ios' ? '📲 Instalar no iPhone' : '📲 Instalar o app';
  return `<button class="btn btn-ghost" id="install-app">${label}</button>`;
}

function wireInstallButton() {
  const btn = document.getElementById('install-app');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    Sound.click();
    if (Install.available() === 'prompt') {
      Install.prompt.prompt();
      try { await Install.prompt.userChoice; } catch (e) {}
      Install.prompt = null;
      render();
    } else {
      showIOSInstallHelp();
    }
  });
}

function showIOSInstallHelp() {
  const ua = navigator.userAgent || '';
  const notSafari = /CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|WhatsApp/i.test(ua);
  const box = document.createElement('div');
  box.className = 'modal-backdrop';
  box.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Instalar no iPhone" style="text-align:left">
      <div class="crown" style="text-align:center">📲</div>
      <h2 style="text-align:center">Instalar no iPhone</h2>
      ${notSafari ? `<p style="font-size:13.5px;color:var(--gold-bright);margin:0 0 12px">Se não encontrar a opção abaixo, abra este link no <b>Safari</b> e siga os passos.</p>` : ''}
      <ol style="margin:0 0 18px;padding-left:20px;line-height:1.6;font-size:15px;color:var(--parchment)">
        <li>Toque nos <b>três pontinhos (•••)</b> na parte de baixo da tela.</li>
        <li>Toque em <b>Compartilhar</b> <span aria-hidden="true">(o quadrado com a seta para cima ⬆️)</span>.</li>
        <li>Role as opções e toque em <b>Adicionar à Tela de Início</b>.</li>
        <li>Toque em <b>Adicionar</b>. O ícone do Sabix aparece junto com seus outros apps.</li>
      </ol>
      <p style="font-size:12.5px;color:var(--muted);margin:-8px 0 16px">Em alguns iPhones, o botão Compartilhar ⬆️ já aparece direto na barra, sem os três pontinhos.</p>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" id="ios-install-ok">Entendi</button>
      </div>
    </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector('#ios-install-ok').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
}

function renderHeader(activeMode) {
  return `<header class="header">
    <div class="brand">
      <img class="brand-seal" src="icon-192.png" alt="Sabix: Quiz Bíblico" />
      <div>
        <div class="brand-name">SABIX <b>QUIZ BÍBLICO</b></div>
        <div class="brand-tag">Zeuvastec Technology</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="icon-btn" id="sound-toggle" aria-label="Alternar som" title="Som">${Sound.isOn() ? '🔊' : '🔇'}</button>
      <div class="mode-toggle">
        <button data-mode="solo" class="${activeMode === 'solo' ? 'active' : ''}">Solo</button>
        <button data-mode="multi" class="${activeMode === 'multi' ? 'active' : ''}">Multi</button>
      </div>
    </div>
  </header>`;
}

function wireHeader() {
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', () => { Sound.toggle(); render(); });
  root.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === 'solo') setScreen('home');
      else setScreen('multi-lobby');
    });
  });
}

function renderHome() {
  const count = totalFor(App.deckId);
  root.innerHTML = `
    <div class="app">
      ${renderHeader('solo')}
      <section class="hero">
        <div class="hero-badge">📜 <b>${QUESTIONS.length}</b> perguntas · ${DECKS.length} cartões (${DECKS[0].id} a ${DECKS[DECKS.length - 1].id}) · sem repetir conteúdo original</div>
        <h1 style="font-size:32px; line-height:1.1; letter-spacing:-0.02em;">Sabix: Quiz Bíblico <br><span style="font-size:0.55em; font-weight:400; opacity:0.85; letter-spacing:0.08em;">Zeuvastec Technology</span></h1>
        <p>Responda sozinho no seu ritmo, ou desafie amigos em tempo real. Escolha um cartão abaixo, ou toque em “Todos” no fim da fila para jogar com todas as perguntas.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" id="start-solo">▶ Jogar Solo · ${deckButtonLabel(App.deckId)} · ${count}Q</button>
          <button class="btn btn-secondary" id="start-multi">👥 Multiplayer · ${deckButtonLabel(App.deckId)} · ${count}Q</button>
          ${installButtonHTML()}
        </div>
      </section>

      <div class="decks">
        <div class="decks-label">Filtrar cartão</div>
        ${renderDeckSeals()}
      </div>

      <div class="features">
        <div class="feature"><h3>Solo</h3><p>Progresso ao vivo, som de acerto e erro, e resumo da pontuação ao final.</p></div>
        <div class="feature"><h3>Multiplayer</h3><p>Crie uma sala e jogue com amigos em tempo real, com placar ao vivo.</p></div>
        <div class="feature"><h3>Efeitos</h3><p>Animações de acerto/erro e confete ao concluir um cartão.</p></div>
      </div>

      <p class="footer-note">Sabix: Quiz Bíblico · Zeuvastec Technology · ${QUESTIONS.length} perguntas · ${DECKS.length} cartões · conteúdo original preservado</p>
    </div>
  `;
  wireHeader();
  wireDeckSeals(renderHome);
  wireInstallButton();
  document.getElementById('start-solo').addEventListener('click', () => startSolo());
  document.getElementById('start-multi').addEventListener('click', () => setScreen('multi-lobby'));
}

document.addEventListener('DOMContentLoaded', () => { render(); });
