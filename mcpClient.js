const WebSocket = require('ws');
const EventEmitter = require('events');

class MCPClient extends EventEmitter {
  constructor({ token, sessionId, url }) {
    super();
    this.token = token;
    this.sessionId = sessionId;
    this.baseUrl = url || process.env.MCP_WS_URL || 'wss://api.xiaozhi.me/mcp/';
    this.backoff = 1000;
    this._connect();
    this.pingInterval = null;
  }

  _connect() {
    const wsUrl = `${this.baseUrl}?token=${encodeURIComponent(this.token)}&session_id=${encodeURIComponent(this.sessionId)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.emit('open');
      this.backoff = 1000; // reset backoff
      this._startPing();
    });

    this.ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch (e) { msg = data.toString(); }
      this.emit('message', msg);
    });

    this.ws.on('close', (code, reason) => {
      this.emit('close', { code, reason });
      this._stopPing();
      setTimeout(() => this._reconnect(), this.backoff);
      this.backoff = Math.min(this.backoff * 1.5, 30000);
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
      // ensure close triggers reconnect
      try { this.ws.close(); } catch (e) { /* ignore */ }
    });
  }

  _reconnect() {
    this._connect();
  }

  _startPing() {
    if (this.pingInterval) return;
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.ping(); } catch (e) { /* ignore */ }
      }
    }, 30000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(obj) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new Error('MCP connection not open'));
      const payload = typeof obj === 'string' ? obj : JSON.stringify(obj);
      this.ws.send(payload, (err) => err ? reject(err) : resolve());
    });
  }

  close() {
    if (this.ws) try { this.ws.close(); } catch (e) {}
    this._stopPing();
  }
}

module.exports = MCPClient;
