# 설계 설명 문서

## 설계 개요

이 프로젝트는 Ethereum RPC Gateway를 중심으로, 외부에 노출되는 RPC 자원을 보호하면서 지갑 잔액 조회 기능을 제공하는 것을 목표로 했습니다.

일반적인 Web3 환경에서는 클라이언트가 RPC endpoint에 직접 접근하게 되며, 이로 인해 악의적인 사용자가 해당 endpoint로 대량 요청하는 DoS/DDoS 등으로 서버 리소스를 소모할 수 있습니다.

이 프로젝트에서는 이러한 문제를 해결하기 위하여 RPC Gateway를 중간 레이어로서, 안전한 RPC endpoint 서비스 제공을 하도록 PoC 단계로서 구현하였습니다.

## 전체 아키텍처

기능적으로는 아래와 같이 구성됩니다.

```
[Frontend]
   ↓
[RPC Gateway (Backend)]
   ↓
[RPC Provider (Infura / Alchemy)]
```

- Frontend는 RPC Endpoint에 직접 접근하지 않고, 접근하지 못합니다.
- 모든 요청은 Gateway를 통해 전달됩니다.
- Gateway에서는 요청을 검증하고 보호 로직을 수행합니다.

구조적으로는 아래와 같이 Hexagonal Architecture 형태로 구성됩니다.

```
Inbound (HTTP)
   ↓
Application / Domain
   ↓
Outbound (RPC Providers)
```

- 비지니스 로직(RPC 보호 로직 등)과 외부 의존성(Infura 및 Alchemy 등의 external RPC provider)이 분리됩니다.
- RPC Provider 의 교체가 용이합니다.
- 유지보수성 및 확장성이 확보되고 테스트에 용이합니다.

## Tech Stack

- Frontend: React (Vite, Tailwind CSS)
- Backend: Express
- Blockchain: viem

Frontend와 Backend 모두 TypeScript로 monorepo(npm workspace)형태로 구현하었고, 특히 Frontend와 Backend 모두 Shared Workspace로 viem 디펜던시를 공유하여 블록체인 관련 로직을 처리하였습니다.

**Express 선택 이유**: 단일 endpoint의 PoC 프로젝트에서 NestJS의 모듈/데코레이터/DI 컨테이너 등은 과도한 보일러플레이트가 필요하다고 생각했습니다. Express로 Hexagonal Architecture를 수동 DI(생성자 주입)로도 구현할 수 있으며, 좀 더 간결하게 작성할 수 있었습니다.

**viem 선택 이유**: ethers.js 대비 TypeScript 지원이 우수하고, tree-shaking이 가능하며, `isAddress`와 `getBalance` 등 필요한 기능을 깔끔한 API로 제공합니다. Frontend에서는 address validation 용도로만, Backend에서는 주로 RPC 호출 용도로 사용합니다.

## 백엔드 설계 결정

Express 앱의 진입점은 `packages/backend/src/adapters/inbound/http/app.ts` 입니다. 이 파일은 Hexagonal Architecture에서 Inbound Adapter 역할을 하고, 모든 미들웨어와 라우트를 처리합니다.

`createApp()` 함수는 도메인 서비스(`BalanceQueryPort`)를 외부에서 주입받습니다. Express나 HTTP에 대해 의존성이 없는 도메인 로직과, 프레임워크에 의존하는 HTTP 처리 로직을 분리하였습니다.

미들웨어는 등록 순서대로 실행되며, 보호 로직이 비즈니스 로직보다 먼저 수행되도록 구성했습니다:

```ts
// packages/backend/src/adapters/inbound/http/app.ts

export function createApp(balanceService: BalanceQueryPort) {
  const app = express();

  app.use(corsMiddleware); // 1. CORS 검사
  app.use(requestLogger); // 2. 요청 로깅
  app.use(globalLimiter); // 3. 전체 시스템 rate limit
  app.use(ipLimiter); // 4. IP별 rate limit

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createBalanceRouter(balanceService)); // 5. 잔액 조회 라우트 (내부에 per-address rate limit 포함)

  app.use(errorHandler); // 6. 에러 정규화

  return app;
}
```

실제 의존성 주입은 Composition Root인 `packages/backend/src/index.ts`에서 이루어집니다:

```
InfuraProvider + AlchemyProvider
  → FallbackProvider (장애 시 자동 우회)
    → CachedBalanceProvider (15초 TTL 캐시 데코레이터)
      → BalanceService (도메인 서비스, inbound port 구현)
        → createApp() (Express HTTP adapter)
```

### 제한된 API Surface

일반적인 EVM JSON RPC 형태가 아니라, 아래와 같은 단일 API Endpoint만을 구현했습니다.

```
GET /balance?address=...
```

- 불필요한 RPC method 노출 방지
- 공격 표면 최소화 (현재는 잔액 조회 기능만 필요)

