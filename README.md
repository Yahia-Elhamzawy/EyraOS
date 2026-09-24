<p align="center">
  <img src="./assets/eyraos-banner.svg" alt="EyraOS Cognitive Architecture" width="100%" />
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8%2B-3178c6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18%2B-22c55e.svg?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20pgvector-336791.svg?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL pgvector" /></a>
  <a href="https://jestjs.io/"><img src="https://img.shields.io/badge/Tests-17%20Passed-c21325.svg?style=flat-square&logo=jest&logoColor=white" alt="Jest Tests" /></a>
  <a href="https://ai.google.dev/"><img src="https://img.shields.io/badge/Model-Gemini%202.5%20Flash-3b82f6.svg?style=flat-square&logo=google&logoColor=white" alt="Google Gemini" /></a>
  <a href="https://visjs.org/"><img src="https://img.shields.io/badge/Graph%20Engine-vis.js-f59e0b.svg?style=flat-square" alt="vis.js" /></a>
  <a href="https://www.ros.org/"><img src="https://img.shields.io/badge/Robotics-ROS%202%20Ready-6366f1.svg?style=flat-square&logo=ros&logoColor=white" alt="ROS 2" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-gray.svg?style=flat-square" alt="License: MIT" /></a>
</p>

---

## Executive Summary

**EyraOS** is an autonomous cognitive memory architecture engineered for intelligent robotics and continuous agents. Traditional conversational systems load static, uncurated chat logs into large language model context windows, resulting in latency degradation, hallucination loops, and severe token budget exhaustion.

EyraOS decouples persistent knowledge from immediate conversational context based on the foundational thesis:

> **Memory is persistent knowledge. Context is a temporary selection of relevant memory.**  
> *(الذاكرة معارف مستقرة دائمة... بينما السياق هو نافذة اختيار مؤقتة)*

The system maintains a multi-tiered memory hierarchy capable of graph-based knowledge traversal, real-time contradiction resolution, dynamic Arabic belief revocation, procedural skill acquisition, chunked bulk ingestion, and scheduled memory consolidation.

---

## Architecture Highlights

- **Modular TypeScript Architecture:** Fully typed, domain-driven code base (`src/`) featuring strict interfaces, decoupled repositories, and robust error boundaries.
- **Local PostgreSQL + pgvector Storage:** Enterprise-grade relational knowledge graph hosted completely on-premise, preserving data sovereignty and zero cloud lock-in.
- **Chunked Knowledge Ingestion Engine:** Automated semantic document partitioner and multi-pass extractor capable of digesting books, technical manuals, and giant prompts without LLM token exhaustion.
- **Resilient JSON Recovery:** Autonomous parser repairing truncated or malformed LLM outputs to guarantee zero runtime crashes.
- **Deterministic Automated Testing:** 17 unit test suites powered by Jest covering Arabic linguistics, contradiction finite-state machines, and ingestion pipelines.

---

## Real-Time Cognitive Dataflow

<p align="center">
  <img src="./assets/cognitive-stream.svg" alt="Real-Time Cognitive Stream" width="100%" />
</p>

---

## Cognitive Memory Architecture (9-Layer Hierarchy)

The memory system is structured into nine distinct, specialized tiers. Each tier possesses its own lifecycle, access policies, and update mechanics:

