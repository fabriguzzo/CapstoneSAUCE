# CapstoneSAUCE - Sports Statistics Tracking Application

A real-time sports statistics tracking application built with the MERN stack (MongoDB, Express.js, React, Node.js) and TypeScript.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, ReCharts
- **Backend:** Node.js, Express.js, TypeScript, Socket.IO
- **Database:** MongoDB 7.0
- **Testing:** Jest (server), Vitest (client)

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MongoDB (local via Homebrew OR free MongoDB Atlas cloud)

## Project Structure

```
CapstoneSAUCE/
├── client/                 # React frontend
│   ├── src/               # Source code (to be implemented)
│   ├── package.json       # Client dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── vite.config.ts     # Vite config
│   └── vitest.config.ts   # Vitest config
├── server/                 # Express backend
│   ├── src/               # Source code (to be implemented)
│   ├── package.json       # Server dependencies
│   ├── tsconfig.json      # TypeScript config
│   └── jest.config.js     # Jest config
├── package.json           # Root package.json (scripts)
├── tsconfig.base.json     # Shared TypeScript config
├── .eslintrc.json         # ESLint config
├── .prettierrc            # Prettier config
└── .gitignore
```

## Getting Started

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (server + client)
npm run install:all
```

### 2. Set Up MongoDB

Choose ONE of the following options:

**Option A: MongoDB Atlas (Recommended - Free Cloud)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account
2. Create a free M0 cluster (shared, free forever)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. In `server/.env`, set:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/capstone-sauce?retryWrites=true&w=majority
   ```
6. Make sure to whitelist your IP (0.0.0.0/0 for development)

**Option B: Local MongoDB (via Homebrew - macOS)**

```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify it's running
brew services list
mongosh  # Opens MongoDB shell
```

MongoDB will be available at: `mongodb://localhost:27017`

### 3. Configure Environment Variables

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

Edit `server/.env` with your MongoDB connection string.

### 4. Run the Application

```bash
# Run both server and client in development mode
npm run dev

# Or run separately:
npm run server:dev   # Server on http://localhost:5000
npm run client:dev   # Client on http://localhost:3000
```

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client |
| `npm run server:dev` | Start server only |
| `npm run client:dev` | Start client only |
| `npm run build` | Build both server and client |
| `npm run test` | Run all tests |
| `npm run install:all` | Install all dependencies |
| `npm run lint` | Lint all code |

### Server (`/server`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run Jest tests |
| `npm run lint` | Lint server code |

### Client (`/client`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest tests |
| `npm run lint` | Lint client code |

## MongoDB Management

### Local MongoDB (Homebrew)

```bash
# Start MongoDB
brew services start mongodb-community

# Stop MongoDB
brew services stop mongodb-community

# Restart MongoDB
brew services restart mongodb-community

# Check status
brew services list

# Access MongoDB shell
mongosh

# Connect to your database
mongosh "mongodb://localhost:27017/capstone-sauce"
```

### MongoDB Atlas (Cloud)

- Dashboard: https://cloud.mongodb.com
- Use MongoDB Compass (GUI) to connect with your Atlas connection string
- View logs, metrics, and manage indexes in the Atlas web interface

### Database Schema

The MongoDB initialization script creates the following collections:
- `users` - User accounts and authentication
- `teams` - Team information and members
- `games` - Game records and stat assignments
- `stats` - Individual stat entries

## Coding Standards

- Use **camelCase** for variables and function names
- Limit global variables
- Add comments for team understanding
- Test code before pushing
- Each module should include a header with: Name, Date, Author, Synopsis, Variables

## API Endpoints (To Be Implemented)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset

### Users
- `GET /api/users/profile` - Get current user
- `PUT /api/users/profile` - Update profile

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Games
- `GET /api/games` - List games
- `POST /api/games` - Create game
- `GET /api/games/:id/export` - Export game data

### Stats
- `POST /api/stats` - Record stat (real-time via Socket.IO)
- `GET /api/stats/game/:gameId` - Get game stats
- `GET /api/stats/player/:playerId` - Get player stats

## License

ISC
