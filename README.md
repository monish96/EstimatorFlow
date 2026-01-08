# EstimateFlow

A modern, professional real-time agile estimation tool with beautiful animations and seamless collaboration. Hosts can share session links for unlimited participants, and all story/estimate history is automatically saved to each user's **localStorage**.

![EstimateFlow Dashboard](https://via.placeholder.com/1200x600/6366f1/ffffff?text=EstimateFlow+Dashboard)
*Modern, clean interface with smooth animations*

## 🌐 Try It Live

**Live Demo**: [https://estimateflow.onrender.com](https://estimateflow.onrender.com)

Try EstimateFlow right now! Create a session, share the link with your team, and start estimating stories together in real-time.

## ✨ Features

- **Real-time Collaboration** - Instant synchronization across all participants
- **Unlimited Participants** - Share a link and anyone can join
- **Story Management** - Add stories with titles and optional notes
- **Flexible Voting** - Classic estimation cards (1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕)
- **Host Controls** - Reveal votes, reset rounds, set current story, finalize estimates
- **Observer Mode** - Join as observer without voting
- **Dark/Light Theme** - Beautiful themes with smooth transitions
- **Screen Share Mode** - Hide your vote while presenting
- **Local Persistence** - User profile and story history saved in localStorage
- **Keyboard Shortcuts** - Quick access to common actions (D/O/S/H keys)

## 🚀 Quick Start

### Development

From repo root:

```bash
npm install
npm run dev
```

- **Web**: `http://localhost:5173` (Vite may auto-pick another port if busy)
- **Server**: `http://localhost:5050`

The web app automatically proxies Socket.io connections to the server, so no CORS issues.

### Build

```bash
npm run build
```

This builds both the server (TypeScript) and web app (Vite).

## 📸 Screenshots

### Landing Page
![Landing Page](https://via.placeholder.com/1200x800/667eea/ffffff?text=EstimateFlow+Landing+Page)
*Clean, modern landing page with create/join options*

### Session Room
![Session Room](https://via.placeholder.com/1200x800/764ba2/ffffff?text=EstimateFlow+Session+Room)
*Real-time session with participants, stories, and voting interface*

### Voting Interface
![Voting Cards](https://via.placeholder.com/1200x600/4facfe/ffffff?text=EstimateFlow+Voting+Cards)
*Beautiful animated voting cards with smooth interactions*

### Settings Panel
![Settings](https://via.placeholder.com/600x400/8b5cf6/ffffff?text=EstimateFlow+Settings)
*Modern settings panel with observer mode, dark mode, and screen share options*

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.io
- **Styling**: Modern CSS with CSS variables, glassmorphism, and smooth animations
- **State Management**: React hooks + Socket.io real-time updates
- **Persistence**: Browser localStorage

## 📦 Project Structure

```
planningpoker/
├── apps/
│   ├── web/          # React frontend
│   │   ├── src/
│   │   │   ├── routes/      # Landing, SessionRoom
│   │   │   ├── components/   # SettingsMenu, Toasts
│   │   │   └── lib/          # Socket, storage, utilities
│   │   └── package.json
│   └── server/       # Socket.io backend
│       ├── src/
│       │   └── index.ts      # Session management, voting logic
│       └── package.json
├── package.json      # Workspace root
└── README.md
```

## 🚢 Deployment

**Live Deployment**: EstimateFlow is currently deployed and running at [https://estimateflow.onrender.com](https://estimateflow.onrender.com)

### Render (Recommended) ✅

Deploy both server and web app to Render using the included `render.yaml`:

1. **Push to GitHub** (if not already done)
2. **Go to Render Dashboard** → "New +" → "Blueprint"
3. **Connect your repository** - Render will auto-detect `render.yaml`
4. **Apply the blueprint** - This creates both services:
   - `estimateflow-server` (Web Service for Socket.io)
   - `estimateflow` (Static Site for React app)
5. **Update CORS**: After deployment, set `CLIENT_ORIGIN` in server to your static site URL

See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for detailed step-by-step instructions.

### Alternative: Vercel + Render

**Web (Vercel):**
- Deploy the React app (`apps/web`) to Vercel as a static site
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: Set `VITE_SERVER_URL` to your Render server URL

**Server (Render):**
- Deploy `apps/server` as a Web Service on Render
- See `RENDER_DEPLOY.md` for server deployment steps

### Other Platforms

Socket.io requires a long-lived process with WebSocket support. **Vercel serverless functions are not suitable for the server**.

**Recommended platforms for server:**
- [Render](https://render.com) - Simple setup (✅ included config)
- [Fly.io](https://fly.io) - Great for WebSocket apps
- [Railway](https://railway.app) - Easy deployment
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

## 🎨 Theme

EstimateFlow features a modern, professional design with:

- **Color Palette**: Indigo and purple gradients with soft backgrounds
- **Animations**: Smooth, subtle transitions using Framer Motion
- **Typography**: Clean system fonts with excellent readability
- **Glassmorphism**: Refined glass effects with backdrop blur
- **Dark/Light Modes**: Beautiful themes for any preference

## 🔧 Configuration

### Environment Variables

**Web (`apps/web`):**
- `VITE_SERVER_URL` - Socket.io server URL (defaults to `http://localhost:5050` in dev)

**Server (`apps/server`):**
- `PORT` - Server port (defaults to `5050`)
- `CLIENT_ORIGIN` - CORS origin (defaults to `http://localhost:5173`)

## 📝 License

MIT

---

Built with ❤️ for agile teams who value beautiful, functional tools.