| Tier | Layer Name | Arabic Designation | Lifecycle & Update Mechanics | Runtime Status |
|:---:|:---|:---|:---|:---:|
| **L1** | **Sensory Buffer** | المخزن الحسي | Transitory high-frequency input buffer for LiDAR, vision, and audio streams; processed and flushed in real-time. | `Standby (Hardware Ready)` |
| **L2** | **Short-Term Memory** | الذاكرة قصيرة المدى | Transient conversational attention window covering the latest interactive turns. | `Active` |
| **L3** | **Semantic Memory** | الذاكرة الدلالية | Heterogeneous Knowledge Graph storing typed entities and directional relationships in PostgreSQL. Employs 1-hop subgraph retrieval. | `Active (Persistent)` |
| **L4** | **Episodic Memory** | الذاكرة العرضية | Chronological episodic log capturing interactions, participant lists, and operational milestones. | `Active` |
| **L5** | **Procedural Memory** | الذاكرة الإجرائية | Structured How-To skill engine storing executable multi-step protocols (docking, calibration, safety). | `Active (Interactive)` |
| **L6** | **Adaptive Personality** | الشخصية المتكيفة | Parametric behavioral profile (curiosity, caution, sociability) tuned through ongoing user interactions. | `Planned` |
| **L7** | **World Model** | نموذج العالم | Spatial and environmental state tracker reflecting battery levels, obstacle maps, and hardware telemetry. | `Planned (Real-Time)` |
| **L8** | **Working Memory** | الذاكرة العاملة | Active session buffer with a 15-minute inactivity decay timer. Automatically flushed post-session. | `Active (Decay & Flush)` |
| **L9** | **Reflection Engine** | التأمل والتجميع | Autonomous consolidation loop that synthesizes high-level behavioral inferences and resolves redundancies. | `Active (Periodic)` |

```mermaid
graph TD
    L1["Layer 1: Sensory Buffer (Hardware Telemetry)"] --> L2["Layer 2: Short-Term Memory"]
    L2 --> L8["Layer 8: Working Memory (Session Buffer)"]
    L8 -->|"Inactivity Timeout (15m) & Flush"| L9["Layer 9: Reflection & Consolidation"]
    L9 --> L3["Layer 3: Semantic Knowledge Graph (PostgreSQL)"]
    L9 --> L4["Layer 4: Episodic Event Log"]
    L5["Layer 5: Procedural Memory (Skills & Protocols)"] --> L4
    L6["Layer 6: Adaptive Personality"]
    L7["Layer 7: World Model & Environment"]
```

---

## Core Algorithmic Framework

### 1. Selective Tiered Subgraph Retrieval
Rather than injecting the full knowledge base into the LLM prompt, EyraOS parses the incoming Arabic natural language prompt, extracts core semantic anchors, and performs a **1-hop graph traversal**. Only relevant subgraphs and active edges are supplied to the generation context:

```text
Prompt Input -> Semantic Token Extraction -> 1-Hop Graph Traversal -> Subgraph Context Injection
```
- **Telemetry:** Each turn outputs contextual efficiency stats (e.g., `4/21 entities retrieved (19% budget)`).
- **Benefit:** Eliminates context distraction, guarantees bounded latency, and drastically lowers token costs.

### 2. Contradiction & Belief Lifecycle FSM
Knowledge is dynamic. When mutually exclusive relationships (such as `lives_in`, `works_as`, or `status_is`) receive conflicting updates, EyraOS triggers a deterministic Finite State Machine:
- The previous edge is transitioned to `status: "superseded"` with a timestamp (`superseded_at`) and justification.
- The newly confirmed edge is instantiated as `status: "active"`.
- Historical beliefs remain queryable via audit flags without polluting real-time reasoning.

### 3. Explicit Arabic Negation & Belief Revocation
Conventional LLM agents struggle with temporal negations (e.g., *"أنا مبقتش عايش في إسكندرية"*), often creating spurious negative nodes like `does_not_live_in`. EyraOS incorporates explicit revocation handlers:
- Detects Arabic negative modifiers (`مبقتش`, `مش عايش`, `تركت`, `لا اعيش`).
- Transitions existing positive edges directly to `superseded`.
- Prevents graph pollution and preserves topological integrity.

