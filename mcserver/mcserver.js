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
      if (data.motd?.clean) {
        motd.textContent = data.motd.clean;
      } else {
        motd.textContent = '';
      }
    } else {
      dot.className = 'dot offline';
      label.textContent = 'offline';
      online.textContent = '0';
      max.textContent    = '—';
      motd.textContent = ''; // Bersihkan teks MOTD jika server offline
    }
    online.classList.remove('loading');
    max.classList.remove('loading');
  } catch {
    document.getElementById('statusLabel').textContent = 'unavailable';
    document.getElementById('motd').textContent = '';
    ['online','max'].forEach(id => {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('loading');
    });
  }
}
fetchStatus();
setInterval(fetchStatus, 60000);

// Audio Management
const audio = document.getElementById('bgAudio');
const musicBtn = document.getElementById('musicBtn');
let playing = false;
let started = false;
let fadeInterval = null;

function fadeAudio(el, to, duration, onDone) {
  if (fadeInterval) clearInterval(fadeInterval);

  if (to > 0 && el.paused) {
    el.play().catch(err => console.log("Autoplay blocked:", err));
  }

  const steps = 40;
  const iv = duration / steps;
  const step = (to - el.volume) / steps;

  fadeInterval = setInterval(() => {
    let newVolume = el.volume + step;
    
    if ((step > 0 && newVolume >= to) || (step < 0 && newVolume <= to)) {
      el.volume = Math.max(0, Math.min(1, to));
      clearInterval(fadeInterval);
      if (onDone) onDone();
    } else {
      el.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, iv);
}

function startMusic() {
  if (started) return;
  started = true;
  playing = true;
  
  audio.volume = 0;
  fadeAudio(audio, 0.3, 2000);
  setMusicIcon(true);
  
  // Achievement muncul cuma sekali seumur hidup (berdasarkan localStorage)
  if (localStorage.getItem('ach_music_found') !== 'true') {
    showAchievement();
    localStorage.setItem('ach_music_found', 'true');
  }
  
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

// Music navbar button toggle
musicBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Mencegah bentrok dengan listener di body/document
  
  if (!started) {
    startMusic();
    removeGestureListeners();
  } else if (playing) {
    playing = false;
    setMusicIcon(false);
    localStorage.setItem('audioEnabled', 'false');
    fadeAudio(audio, 0, 1000, () => audio.pause());
  } else {
    playing = true;
    setMusicIcon(true);
    localStorage.setItem('audioEnabled', 'true');
    fadeAudio(audio, 0.3, 2000);
  }
});

// Auto-start on any global gesture
function onGesture() {
  startMusic();
  removeGestureListeners();
}

function removeGestureListeners() {
  ['touchstart','click','keydown','scroll'].forEach(e =>
    document.removeEventListener(e, onGesture)
  );
}

// Pasang listener di awal secara mutlak tanpa syarat localStorage
['touchstart','click','keydown','scroll'].forEach(e =>
  document.addEventListener(e, onGesture, { once: true })
);
