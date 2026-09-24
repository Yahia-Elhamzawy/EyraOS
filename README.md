<p align="center">
  <img src="./assets/eyraos-banner.svg" alt="EyraOS — Cognitive Memory Architecture" width="100%" />
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://ai.google.dev/"><img src="https://img.shields.io/badge/Gemini_3.5_Flash_Lite-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" /></a>
  <a href="https://visjs.org/"><img src="https://img.shields.io/badge/vis.js-Knowledge_Graph-F7931E?style=flat-square" alt="vis.js" /></a>
  <a href="https://www.ros.org/"><img src="https://img.shields.io/badge/ROS_2-Ready-22314E?style=flat-square&logo=ros&logoColor=white" alt="ROS 2" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-A78BFA?style=flat-square" alt="MIT" /></a>
</p>

<br/>

> **Memory is persistent knowledge. Context is a temporary selection of relevant memory.**

EyraOS is an autonomous cognitive memory system designed for intelligent robotics. It separates persistent knowledge from ephemeral context through a **9-layer cognitive hierarchy**, enabling robots to learn continuously, resolve contradictions, acquire procedural skills, and consolidate experiences — without hallucinations or unbounded token consumption.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Engines](#core-engines)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

---

## Architecture Overview

The memory system is organized into **9 specialized layers**, each with its own lifecycle, access rules, and update mechanism:

| Layer | Name | Status | Purpose |
|:---:|---|:---:|---|
| 1 | **Sensory Buffer** | Hardware | Real-time sensor stream intake (vision, audio, LiDAR) |
| 2 | **Short-Term Memory** | Active | Immediate conversational attention window |
| 3 | **Semantic Memory** | Active | Knowledge Graph — typed entities and weighted relations |
| 4 | **Episodic Memory** | Active | Timestamped experiential episodes with participant links |
| 5 | **Procedural Memory** | Active | Structured How-To skills and operational protocols |
| 6 | **Adaptive Personality** | Planned | Evolving behavioral traits (curiosity, sociability) |
| 7 | **World Model** | Planned | Spatial awareness, battery state, environment mapping |
| 8 | **Working Memory** | Active | Session context buffer with 15-min inactivity decay |
| 9 | **Reflection & Consolidation** | Active | Post-session pattern extraction and knowledge deduction |

```
User Input                                                          Response
    │                                                                  ▲
    ▼                                                                  │
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Sensory  │───▶│  Selective   │───▶│  Procedural  │───▶│  Episodic    │
│ Buffer   │    │  Retrieval   │    │  Engine      │    │  Logging     │
│ (L1/L2)  │    │  (L3 Graph)  │    │  (L5 Skills) │    │  (L4)        │
└─────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                       ▲                                       │
                       │         ┌──────────────┐              │
                       └─────────│  Reflection  │◀─────────────┘
                                 │  (L9)        │
                                 │  + WM Flush  │
                                 └──────────────┘
```

---

## Core Engines

### Selective Tiered Retrieval

Rather than loading the entire knowledge base into the LLM context, EyraOS parses Arabic user queries, locates matching entities, and performs **1-hop graph traversal** to extract only the relevant sub-graph. This protects the cognitive budget and prevents context distraction:

```
Retrieval: 4/15 entities (27%) — budget preserved
```

### Contradiction & Lifecycle Engine

Exclusive 1-to-1 relationships (`lives_in`, `works_as`, `status_is`) automatically transition older conflicting facts into a `superseded` state upon receiving new data. The system preserves cognitive history rather than blindly overwriting or hallucinating contradictory facts.

### Arabic Negation & Belief Revocation

Phrases like *"أنا مبقتش عايش في إسكندرية"* are detected as **revocations** — the previous relationship is archived as `superseded` without polluting the graph with negative dummy nodes.

### Dual-Stream Session Lifecycle

| Stream | Timing | Action |
|---|---|---|
| **Fast-Stream** | During conversation | Extract primary facts, reply immediately |
| **Working Memory** | Active session | Buffer dialog context, reset on each interaction |
| **Slow Consolidation** | After 15min inactivity | Summarize session, deduce patterns, flush buffer |

### Procedural Memory Engine (Layer 5)

- **In-Chat Learning** — Users teach multi-step skills in natural Arabic; Eyra parses and stores them as structured procedures.
- **Execution Simulation** — Step-by-step protocol execution with episodic logging.
- **Manual Creation** — Interactive form for adding skills with steps, keywords, and categories.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Google Gemini API Key](https://aistudio.google.com/)

### Installation

```bash
git clone https://github.com/Yahia-Elhamzawy/EyraOS.git
cd EyraOS
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
GEMINI_API_KEY=your_actual_key_here
PORT=3000
```

### Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### Chat & Cognition

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send message, trigger retrieval, update graph |

### Semantic Memory (Layer 3)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory/graph` | Full knowledge graph (active + superseded) |
| `GET` | `/api/memory/stats` | Real-time statistics across all layers |
| `DELETE` | `/api/memory/entity/:name` | Delete entity and all its relations |
| `DELETE` | `/api/memory/relation/:id` | Delete a single relationship |
| `POST` | `/api/memory/clear` | Reset memory to initial state |

### Procedural Memory (Layer 5)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory/procedures` | List all stored skills and protocols |
| `POST` | `/api/memory/procedure` | Create a new procedural skill |
| `POST` | `/api/memory/procedure/:id/execute` | Execute and log a procedure |
| `DELETE` | `/api/memory/procedure/:id` | Remove a procedure |

### Sessions & Reflection

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/session` | Current session state and countdown |
| `POST` | `/api/session/timeout` | Trigger consolidation and memory flush |
| `POST` | `/api/memory/consolidate` | Run Layer 9 reflection cycle |

---

## Project Structure

```
EyraOS/
├── assets/                  # Banner and diagram assets
├── public/
│   ├── index.html           # Multi-tab interactive dashboard
│   ├── style.css            # Dark glassmorphism design system
│   └── app.js               # Client-side engine (vis.js, events, timers)
├── server.js                # Node.js cognitive engine + REST API
├── memory_store.json        # Unified knowledge store (all layers)
├── doc.md                   # Foundation architecture specification
├── documentation.md         # Comprehensive reference manual
├── .env.example             # Environment variable template
├── .gitignore
├── LICENSE
└── README.md
```

---

## Roadmap

The current demo validates the cognitive architecture in software. The next phase targets physical embodiment:

- **ROS 2 Bridge** — Map Layer 5 procedural steps to `Nav2` navigation goals and `ros2_control` actuators via Action Servers.
- **Sensory Integration** — Ingest 3D point clouds from Intel RealSense / LiDAR into Layer 1 Sensory Buffer.
- **Edge Deployment** — Run quantized local SLMs (Gemma 2 / Llama 3) on NVIDIA Jetson Orin for offline autonomy.
- **Adaptive Personality (Layer 6)** — Evolving behavioral parameters based on interaction history.
- **Spatial World Model (Layer 7)** — Real-time environmental awareness and obstacle mapping.

---

## License

MIT — see [LICENSE](LICENSE) for details.

<p align="center">
  <sub>Built for the future of autonomous robotic intelligence.</sub>
</p>
