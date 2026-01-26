# SnowRail Architecture Diagrams

## System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React)"]
        UI[Dashboard UI]
        YukiUI[YUKI Chat Component]
        SentinelUI[SENTINEL Trust Panel]
    end

    subgraph Backend["Backend (Node.js/TypeScript)"]
        API[REST API]
        
        subgraph Core["Core Services"]
            YUKI[YUKI Engine<br/>AI Assistant]
            SENTINEL[SENTINEL<br/>Trust Validation]
            X402[x402 Payment<br/>Executor]
        end
    end

    subgraph Blockchain["Smart Contracts (Avalanche C-Chain)"]
        Treasury[SnowRailTreasury<br/>Payments + Attestations]
        Mixer[SnowRailMixer<br/>ZK Privacy]
        USDC[USDC Token]
    end

    UI --> API
    YukiUI --> API
    SentinelUI --> API
    
    API --> YUKI
    API --> SENTINEL
    API --> X402
    
    YUKI --> SENTINEL
    SENTINEL --> X402
    
    X402 --> Treasury
    Treasury --> Mixer
    Treasury --> USDC
```

## Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant YUKI
    participant SENTINEL
    participant X402
    participant Treasury

    User->>YUKI: "Pay $100 to merchant.com"
    YUKI->>SENTINEL: Validate URL
    
    alt Trust Score >= 60
        SENTINEL-->>YUKI: Score: 87 (APPROVE)
        YUKI-->>User: "Confirm payment?"
        User->>YUKI: "Yes"
        YUKI->>X402: Execute payment
        X402->>Treasury: Transfer funds
        Treasury-->>X402: TX Hash
        X402-->>YUKI: Success
        YUKI-->>User: "Payment complete: 0x..."
    else Trust Score < 60
        SENTINEL-->>YUKI: Score: 23 (DENY)
        YUKI-->>User: "Payment BLOCKED - Low trust score"
    end
```

## SENTINEL Validation Flow

```mermaid
flowchart LR
    subgraph Input
        URL[Payment URL]
    end

    subgraph Checks["SENTINEL Checks"]
        TLS[TLS Certificate]
        DNS[DNS Security]
        INFRA[Infrastructure]
        HEADERS[Security Headers]
        X402C[x402 Support]
    end

    subgraph Scoring
        CALC[Score Calculator<br/>Weighted Average]
    end

    subgraph Decision
        D{Score >= 60?}
        APPROVE[✅ APPROVE]
        DENY[❌ DENY]
    end

    URL --> TLS
    URL --> DNS
    URL --> INFRA
    URL --> HEADERS
    URL --> X402C

    TLS --> CALC
    DNS --> CALC
    INFRA --> CALC
    HEADERS --> CALC
    X402C --> CALC

    CALC --> D
    D -->|Yes| APPROVE
    D -->|No| DENY
```

## Trust Score Decision Matrix

```mermaid
flowchart TD
    SCORE[Trust Score]
    
    SCORE --> H{Score >= 80?}
    H -->|Yes| AUTO[AUTO-APPROVE<br/>Low Risk]
    
    H -->|No| M{Score >= 60?}
    M -->|Yes| COND[CONDITIONAL<br/>Medium Risk]
    
    M -->|No| L{Score >= 40?}
    L -->|Yes| REV[MANUAL REVIEW<br/>High Risk]
    
    L -->|No| BLOCK[BLOCKED<br/>Critical Risk]

    style AUTO fill:#22c55e
    style COND fill:#eab308
    style REV fill:#f97316
    style BLOCK fill:#ef4444
```

## Component Architecture

```mermaid
flowchart TB
    subgraph Packages
        subgraph sentinel["@snowrail/sentinel"]
            SE[Sentinel Engine]
            SC[Security Checks]
            ST[Types]
        end
        
        subgraph yuki["@snowrail/yuki"]
            YE[YUKI Engine]
            YT[Tools]
            YP[LLM Providers]
        end
    end

    subgraph Apps
        subgraph backend["apps/backend"]
            SERVER[Express Server]
            ROUTES[API Routes]
        end
        
        subgraph frontend["apps/frontend"]
            COMP[React Components]
        end
    end

    subgraph Contracts
        TREASURY[SnowRailTreasury.sol]
        MIXER[SnowRailMixer.sol]
    end

    SE --> SC
    SE --> ST
    YE --> YT
    YE --> YP
    YT --> SE
    
    SERVER --> ROUTES
    ROUTES --> SE
    ROUTES --> YE
    
    COMP --> ROUTES
    
    ROUTES --> TREASURY
    TREASURY --> MIXER
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                            │
│                    "Pay $100 to merchant.com"                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          YUKI ENGINE                            │
│                    Parse intent + Extract URL                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SENTINEL VALIDATION                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   TLS    │ │   DNS    │ │  INFRA   │ │  POLICY  │           │
│  │  Check   │ │  Check   │ │  Check   │ │  Check   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │   TRUST SCORE: 87   │                            │
│              │    RISK: LOW        │                            │
│              │  DECISION: APPROVE  │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER CONFIRMATION                            │
│              "Confirm payment of $100? [Yes/No]"                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     x402 PAYMENT EXECUTOR                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SNOWRAIL TREASURY CONTRACT                 │   │
│  │  • Transfer USDC                                        │   │
│  │  • Record attestation                                   │   │
│  │  • Emit PaymentExecuted event                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RESULT                                  │
│           TX: 0x1234...abcd | Status: COMPLETED                │
│           View on Snowtrace: [link]                            │
└─────────────────────────────────────────────────────────────────┘
```
