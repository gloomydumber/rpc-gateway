# Specification

## Frontend

### Security & UX Protections

These are client-side protections that improve user experience but **cannot prevent malicious usage**. Actual enforcement is handled by the backend gateway.

**RPC endpoint isolation**
- Frontend never accesses RPC providers directly
- All requests go through `/api/balance` via Vite dev proxy → backend
- Infura/Alchemy URLs exist only in the backend `.env`

**Address validation**
- Input validated with viem's `isAddress`, debounced at 300ms as user types
- Register button stays disabled until a valid address is entered
- Prevents sending obviously invalid requests to the backend

**Refresh throttle**
- Uses a throttle (not debounce) with a 5-second window
- First click fires the request immediately
- Subsequent clicks within 5s are ignored (button disabled with spinner)
- After 5s the button re-enables; next click fires immediately again
- No request is queued or delayed — it's a rate-limit on trigger frequency

**Loading state guard**
- While a request is in-flight, the refresh button is disabled
- Prevents duplicate concurrent requests from rapid interaction

## Backend

### Security Protections

These are server-side enforcements. Unlike frontend protections, they cannot be bypassed by the client.

**Restricted API surface**
- The gateway exposes only `GET /balance?address=...` — no general-purpose JSON-RPC proxy
- Arbitrary RPC methods (e.g., `eth_sendTransaction`, `eth_call`) cannot be invoked by external users
- This minimizes the attack surface to a single, read-only operation

**Server-side address validation**
- Address is re-validated with viem's `isAddress` in the domain service before any RPC call
- Invalid requests are rejected with HTTP 400, never reaching the RPC provider
- Prevents resource consumption from malformed inputs regardless of client behavior

**3-layer rate limiting**
- Global: 100 req/min — caps total server throughput, prevents distributed attacks from exhausting RPC provider quotas
- Per-IP: 30 req/min — prevents a single source from dominating resources
- Per-address: 10 req/min — prevents hammering the same address (bot spam, scraping)
- Applied via `express-rate-limit` middleware, ordered: global → per-IP → per-address
- Per-address key is normalized (lowercased) to prevent bypass via case variation
- Returns HTTP 429 with `Retry-After` header and a user-friendly JSON body
- All thresholds configurable via environment variables

*Threshold rationale:*
- Reference: Infura free tier allows 10 req/sec (100K/day), Alchemy free tier allows ~330 CU/sec (`getBalance` = 19 CU, so ~17 calls/sec)
- Global 100/min (~1.67/sec) stays well within both provider free tiers, leaving headroom for retries and fallback
- Per-IP 30/min (0.5/sec) is generous for manual usage but blocks automated abuse from a single source
- Per-address 10/min pairs with the 15s cache TTL — most repeated queries within the window will be cache hits, so 10 actual provider calls per address per minute is rarely reached in normal use
- In production, these numbers would be tuned based on actual traffic patterns, paid provider tiers, and infrastructure capacity

*Configuration approach:*
- Thresholds are set via `.env` — appropriate for single-instance PoC, allows tuning without code changes
- Production progression: `.env` → config service (e.g., AWS Parameter Store) for consistent limits across instances → Redis-backed rate limiter store for distributed enforcement

**Response caching**
- 15s in-memory TTL cache keyed on normalized address
- Reduces redundant RPC calls under repeated queries — most per-address rate limit hits will be cache hits anyway
- Limits the amplification effect of burst traffic on RPC providers

*TTL rationale (15 seconds):*
- Sepolia block time is ~12 seconds — a balance can only change when a new block is mined
- 15s TTL means stale data lasts at most ~1 block, which is acceptable for a balance query
- Shorter TTL (e.g., 5s) would still serve stale data within a block but with more cache misses and more RPC calls for no additional freshness
- Longer TTL (e.g., 60s) would reduce RPC calls further but users could see outdated balances for up to ~5 blocks after a transaction
- 15s strikes the balance: nearly real-time data while absorbing the majority of repeated queries within a block window
- For Ethereum mainnet (~12s block time), the same TTL would apply; for faster chains (e.g., Polygon ~2s), a shorter TTL would be appropriate

**RPC timeout**
- Each outbound RPC call has a 5s timeout (via viem's `http` transport)
- Prevents the server from being blocked by slow or unresponsive providers
- Avoids connection pile-up under degraded provider conditions

**Provider fallback with bounded retries**
- Primary provider failure triggers fallback to secondary provider
- Retries are limited (max 2 attempts per provider) with exponential backoff + jitter
- Non-transient errors (4xx) fail immediately — no retry amplification
- Total provider attempts are bounded, preventing resource exhaustion from cascading retries

**Error normalization**
- Internal RPC errors and provider-specific details are never exposed to the client
- All errors are caught in outbound adapters and re-thrown as generic `ProviderError`
- Global error handler returns only `{ error: string, code: string }` — no stack traces, no provider names, no internal paths
- Prevents information leakage that could aid attackers in targeting specific providers or identifying infrastructure

*viem error exposure risk and mitigation:*
- viem throws errors containing sensitive data: `error.url` includes the full RPC URL with embedded API keys (e.g., `https://sepolia.infura.io/v3/YOUR_KEY`), `error.message` includes the URL and request body, `error.body` contains the full JSON-RPC payload
- viem's internal `getUrl()` utility performs zero sanitization — URLs are passed through as-is
- Both Alchemy and Infura use URL-path-embedded API keys, so any viem error from a failed RPC call contains the key
- **Client protection**: outbound adapters catch all viem errors and wrap them as `ProviderError` with a generic message — the raw viem error never reaches the client response
- **Log protection**: a `sanitizeError()` utility masks URLs in error messages before logging — API key path segments (16+ character alphanumeric strings) are replaced with `***`, query param values are masked, and only the sanitized message, error name, and error code are logged
- This sanitization is applied in both the provider adapters (on catch) and the global error handler (on `details` and unexpected errors)

**CORS**
- Restricted to configured origin (`http://localhost:5173` in development)
- Only `GET` method allowed
- Prevents unauthorized cross-origin requests from unknown domains

**Secret management**
- RPC provider API keys stored in `.env`, never committed to source code
- `.env` is gitignored; `.env.example` provides a template without real values

### Observability

**Logging (pino)**
- Structured JSON logging used throughout the backend
- pino is a logging library, not a process manager

**Process management (future)**
- PM2 can be introduced for production deployment
- Enables zero-downtime deployment via `pm2 reload` (graceful restart with cluster mode)
- Handles process restart on crash, clustering across CPU cores, and basic monitoring
- pino and PM2 are complementary: pino produces structured logs, PM2 manages the process lifecycle
