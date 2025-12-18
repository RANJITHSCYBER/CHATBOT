class Persistence {
  constructor(redisClient) {
    this.redis = redisClient;
    this.mem = new Map(); // for fallback
  }

  async appendMessage(sessionId, message) {
    if (this.redis) {
      await this.redis.rpush(`session:${sessionId}:messages`, JSON.stringify(message));
    } else {
      if (!this.mem.has(sessionId)) this.mem.set(sessionId, []);
      this.mem.get(sessionId).push(message);
    }
  }

  async getMessages(sessionId, limit = 50) {
    if (this.redis) {
      const start = -limit;
      const end = -1;
      const items = await this.redis.lrange(`session:${sessionId}:messages`, start, end);
      return items.map(i => {
        try { return JSON.parse(i); } catch (e) { return { raw: i }; }
      });
    } else {
      const arr = this.mem.get(sessionId) || [];
      return arr.slice(-limit);
    }
  }
}

module.exports = Persistence;
