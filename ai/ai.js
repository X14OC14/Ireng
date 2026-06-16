/* =========================================================
   KONFIGURASI ENDPOINT
========================================================= */
const PROXY_URL = "https://my-proxy-sjob.onrender.com/api/search/openai-logic";

/* Catatan: variabel customLogic didefinisikan di file
   custom-logic.js (wajib di-load sebelum file ini). */

/* ========================================================= */

const chatWrap = document.getElementById('chatWrap');
const mainScroll = document.getElementById('mainScroll');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const statusText = document.getElementById('statusText');

// Variabel penampung element welcome state default
const welcomeHTML = `
  <div class="welcome" id="welcomeState">
    <span class="welcome-mark">Sistem Siap</span>
    <h1>Mulai percakapan Anda</h1>
    <p>Ketik pertanyaan pada kolom di bawah untuk berbicara dengan asisten virtual.</p>
  </div>`;

// MEMORI CACHE: Load data history dari localStorage jika ada
let chatHistory = JSON.parse(localStorage.getItem('xiaocia_chat_history')) || [];
let isLoading = false;

function formatTime(dateStr){
  const date = dateStr ? new Date(dateStr) : new Date();
  return date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

function scrollToBottom(){
  mainScroll.scrollTop = mainScroll.scrollHeight;
}

function removeWelcome(){
  const welcomeState = document.getElementById('welcomeState');
  if (welcomeState && welcomeState.parentNode){
    welcomeState.remove();
  }
}

function addMessage(role, text, isError = false, timestamp = null){
  removeWelcome();

  const msg = document.createElement('div');
  msg.className = 'msg ' + role;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'Anda' : 'AI Assistant';

  const bubble = document.createElement('div');
  bubble.className = 'bubble' + (isError ? ' error' : '');
  bubble.textContent = text;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = formatTime(timestamp);

  msg.appendChild(label);
  msg.appendChild(bubble);
  msg.appendChild(time);
  chatWrap.appendChild(msg);

  scrollToBottom();
  return msg;
}

// Ambil history cache lama saat web pertama kali dimuat
function loadCachedChat(){
  if(chatHistory.length > 0){
    removeWelcome();
    chatHistory.forEach(chat => {
      const roleType = chat.role.toLowerCase() === 'user' ? 'user' : 'ai';
      addMessage(roleType, chat.msg, false, chat.time);
    });
  }
}

function showTyping(){
  removeWelcome();

  const msg = document.createElement('div');
  msg.className = 'msg ai';
  msg.id = 'typingIndicator';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'AI Assistant';

  const bubble = document.createElement('div');
  bubble.className = 'bubble typing-bubble';
  bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

  msg.appendChild(label);
  msg.appendChild(bubble);
  chatWrap.appendChild(msg);

  scrollToBottom();
}

function hideTyping(){
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function setLoading(state){
  isLoading = state;
  chatInput.disabled = state;
  sendBtn.disabled = state;
  sendBtn.innerHTML = state
    ? '<span class="spinner"></span>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
  statusText.textContent = state ? 'Memproses...' : 'Online';
}

// Nama creator asli dari proxy (mis. "BetaBotz") akan otomatis
// diganti menjadi nama di bawah ini setiap kali muncul pada balasan AI.
const overrideCreatorName = "Mafy";

// Mengganti sebutan creator asli pada teks balasan AI dengan nama
// di atas, tanpa peduli huruf besar/kecil maupun field "creator".
function applyCreatorOverride(text, data){
  let result = text;
  const originalCreator = (data && typeof data === 'object') ? data.creator : null;

  if (originalCreator && typeof originalCreator === 'string'){
    const pattern = new RegExp(originalCreator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(pattern, overrideCreatorName);
  }

  return result;
}

// Mencoba mengambil teks balasan dari berbagai kemungkinan struktur
// respons proxy dan membersihkan kebocoran label "AI:"
function extractReplyText(data){
  if (typeof data === 'string') return cleanAiPrefix(data);
  if (!data || typeof data !== 'object') return JSON.stringify(data);

  const candidates = [
    data.result, data.response, data.message, data.text,
    data.answer, data.reply, data.output,
    data?.data?.result, data?.data?.message, data?.data?.text
  ];

  for (const c of candidates){
    if (typeof c === 'string' && c.trim().length > 0) {
      // Bersihkan nama kreator dan hapus prefix "AI:" jika bocor
      let clearedText = applyCreatorOverride(c, data);
      return cleanAiPrefix(clearedText);
    }
  }

  return JSON.stringify(data);
}

// Menghapus teks "AI:" atau "AI Assistant:" di awal kalimat
function cleanAiPrefix(text) {
  if (!text) return text;
  // Regex ini akan mendeteksi "AI:", "AI :", "AI Assistant:", dll di awal teks secara case-insensitive
  return text.replace(/^(ai\s*assistants*:|ai\s*:)\s*/i, '');
}

async function sendMessage(){
  const text = chatInput.value.trim();
  if (!text || isLoading) return;

  addMessage('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  setLoading(true);
  showTyping();

  // PROMPT HISTORY STACKING: Gabungkan semua riwayat pesan lama agar AI ingat
  let formattedPrompt = "";
  chatHistory.forEach(chat => {
      formattedPrompt += `${chat.role}: ${chat.msg}\n`;
  });
  formattedPrompt += `User: ${text}`;

  try{
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: formattedPrompt,
        logic: customLogic
      })
    });

    if (!res.ok){
      throw new Error('Server merespons dengan status ' + res.status);
    }

    const data = await res.json();
    const replyText = extractReplyText(data);

    hideTyping();
    addMessage('ai', replyText);

    // SIMPAN KE REKORD MEMORI CACHE
    const now = new Date().toISOString();
    chatHistory.push({ role: "User", msg: text, time: now });
    chatHistory.push({ role: "AI", msg: replyText, time: now });

    // Batasi memori array biar gak kepenuhan (Maksimal 20 pesan terakhir)
    if (chatHistory.length > 20) {
        chatHistory.splice(0, 2);
    }

    // Sinkronisasikan ke LocalStorage browser
    localStorage.setItem('xiaocia_chat_history', JSON.stringify(chatHistory));

  } catch (err){
    hideTyping();
    addMessage('ai', 'Maaf, terjadi kendala saat menghubungi server. Silakan coba lagi. (' + err.message + ')', true);
  } finally {
    setLoading(false);
    chatInput.focus();
  }
}

// FUNGSI CLEAR HISTORY (HAPUS TOTAL)
clearBtn.addEventListener('click', () => {
  if (chatHistory.length === 0) return;

  const yakin = confirm("Apakah Anda yakin ingin menghapus seluruh riwayat percakapan?");
  if (yakin) {
    chatHistory = [];
    localStorage.removeItem('xiaocia_chat_history');
    chatWrap.innerHTML = welcomeHTML;
    chatInput.focus();
  }
});

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
});

// Eksekusi pemuatan cache saat halaman siap
loadCachedChat();
chatInput.focus();