### 4. Dual-Stream Architecture & 15-Minute Working Memory Decay
- **Online Fast-Stream:** Extracts verified atomic facts immediately during live conversation for instantaneous graph updates.
- **Working Memory Buffer:** Holds conversational context during active sessions. Every interaction resets a 15-minute inactivity countdown.
- **Offline Slow Consolidation:** Upon timeout expiration, EyraOS executes an autonomous reflection pass, extracts macro-level behavioral inferences, archives an Episodic summary, and executes a **Working Memory Flush** to reset context overhead.

### 5. Procedural Memory & Skill Stepper (Layer 5)
Procedural knowledge cannot be reduced to simple declarative triplets. EyraOS models skills as ordered operational sequences:
- **In-Chat Skill Acquisition:** Users can teach multi-step procedures directly via natural dialogue. The engine extracts triggers, categories, and numbered steps.
- **Execution & Episodic Verification:** Procedures can be triggered programmatically or via chat commands. Each execution logs an Episode in Layer 4 and increments execution counters.

### 6. Chunked Bulk Ingestion Pipeline
When feeding massive documents, robot operational manuals, or comprehensive user backgrounds, single LLM passes truncate mid-payload due to token output caps. EyraOS addresses this via its multi-stage ingestion pipeline:
- **Semantic Boundary Partitioning:** Splits text at paragraph and sentence delimiters with configurable token overlaps.
- **Multi-Pass Entity & Relation Extraction:** Analyzes each chunk independently, extracting 100% of facts, entities, and procedural skills without output clipping.
- **Atomic Database Write:** Commits extracted knowledge directly to PostgreSQL with automatic deduplication and conflict checks.

---

## Directory & Module Structure

```text
EyraOS/
├── src/                             # TypeScript Core Source Code
│   ├── types/                       # Static Type Definitions & Interfaces
│   │   └── memory.types.ts
│   ├── config/                      # Environment & Database Configuration
│   │   └── env.ts
│   ├── db/                          # Database Abstraction Layer
│   │   ├── connection.ts            # PostgreSQL Connection Pool & Health Checks
│   │   └── repositories/            # Entity, Relation, Episode, & Procedure Repos
│   ├── core/                        # Cognitive Processing Engines
│   │   ├── arabic.ts                # Arabic NLP Normalization & Prefix Stripping
│   │   ├── conflict.ts              # Contradiction Resolution & FSM Transitions
│   │   ├── retrieval.ts             # Tiered Subgraph Traversal & Selective Context
│   │   ├── memory.engine.ts         # High-Level Cognitive Memory Coordinator
│   │   └── session.manager.ts       # Working Memory Buffer & Timeout Lifecycle
│   ├── services/                    # LLM & Background Intelligence Services
│   │   ├── gemini.service.ts        # Structured Dialog & Resilient JSON Recovery
│   │   ├── ingestion.service.ts     # Chunked Knowledge Ingestion Pipeline
│   │   └── reflection.service.ts    # Layer 9 Consolidation & Inferences
│   ├── routes/                      # Express REST Endpoints
│   │   ├── memory.routes.ts         # Graph, Procedures, & Ingestion Routes
│   │   └── chat.routes.ts           # Interactive Chat & Session Endpoints
│   ├── app.ts                       # Express Application Bootstrap
│   └── server.ts                    # Server Entrypoint
├── tests/                           # Automated Test Suites (Jest)
│   ├── arabic.test.ts               # Arabic Normalization & Fuzzy Matching
│   ├── conflict.test.ts             # Exclusivity & Polarity Conflict FSM
│   └── ingestion.test.ts            # Semantic Chunking & Ingestion Verification
├── public/                          # Web Interface
│   ├── index.html                   # Multi-tab Dashboard (Graph, ERD, Layers)
│   ├── style.css                    # Dark Glassmorphism Design System
│   └── app.js                       # Interactive Vis.js Visualizer & Event Loop
├── tsconfig.json                    # TypeScript Configuration
├── jest.config.js                   # Jest Test Runner Configuration
└── package.json                     # Project Manifest & Scripts
```

---

## REST API Specification

All endpoints communicate via JSON over HTTP.

