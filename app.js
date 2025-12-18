(function () {
  const socket = io({ query: {} });
  let sessionId = null;

  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const composer = document.getElementById('composer');

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'message ' + role;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  socket.on('connect', () => {
    console.log('connected to server');
  });

  socket.on('session', (data) => {
    sessionId = data.sessionId;
    console.log('session', sessionId);
  });

  socket.on('history', (items) => {
    items.forEach(it => addMessage(it.role || 'bot', typeof it.message === 'string' ? it.message : JSON.stringify(it.message)));
  });

  socket.on('bot_message', (msg) => {
    const text = typeof msg === 'string' ? msg : (msg.text || JSON.stringify(msg));
    addMessage('bot', text);
  });

  composer.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage('user', text);
    socket.emit('user_message', { text });
    inputEl.value = '';
  });
})();
