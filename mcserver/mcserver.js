// Menu
let menuOpen = false;
function toggleMenu() {
  menuOpen = !menuOpen;
  document.getElementById('menuDrawer').classList.toggle('open', menuOpen);
  document.getElementById('menuOverlay').classList.toggle('open', menuOpen);
  document.getElementById('burgerBtn').classList.toggle('menu-open', menuOpen);
  document.querySelector('nav').classList.toggle('menu-open', menuOpen);
}

// MC Status
async function fetchStatus() {
  try {
    const res = await fetch('https://api.mcstatus.io/v2/status/bedrock/demo.mcstatus.io:19132');
    const data = await res.json();
    const dot    = document.getElementById('dot');
    const label  = document.getElementById('statusLabel');
    const online = document.getElementById('online');
    const max    = document.getElementById('max');
    const motd   = document.getElementById('motd');
    if (data.online) {
      dot.className = 'dot online';
      label.textContent = 'online';
      online.textContent = data.players.online;
      max.textContent    = data.players.max;
    } else {
      dot.className = 'dot offline';
      label.textContent = 'offline';
      online.textContent = '0';
      max.textContent    = '—';
    }
    online.classList.remove('loading');
    max.classList.remove('loading');
    if (data.motd?.clean) motd.textContent = data.motd.clean;
  } catch {
    document.getElementById('statusLabel').textContent = 'unavailable';
    ['online','max'].forEach(id => {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('loading');
    });
  }
}
fetchStatus();
setInterval(fetchStatus, 60000);

// Audio
const audio = document.getElementById('bgAudio');
const musicBtn = document.getElementById('musicBtn');
let playing = false;
let started = false;

function fadeAudio(el, from, to, duration, onDone) {
  el.volume = from;
  if (!el.paused === false && to > 0) el.play().catch(() => {});
  const steps = 40;
  const iv = duration / steps;
  const step = (to - from) / steps;
  let cur = from;
  const t = setInterval(() => {
    cur += step;
    if ((step > 0 && cur >= to) || (step < 0 && cur <= to)) {
      el.volume = Math.max(0, Math.min(1, to));
      clearInterval(t);
      if (onDone) onDone();
    } else {
      el.volume = Math.max(0, Math.min(1, cur));
    }
  }, iv);
}

function startMusic() {
  if (started) return;
  started = true;
  playing = true;
  audio.volume = 0;
  audio.play().catch(() => {});
  fadeAudio(audio, 0, 0.3, 2000);
  setMusicIcon(true);
  showAchievement();
  localStorage.setItem('audioEnabled', 'true');
}

function setMusicIcon(isPlaying) {
  musicBtn.classList.toggle('playing', isPlaying);
}

// Achievement toast
let achTimer = null;

function showAchievement() {
  const el = document.getElementById('achievement');
  el.classList.remove('dismissed');
  el.classList.add('show');
  el.style.transform = '';

  if (achTimer) clearTimeout(achTimer);
  achTimer = setTimeout(() => dismissAchievement(), 8000);

  // Swipe right to dismiss
  let startX = null;
  function onTouchStart(e) { startX = e.touches[0].clientX; }
  function onTouchMove(e) {
    if (startX === null) return;
    const dx = e.touches[0].clientX - startX;
    if (dx > 0) el.style.transform = 'translateX(' + dx + 'px)';
  }
  function onTouchEnd(e) {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 60) {
      clearTimeout(achTimer);
      dismissAchievement();
    } else {
      el.style.transform = '';
    }
    startX = null;
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  }
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd);
}

function dismissAchievement() {
  const el = document.getElementById('achievement');
  el.style.transform = '';
  el.classList.add('dismissed');
  setTimeout(() => el.classList.remove('show', 'dismissed'), 350);
}

// Music button toggle
musicBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!started) {
    startMusic();
    removeGestureListeners();
  } else if (playing) {
    fadeAudio(audio, audio.volume, 0, 1000, () => audio.pause());
    playing = false;
    setMusicIcon(false);
    localStorage.setItem('audioEnabled', 'false');
  } else {
    audio.play().catch(() => {});
    fadeAudio(audio, 0, 0.3, 2000);
    playing = true;
    setMusicIcon(true);
    localStorage.setItem('audioEnabled', 'true');
  }
});

// Auto-start on any gesture
function onGesture() {
  startMusic();
  removeGestureListeners();
}

function removeGestureListeners() {
  ['touchstart','click','keydown','scroll'].forEach(e =>
    document.removeEventListener(e, onGesture)
  );
}

// Only auto-start if user previously enabled
if (localStorage.getItem('audioEnabled') === 'true') {
  ['touchstart','click','keydown','scroll'].forEach(e =>
    document.addEventListener(e, onGesture, { once: true })
  );
}
