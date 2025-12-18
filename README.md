# MCP Chatbot (Node.js + Express + Web UI)

A minimal demo web-based chatbot that connects to an MCP WebSocket upstream (wss://api.xiaozhi.me/mcp/) using a token and proxies messages between browser clients and the MCP server. This scaffold includes Redis persistence (optional) or an in-memory fallback.

## Features
- Browser UI (HTML/JS)
- Express server + Socket.io for browser<->server
- MCP WebSocket client with reconnection and heartbeat
- Conversation persistence in Redis or in-memory fallback

## Quick start
1. Copy `.env.example` to `.env` and set `MCP_TOKEN` (DO NOT commit your real token)

2. Install dependencies

   npm install

3. (Optional) Start Redis or set `REDIS_URL` in `.env`

4. Start the server

   npm start

5. Open http://localhost:3000 in a browser and chat!

## Notes
- The exact MCP message schema was not available from public docs; the client sends/receives JSON bodies and forwards them to/from the browser. Adapt `server/mcpClient.js` and `server/index.js` to match the actual MCP message format if needed.
- For production, protect the token and consider an authentication layer so users do not see the token.

## Next steps (optional)
- Add TTS, file upload, typing indicators, and message streaming
- Add automated tests and CI
- Add Dockerfile / deployment manifests

## Deploy frontend to GitHub Pages
You can host the static frontend (`public/` folder) on GitHub Pages. The repo includes a GitHub Actions workflow at `.github/workflows/gh-pages.yml` which publishes `./public` to the `gh-pages` branch on every push to `main`.

Steps:
1. Push this repository to GitHub (ensure your default branch is `main`).
2. (Optional) In your repository Settings → Pages, confirm the site is served from the `gh-pages` branch (the action will create it automatically).
3. Visit `https://<your-username>.github.io/<repo-name>/` to access the frontend.

Note: The server (backend proxy that holds `MCP_TOKEN`) cannot run on GitHub Pages — deploy it to Railway, Render, Fly, Heroku or similar and set the `MCP_TOKEN` environment variable there. Ensure the frontend is configured to point to your deployed server's URL (or use a relative path if hosting frontend and backend from the same origin).

