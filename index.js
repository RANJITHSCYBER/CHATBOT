const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const MCPClient = require('./mcpClient');
const Persistence = require('./persistence');

dotenv.config();

const PORT = process.env.PORT || 3000;
const MCP_TOKEN = process.env.MCP_TOKEN;
if (!MCP_TOKEN) {
  console.error('Missing MCP_TOKEN. Create a .env file based on .env.example and set MCP_TOKEN');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
// Allow CORS for Socket.io so the frontend hosted on GitHub Pages can connect to this backend
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// health endpoint for uptime checks
app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// Setup Redis if provided, else fallback to in-memory
let redis = null;
if (process.env.REDIS_URL) redis = new Redis(process.env.REDIS_URL);
const persistence = new Persistence(redis);

// Map sessionId -> mcp client instance
const mcpClients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  const sessionId = socket.handshake.query.sessionId || uuidv4();
  socket.emit('session', { sessionId });

  // lazy-construct MCP client for the session
  function ensureMcp() {
    if (mcpClients.has(sessionId)) return mcpClients.get(sessionId);
    const mcp = new MCPClient({ token: MCP_TOKEN, sessionId });

    mcp.on('open', () => {
      console.log('MCP connection open for', sessionId);
      try { socket.emit('mcp_status', { status: 'open' }); } catch (e) {}
      // send queued messages or notify UI
    });

    mcp.on('message', async (msg) => {
      // forward to client
      try { socket.emit('bot_message', msg); } catch (e) { /* ignore */ }
      await persistence.appendMessage(sessionId, { role: 'bot', message: msg, ts: Date.now() });
    });

    mcp.on('close', (info) => {
      console.log('MCP closed for', sessionId, info);
      try { socket.emit('mcp_status', { status: 'closed', info }); } catch (e) {}
    });

    mcp.on('error', (err) => {
      console.error('MCP error for', sessionId, err.message);
      try { socket.emit('mcp_status', { status: 'error', message: err.message || String(err) }); } catch (e) {}
    });

    mcpClients.set(sessionId, mcp);
    return mcp;
  }

  // send conversation history on connect
  (async () => {
    const history = await persistence.getMessages(sessionId);
    socket.emit('history', history);
  })();

  socket.on('user_message', async (payload) => {
    const { text } = payload || {};
    if (!text || !text.trim()) return;
    await persistence.appendMessage(sessionId, { role: 'user', message: text, ts: Date.now() });

    const mcp = ensureMcp();
    // send according to MCP schema - we'll send a simple object; adapt if needed
    try {
      await mcp.send({ type: 'user_message', text });
    } catch (err) {
      console.error('Failed to send to MCP:', err.message);
      socket.emit('error', { message: 'Failed to send to upstream: ' + err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    // We do not immediately destroy MCP client so reconnection or another browser tab can reuse session
  });
});

server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
