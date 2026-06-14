// Fungsi pembuka/penutup Menu Drawer
function toggleMenu() {
  const drawer = document.getElementById('menuDrawer');
  const overlay = document.getElementById('menuOverlay');
  const burgerBtn = document.getElementById('burgerBtn');
  const nav = document.querySelector('nav');

  drawer.classList.toggle('open');
  overlay.classList.toggle('open');
  burgerBtn.classList.toggle('menu-open');
  nav.classList.toggle('menu-open');
}

// Logika Utama (Dijalankan SELEPAS DOM Siap Sepenuhnya)
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('bgAudio');
  const musicBtn = document.getElementById('musicBtn');
  const achievement = document.getElementById('achievement');
  const cookieBtn = document.getElementById('clearCookiesBtn');

  // ==========================================
  // 1. KONTROL AUDIO & ACHIEVEMENT TOAST
  // ==========================================
  musicBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        musicBtn.classList.add('playing');
        
        // Cek status kuki real-time detik itu juga
        const liveCheckAchieved = document.cookie.split('; ').find(row => row.startsWith('ach_music_found='));
        
        if (!liveCheckAchieved) {
          setTimeout(() => {
            achievement.classList.add('show');
            
            // Pasang kuki masa aktif 7 hari
            const d = new Date();
            d.setTime(d.getTime() + (7*24*60*60*1000));
            document.cookie = "ach_music_found=true; expires=" + d.toUTCString() + "; path=/; SameSite=Strict";
            
            // PERBAIKAN: Diperlama jadi 7 detik (7000ms) biar bisa dibaca santai
            setTimeout(() => {
              if (!achievement.classList.contains('dismissed')) {
                achievement.classList.remove('show');
              }
            }, 7000);
          }, 800);
        }
      }).catch(err => console.log("Audio play blocked:", err));
    } else {
      audio.pause();
      musicBtn.classList.remove('playing');
    }
  });

  // Fitur geser kanan (swipe to dismiss) toast achievement di mobile
  let startX = 0;
  achievement.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
  achievement.addEventListener('touchmove', (e) => {
    let moveX = e.touches[0].clientX - startX;
    if (moveX > 30) { 
      achievement.classList.add('dismissed');
      setTimeout(() => {
        achievement.classList.remove('show');
        achievement.classList.remove('dismissed');
      }, 300);
    }
  }, {passive: true});

  // ==========================================
  // 2. FETCH DATA STATUS MINECRAFT SERVER
  // ==========================================
  function updateServerStatus() {
    fetch('https://api.mcstatus.io/v2/status/bedrock/demo.mcstatus.io:19132')
      .then(res => res.json())
      .then(data => {
        const dot = document.getElementById('dot');
        const label = document.getElementById('statusLabel');
        const onlineVal = document.getElementById('online');
        const maxVal = document.getElementById('max');
        const motdVal = document.getElementById('motd');

        // Lepas class animasi berkedip loading
        onlineVal.classList.remove('loading');
        maxVal.classList.remove('loading');

        if (data.online) {
          dot.className = 'dot online';
          label.textContent = 'Online';
          onlineVal.textContent = data.players?.online ?? '0';
          maxVal.textContent = data.players?.max ?? '0';
          
          // PERBAIKAN: Memakai Optional Chaining (?.) biar anti-crash kalau motd null
          motdVal.textContent = data.motd?.clean || 'Welcome to the server!';
        } else {
          dot.className = 'dot offline';
          label.textContent = 'Offline';
          onlineVal.textContent = '0';
          maxVal.textContent = '0';
          motdVal.textContent = 'Server is currently down.';
        }
      })
      .catch(() => {
        document.getElementById('statusLabel').textContent = 'Error';
        document.getElementById('online').textContent = '0';
        document.getElementById('max').textContent = '0';
        document.getElementById('motd').textContent = 'Failed to load status.';
      });
  }

  // Pemicu pertama kali pas halaman dibuka
  updateServerStatus();

  // PERBAIKAN: Auto-refresh status server setiap 30 detik secara realtime
  setInterval(updateServerStatus, 30000);

  // ==========================================
  // 3. LOGIKA RESET COOKIES (Pindah ke dalam DOM)
  // ==========================================
  if (cookieBtn) {
    cookieBtn.addEventListener('click', () => {
      document.cookie = "ach_music_found=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
      
      cookieBtn.textContent = "Cookies Cleared!";
      cookieBtn.style.color = "var(--dot-online)";
      cookieBtn.style.borderColor = "var(--dot-online)";
      
      setTimeout(() => {
        location.reload();
      }, 600);
    });
  }
});