### Conversational Core

```http
POST /api/chat
Content-Type: application/json

{
  "message": "يا إيرا دي خطوات فحص المحركات: 1. قياس الجهد 2. فحص الدوران"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "reply": "تم تسجيل خطوات فحص المحركات بنجاح وحفظها في الذاكرة الإجرائية.",
  "telemetry": {
    "retrievedEntitiesCount": 3,
    "totalEntities": 21,
    "retrievalPercentage": 14,
    "supersededCount": 0
  },
  "graph": {
    "entities": [...],
    "relations": [...]
  },
  "memoryAdded": {
    "entities": [...],
    "relations": [...],
    "learnedProcedure": { ... }
  }
}
```

### Knowledge Graph, Ingestion & Operations Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/memory` | Returns all active and superseded graph entities and relational edges. |
| `GET` | `/api/memory/stats` | Aggregated metrics across entities, relations, episodes, and procedures. |
| `POST` | `/api/memory/ingest` | Triggers chunked ingestion pipeline for large documents and raw knowledge dumps. |
| `DELETE` | `/api/memory/entity/:name` | Cascading deletion of an entity and its associated edges. |
| `DELETE` | `/api/memory/relation/:id` | Deletion of a specific relational edge by ID. |
| `GET` | `/api/memory/procedures` | Lists all stored Layer 5 procedural protocols and execution counts. |
| `POST` | `/api/memory/procedure` | Manually registers a new procedural skill with custom steps. |
| `POST` | `/api/memory/procedure/:id/execute` | Executes a procedure, logs an episode, and increments counters. |
| `DELETE` | `/api/memory/procedure/:id` | Removes a procedure from Layer 5. |
| `GET` | `/api/session` | Inspects active session status, remaining TTL, and message counts. |
| `POST` | `/api/session/timeout` | Manually triggers 15-minute session expiration and memory flush. |
| `POST` | `/api/memory/consolidate` | Triggers Layer 9 cognitive reflection and deduplication cycle. |
| `GET` | `/health` | Heartbeat endpoint returning service status and timestamp. |

---

## Hardware & Robotics Integration Pipeline

EyraOS is architected for direct integration with physical robotic platforms:

```text
[EyraOS Layer 5 Engine]
         |
         v
[ROS 2 Action Client Bridge]
         |
    +----+----+
    |         |
    v         v
 [Nav2]   [ros2_control]
(Waypoints)  (Actuators)
```

1. **ROS 2 Action Client Bridge:** Translates Layer 5 procedural steps into `Nav2` navigation goals and `ros2_control` hardware instructions.
2. **Sensory Buffer Feed:** Ingests point-cloud frames and depth streams from Intel RealSense or LiDAR into Layer 1 to maintain real-time World Model state.
3. **Edge Deployment:** Designed to run in tandem with quantized local SLMs (e.g., Gemma 2, Llama 3) on embedded compute platforms (NVIDIA Jetson Orin) for network-independent autonomy.

---

## Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- PostgreSQL (v15+ or Docker image `pgvector/pgvector:pg16`)
- Google Gemini API Key

### Step-by-Step Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yahia-Elhamzawy/EyraOS.git
   cd EyraOS
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to supply your Gemini API key and PostgreSQL credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   DATABASE_URL=postgresql://eyra_user:your_password@localhost:5432/eyraos
   ```

4. **Run automated test suite:**
   ```bash
   npm test
   ```

5. **Build and launch the TypeScript server:**
   ```bash
   npm run build
   npm start
   ```
   For local development with live hot-reloading:
   ```bash
   npm run dev
   ```

6. **Access the user interface:**
   Open [http://localhost:3000](http://localhost:3000) in any modern web browser.

---

## Repository Documentation References

- [doc.md](doc.md) — Foundational Memory Architecture Specification.
- [documentation.md](documentation.md) — Comprehensive Engineering Manual (Arabic/English).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