### Address Validation

모든 요청은 RPC 호출 이전에 검증됩니다.

- `viem` 의 `isAddress()` 를 통해 주소 형식을 검증합니다.
- 잘못된 요청은 즉시 400 에러를 반환합니다.

이를 통해,

- 불필요한 RPC 호출을 방지합니다.
- malformed input으로 인한 자원이 낭비되는 것을 방지합니다.

### 3 단계 Rate Limiting

3가지 레이어의 rate limit을 구성하였습니다.

| Layer       | Limit       | 목적                                            |
| ----------- | ----------- | ----------------------------------------------- |
| Global      | 100 req/min | 전체 시스템 보호 (분산 공격, 트래픽 폭주 방지)  |
| Per-IP      | 30 req/min  | 단일 사용자/봇의 과도한 요청 차단               |
| Per-Address | 10 req/min  | 특정 주소에 대한 반복 조회 방지 (bot/spam 대응) |

**임계값 근거**: Infura 무료 티어는 10 req/sec (일 100K), Alchemy 무료 티어는 ~330 CU/sec (`getBalance` = 19 CU, 약 17 calls/sec)입니다. Global 100/min (~1.67/sec)은 두 provider의 무료 티어 한도 내에서 안전하게 운영 가능한 수치이며, retry와 fallback을 위한 여유분을 확보했습니다. Per-address 10/min은 15초 cache TTL과 결합하면 실제 RPC 호출은 분당 최대 4회 수준으로 제한됩니다.

### Cache

Cache를 통해 최신성과 효율성을 동시에 취하고자 했습니다. ETH 잔액은 새로운 블록이 생성될 때만 변경될 수 있으므로, 같은 블록 내에서의 중복 조회는 캐시로 처리해도 데이터 정합성에 문제가 없습니다.

- Key: normalized address (lowercase)
- TTL: 15초 (Sepolia 블록 생성 주기 ~12초)

**15초 선택 근거**: 블록 생성 주기인 12초보다 약간 긴 15초를 TTL로 설정하여, 최대 약 1블록 분량의 stale data만 캐싱하도록 하였습니다. 더 짧은 TTL(예: 5초)은 같은 블록 내에서도 불필요한 RPC 호출을 유발하고, 더 긴 TTL(예: 60초)은 트랜잭션 이후 약 5블록 동안 이전 잔액이 표시되어 사용자 경험에 영향을 줄 수 있습니다.

### Timeout & Retry

느린 provider로 인한 blocking을 방지하고자 timeout을 도입하였고, 일시적인 에러(transient error)에도 대응하도록 제한된 횟수만큼만 retry하도록 구현했습니다.

- Timeout: 5초 (viem의 `http` transport `timeout` 옵션)
- Retry: 최대 2회, exponential backoff + jitter
  - 1차 실패 시: 250~500ms 대기 후 재시도
  - 2차 실패 시: 즉시 포기, 다음 provider로 fallback
  - 비일시적 에러 (4xx 등)는 재시도 없이 즉시 실패 처리하여 불필요한 RPC 호출 증폭을 방지

### Provider Fallback

```
Primary Provider (Infura)
        ↓ 실패 시
Fallback Provider (Alchemy)
```

특정 Provider에 장애가 발생 시, 서비스 지속을 위해서 단일 의존성을 피하도록 Fallback 로직을 통해 다른 Provider로 우회 요청할 수 있도록 Fallback 로직을 구현하였습니다.

### Error Handling & Sanitization

RPC Provider나 viem 라이브러리에서 응답하는 에러 형식을 그대로 client로 전달하면, RPC URL이나 API Key가 노출될 위험이 있을 수 있으므로, Sanitization을 통해 내부 정보를 비노출하는 방식으로 에러를 처리합니다.

구체적으로, viem은 에러 발생 시 `error.url`에 API Key가 포함된 전체 RPC URL을, `error.message`에 URL과 request body를 포함합니다. viem 내부의 `getUrl()` 유틸리티는 URL에 대한 어떠한 sanitization도 수행하지 않습니다. 이를 대응하기 위해:

- **Client 보호**: 모든 viem 에러는 outbound adapter에서 catch되어 generic `ProviderError`로 변환되게 하였고, 원본 에러는 client response에 포함되지 않습니다.
- **Log 보호**: `sanitizeError()` 유틸리티를 통해 에러 메시지 내 URL의 API key 경로를 마스킹(`***`) 처리한 후 로깅하도록 하였습니다.

### Observability

다음과 같은 이벤트를 로그로 기록하도록 하였습니다:

- 요청 로그
- rate limit 발생
- cache hit / miss
- provider 호출 성공/실패

이를 통해 트래픽 패턴을 분석하거나, 장애에 대응하고 abuse를 탐지할 수 있도록 하였습니다.

