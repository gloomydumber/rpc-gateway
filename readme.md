# Ethereum RPC Gateway & Wallet Balance Web

A PoC-level Ethereum RPC Gateway that acts as a protection layer in front of RPC nodes, paired with a simple wallet balance UI.

## Architecture

- **Hexagonal Architecture** — domain logic isolated from frameworks via ports and adapters
- **Monorepo** — npm workspaces with three packages: `shared`, `backend`, `frontend`

```
packages/
├── shared/     # Types, validation, constants (used by both backend and frontend)
├── backend/    # Express gateway server
└── frontend/   # React + Vite + Tailwind UI
```

## Features

### Gateway (Backend)

- **Restricted API surface** — only `GET /balance?address=...`, no general-purpose JSON-RPC proxy
- **3-layer rate limiting** — global (100/min), per-IP (30/min), per-address (10/min)
- **In-memory cache** — 15s TTL keyed on normalized address, aligned with Sepolia ~12s block time
- **Provider fallback** — primary (Infura) with automatic failover to secondary (Alchemy)
- **Retry with backoff** — exponential backoff + jitter, bounded attempts, non-transient errors fail fast
- **Timeout** — 5s per RPC call via viem's HTTP transport
- **Error normalization** — user-friendly responses, no provider details or API keys exposed
- **Log sanitization** — URLs in error logs are masked to prevent API key leakage
- **Structured logging** — pino with request lifecycle, cache hits, rate limit events, provider metrics

### Wallet Balance Web (Frontend)

- Address input with viem `isAddress` validation (300ms debounce)
- Balance display with throttled refresh (5s cooldown)
- Loading spinners without layout shift
- Etherscan link for the registered address
- All requests go through the gateway — RPC endpoints never exposed in frontend code

## Getting Started

### Prerequisites

- Node.js 18+
- npm 7+ (workspaces support)
- Infura and/or Alchemy API keys for Sepolia testnet

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC provider API keys

# Build shared package
npm run build -w @rpc-gateway/shared

# Start both backend and frontend in development
npm run dev
```

- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:5173`

### Environment Variables

See `.env.example` for all configurable values including rate limit thresholds, cache TTL, RPC timeout, and retry options.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Backend**: Express, express-rate-limit, pino
- **Frontend**: React 18, Vite, Tailwind CSS
- **Blockchain**: viem (Sepolia testnet)