### 요청 처리 흐름

하나의 잔액 조회 요청이 시스템을 통과하는 전체 흐름입니다:

```
Frontend (/api/balance?address=0x...)
  → Vite dev proxy (rewrites /api → localhost:3000)
    → CORS middleware
      → Request logger (pino-http)
        → Global rate limiter (100/min)
          → Per-IP rate limiter (30/min)
            → Balance route handler
              → Per-address rate limiter (10/min)
                → BalanceService (domain)
                  → isAddress() validation
                    → CachedBalanceProvider
                      → [Cache hit] → 즉시 반환
                      → [Cache miss] → FallbackProvider
                        → InfuraProvider (withRetry, 5s timeout)
                          → [실패 시] → AlchemyProvider (withRetry)
                    → Cache 저장 (15s TTL)
                  → formatEther() 변환
              → JSON response (200)
        → [에러 발생 시] → Error handler → sanitized JSON response
```

각 단계에서 조건이 충족되지 않으면(rate limit 초과, validation 실패 등) 즉시 적절한 에러 응답을 반환하고 이후 단계로 진행하지 않습니다.

## 프론트엔드 설계 결정

### RPC Endpoint 비노출

모든 요청은 `/api/balance` 를 통해 이루어지도록 RPC Endpoint를 노출하지 않았습니다.

### Debounce & Address Validation

입력값을 Debounce 후, Address Validation을 진행하도록 하였습니다.

### Refresh Throttling

- 5초 Throttle: 버튼 스팸으로인해 burst 되는 요청이 없도록 하였습니다.

## 가정 공격 / 장애 시나리오

아래와 같은 벡터를 염두에두고 설계했습니다.

### 단일 IP의 대량 요청 (DoS)

단일 IP에서 스크립트나 봇을 통해 수천 건의 반복 요청을 보내는 시나리오입니다. Per-IP rate limit (30 req/min)이 이를 차단하며, 초과 요청은 429 응답으로 즉시 거부됩니다.

### 특정 주소 반복 조회 (Bot/Spam)

특정 지갑 주소의 잔액 변동을 모니터링하기 위해 봇이 동일 주소를 반복 조회하는 시나리오입니다. Per-address rate limit (10 req/min)과 cache (15초 TTL)가 결합되어 실제 RPC 호출을 최소화합니다.

### 분산 공격 (DDoS)

Global rate limit (100 req/min)이 전체 시스템 처리량을 제한하여 provider 자원 소진을 방지하도록 하였습니다. infrastructure-level DDoS 방어(IP 차단 등)는 본 PoC 범위 밖의 문제입니다.

### RPC Provider 장애

Primary provider(Infura) 장애 시, fallback을 통해 secondary provider(Alchemy)로 자동 우회하도록 하였습니다. 각 provider에 대해 최대 2회 retry 후 실패 시 다음 provider로 전환됩니다.

### API Key 노출 시도

에러 응답을 통한 내부 정보 수집 시도에 대해, error sanitization으로 대응합니다. RPC URL, API key, provider 이름, stack trace 등 내부 정보는 client에게 전달되지 않으며, 로그에서도 마스킹 처리됩니다.

## 한계

이 프로젝트는 PoC 수준이므로 여러 한계가 있습니다.

### In-memory Cache & Rate Limit

캐시와 Rate Limit이 단일 인스턴스의 메모리에서만 유효합니다. Scale-out 시 인스턴스 간 상태가 공유되지 않아 rate limit이 우회될 수 있습니다. 실배포에서는 Redis 기반으로의 전환 등이 필요합니다.

같은 맥락에서, 현재는 단일 인스턴스 기준으로 설계되었으며, 글로벌 배포나 고가용성 구성은 고려되지 않았습니다.

### 인증 미구현

현재 API에 인증 메커니즘이 없어 누구나 호출할 수 있습니다. 실서비스에서는 JWT 인증이나 API Key 등을 통해 사용자별 접근 제어와 할당량 관리가 필요합니다.

### Infrastructure-level DDoS 미대응

이 프로젝트는 PoC 단계로서, application-level 보호만 구현하였습니다. 대규모 인프라 공격에 대해서는 대응하지 않았습니다.

## 실행 방법

### 사전 요구사항

- Node.js 18+
- npm 7+ (workspaces 지원)
- Infura 또는 Alchemy의 Sepolia 테스트넷 API Key

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 RPC Provider API Key를 입력

# Shared 패키지 빌드
npm run build -w @rpc-gateway/shared

# Backend + Frontend 동시 실행
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

### 환경변수

모든 설정 값은 `.env` 파일에서 관리됩니다. Rate limit 임계값, Cache TTL, RPC timeout, retry 옵션 등을 `.env.example`에서 확인할 수 있습니다.
