# EyraOS — Memory Architecture

## 1. Overview

The memory system in EyraOS is not designed as a single storage layer containing all information available to the robot.

Instead, memory is divided into multiple specialized components, where each component represents a different type of information and has its own lifecycle, access rules, and update mechanism.

The core principle is:

> **Memory is persistent knowledge. Context is a temporary selection of relevant memory.**

The robot should not continuously load its entire memory into the LLM context. Doing so would increase latency, consume context unnecessarily, and make the reasoning process less precise as the amount of stored information grows.

Instead, the robot uses a dedicated **Memory Engine** to retrieve only the information relevant to the current situation, then provides that information to the Cognitive Engine / LLM when required.

---

# 2. Memory Layers

The proposed memory architecture consists of the following components:

1. **Immutable Core / Identity Constitution**
2. **Self Model**
3. **Semantic Memory**
4. **Episodic Memory**
5. **Procedural Memory**
6. **Adaptive Personality**
7. **World Model**
8. **Working Memory**
9. **Reflection & Consolidation Memory**
10. **Memory Manager / Memory Orchestrator**

These components do not all behave like traditional "memory". Some represent persistent knowledge, some represent the current state of the robot, and others control how memory is created, retrieved, modified, and consolidated.

---

# 3. Immutable Core / Identity Constitution

The Immutable Core contains the fundamental properties of the robot that should not be modified by the LLM or by normal runtime processes.

Examples include:

* Robot identity.
* Core purpose.
* Fundamental behavioral rules.
* Safety boundaries.
* Initial personality parameters.
* System-level restrictions.
* Developer-defined principles.
* Fundamental permissions.
* Core operational policies.

This layer is controlled by the system owner/developer.

The Cognitive Engine may read this information but should not have direct write access to it.

### Example

```text
Identity:
    Name: Eyra
    System: EyraOS

Purpose:
    Autonomous robotic cognitive system

Core Rules:
    - Protect hardware.
    - Do not intentionally damage the environment.
    - Follow system safety constraints.
    - Never modify the Immutable Core.
```

The Immutable Core should preferably be stored separately from the mutable memory system and may be protected using mechanisms such as:

* Read-only filesystem permissions.
* Cryptographic hashes.
* Digital signatures.
* Restricted system service access.

The goal is to prevent normal cognitive processes from accidentally or intentionally modifying the robot's fundamental identity and rules.

---

# 4. Self Model

The Self Model contains information about what the robot knows about itself.

Unlike the Immutable Core, parts of the Self Model can change over time.

Examples:

```text
Robot:
    Name: Eyra
    OS: EyraOS
    Hardware:
        CPU: ...
        RAM: ...
        Storage: ...
        Camera: ...
        Motors: ...

Capabilities:
    - Navigation
    - Object detection
    - Speech recognition
    - Local reasoning

Limitations:
    - No internet connection
    - Limited battery
    - Camera unavailable
```

The Self Model allows the robot to distinguish between:

> "What am I?"

and

> "What am I capable of doing right now?"

For example, the robot may permanently know that it has a camera, while its current World Model reports that the camera is currently unavailable.

---

# 5. Semantic Memory

Semantic Memory stores general factual knowledge.

It represents information that does not necessarily belong to a specific event.

Examples:

```text
Entity: Bean
    Type: Food
    Relation: Vegetable
```

or:

```text
Entity: Cairo
    Type: City
    Located_In: Egypt
```

Semantic memory can contain:

* Facts.
* Concepts.
* Entities.
* Relationships.
* General knowledge.
* Learned information.
* User preferences.
* Environmental knowledge.

A major design principle is that the database should not require a separate table for every possible concept.

Instead, the system should use a generic entity/relation structure.

Example:

```text
Entities
--------------------------------
id | type      | name
1  | food      | Bean
2  | person    | Yahya
3  | city      | Cairo
```

Relations:

```text
from    relation    to
Bean    is_a        Food
Yahya   likes       Bean
Cairo   located_in  Egypt
```

This allows the knowledge system to grow dynamically without requiring a new database structure for every new concept.

---

# 6. Episodic Memory

Episodic Memory stores experiences and events.

Unlike Semantic Memory, which answers:

> "What is true?"

Episodic Memory answers:

> "What happened?"

Examples:

```text
Event:
    Time: 2026-09-21 18:32
    Actor: Yahya
    Action: complained_about
    Subject: motor_noise
    Context: robot movement
    Result: robot reduced motor speed
```

Another example:

```text
Event:
    Yahya asked the robot to move closer.
    Robot moved 30 cm forward.
    Distance sensor detected an obstacle.
    Robot stopped.
```

Episodic memories can contain:

* Timestamp.
* Location.
* Participants.
* Actions.
* Observations.
* Context.
* Outcome.
* Emotional/behavioral significance where applicable.
* Confidence.
* Source.

Episodic memory is particularly important for learning from experience.

---

# 7. Procedural Memory

Procedural Memory stores knowledge about **how to perform tasks**.

Examples:

```text
Procedure:
    Docking

Steps:
    1. Locate docking station.
    2. Align with station.
    3. Reduce movement speed.
    4. Approach docking point.
    5. Confirm charging connection.
```

Other examples:

* Camera calibration.
* Motor calibration.
* Navigation procedures.
* Battery management.
* Recovery procedures.
* Hardware diagnostics.
* Network reconnection.
* Sensor initialization.

Procedural memory should preferably be represented as structured procedures rather than plain natural-language memories.

---

# 8. Adaptive Personality

The robot should have a distinction between:

### Core Personality

Defined by the developer and stored within the Immutable Core.

and:

### Adaptive Personality

A bounded set of parameters that can evolve gradually through interaction and experience.

Examples:

```text
Curiosity:        0.72
Sociality:        0.61
Verbosity:        0.42
Caution:          0.81
Exploration:      0.55
Trust:            0.68
```

These values should not change because of a single random interaction.

Instead, personality adaptation should be based on repeated evidence.

For example:

```text
Repeated observation:
    User prefers concise answers.

↓
Evidence accumulation

↓
Adaptive personality update:
    Verbosity preference ↓
```

This prevents unstable behavior where the robot's personality changes dramatically after one interaction.

---

# 9. World Model

The World Model represents the robot's current understanding of the environment.

It is different from long-term memory.

For example:

```text
Current World State:

Room:
    Living Room

Objects:
    Chair      → 1.2m
    Table      → 2.4m
    Person     → 1.8m

Battery:
    63%

Camera:
    Online

Motor:
    Front Left → Warning
```

World Model data may change every second.

Therefore, it should not necessarily be treated as permanent memory.

The World Model answers:

> "What is happening now?"

while memory answers:

> "What do I know about what happened before?"

---

# 10. Working Memory

Working Memory is the temporary information currently being used by the Cognitive Engine.

It may contain:

* Current conversation.
* Current task.
* Recent observations.
* Retrieved memories.
* Current world state.
* Active plan.
* Relevant rules.
* Tool results.

Working Memory is temporary and should not automatically become permanent memory.

For example:

```text
User:
    "Where did I put the screwdriver?"

Working Memory:
    Current user request
    Relevant location memories
    Recent observations
    Current environment
```

After the task is completed, most of this information does not need to remain inside the LLM context.

### 10.1 Session Lifecycle & Inactivity Timeout

Working Memory is governed by an active conversational session. As long as continuous interaction is occurring between the user and the robot, the full dialogue context and reciprocal references (pronouns, implicit subjects) remain preserved inside Working Memory.

However, interactions are episodic rather than indefinite. EyraOS introduces an **Inactivity Timeout** (e.g., 15 minutes of silence):

```text
Active Interaction (< 15 min gap) ──► Working Memory preserves verbatim context
                                           │
15 min Inactivity Timeout Reached  ───────► Trigger Post-Session Consolidation
                                           │
                                           ├──► Extract holistic patterns & habits
                                           ├──► Commit episode summary to Episodic Memory
                                           ├──► Selectively persist worthy knowledge
                                           └──► Flush Working Memory buffer (Decay)
```

### 10.2 Dual-Stream Architecture: Fast-Stream vs Post-Session Stream

To prevent memory pollution and excessive latency, memory creation is separated into two complementary processing streams:

1. **Online Fast-Stream (Immediate Explicit Facts):**
   * Processes explicit declarative facts stated during interaction (e.g., name, city of residence, explicit constraints, object locations).
   * Directly updates the Semantic Knowledge Graph in real-time so that subsequent responses within the same active session can immediately utilize them.

2. **Offline Post-Session Stream (Delayed Consolidation & Reflection):**
   * Triggered when the session becomes inactive (e.g., after 15 minutes of silence).
   * Reviews the entire session transcript holistically (Bird's-eye view).
   * Distinguishes transient casual banter from valuable persistent knowledge.
   * Identifies implicit behavioral preferences, communication styles, and repeated patterns.
   * Writes a concise episodic record into Episodic Memory.
   * Flushes the raw conversational buffer from Working Memory, preventing unbounded context growth and hallucination while retaining consolidated wisdom.

---

# 11. Reflection and Memory Consolidation

The robot should periodically process recent experiences and determine whether they contain information worth keeping.

This process can be called **Reflection** or **Memory Consolidation**.

Example:

```text
Recent Events:

1. Yahya asked for shorter responses.
2. Long responses were repeatedly ignored.
3. Short responses received positive interaction.
```

Reflection may produce:

```text
Learned Preference:

Yahya generally prefers concise responses.
Confidence: 0.87
Source: repeated interactions
```

The new information can then be stored in Semantic Memory or Adaptive Personality.

This creates a pipeline:

```text
Experience
    ↓
Episodic Memory
    ↓
Reflection
    ↓
Pattern Detection
    ↓
Candidate Knowledge
    ↓
Validation
    ↓
Semantic / Personality / Procedural Memory
```

Reflection should not automatically overwrite existing knowledge.

Contradictions should be detected and handled explicitly.

---

# 12. Memory Manager / Memory Orchestrator

The Memory Manager is the component responsible for controlling access to the memory system.

The LLM should **not** have unrestricted direct access to the database.

Instead, the Cognitive Engine requests operations from the Memory Manager.

Examples:

```text
create_entity()
create_relation()
update_relation()
query_entity()
query_related()
search_memory()
record_event()
retrieve_recent_events()
```

The Memory Manager decides:

* What database/index to query.
* How deep the search should be.
* How many results should be returned.
* Which memories are relevant.
* Whether semantic search is required.
* Whether graph traversal is required.
* Whether historical events are required.
* Whether the retrieved information is trustworthy.
* Whether a memory should be created or updated.

This creates a security and architecture boundary between the LLM and persistent storage.

---

# 13. Memory Retrieval

EyraOS should not retrieve all memories for every request.

Instead, retrieval should be demand-driven.

For example, if the robot sees a bean:

```text
Perception:
    Object = Bean
```

The Memory Engine can query relevant relationships:

```text
Bean
 ├── is_a → Food
 ├── is_a → Vegetable
 ├── contains → Protein
 └── related_to → Cooking
```

If the robot needs information about Yahya:

```text
Yahya
 ├── likes → Bean
 ├── works_on → EyraOS
 └── prefers → Concise Responses
```

Only the relevant subset is passed to the LLM.

---

# 14. Memory ≠ Context

This is one of the fundamental principles of EyraOS.

The complete memory database may contain:

```text
10,000
100,000
1,000,000+
```

memories.

The LLM should not receive all of them.

Instead:

```text
Persistent Memory
        │
        ↓
Memory Engine
        │
        ├── Exact Search
        ├── Full-Text Search
        ├── Relation Lookup
        ├── Graph Traversal
        ├── Vector Similarity
        └── Temporal Search
        │
        ↓
Relevant Memories
        │
        ↓
Working Context
        │
        ↓
LLM
```

This allows the total memory size to grow without forcing the LLM context to grow at the same rate.

---

# 15. Tiered Retrieval

Memory retrieval can be performed at different depths depending on the complexity of the request.

### Level 0 — Current State

Used for simple questions about current state.

```text
Battery?
Temperature?
Current location?
```

Minimal or no long-term memory retrieval is required.

### Level 1 — Direct Relation

Used when a direct relationship is enough.

```text
What does Yahya like?
```

The Memory Engine directly queries:

```text
Yahya → likes → *
```

### Level 2 — Graph Traversal

Used when information is connected through multiple relationships.

```text
What foods does Yahya like that contain protein?
```

The system may traverse:

```text
Yahya
 ↓ likes
Food
 ↓ contains
Protein
```

### Level 3 — Semantic / Full-Text Search

Used when the required information cannot be identified through exact relationships.

### Level 4 — Historical Retrieval

Used when the system needs previous events.

```text
What happened the last time we tried this?
```

### Level 5 — Deep Reasoning

Complex tasks may require:

* Multiple memory queries.
* Graph traversal.
* Historical events.
* Current World Model.
* Procedures.
* Planning.
* LLM reasoning.

The retrieval depth should therefore be proportional to the complexity of the task.

---

# 16. Retrieval Budget

To prevent unnecessary database and LLM overhead, EyraOS can use a retrieval budget.

Example:

```text
Simple request:
    5 relevant memories

Normal request:
    10–20 memories

Complex request:
    20–50 memories

Deep reasoning:
    50–100+ memories
```

These numbers are not fixed system constants.

They should be dynamically determined according to:

* Query complexity.
* Confidence.
* Number of relevant entities.
* Task importance.
* Available context.
* Latency constraints.

The objective is not to retrieve the maximum amount of information.

The objective is:

> **Retrieve the smallest useful set of information required to make a correct decision.**

---

# 17. Memory Lifecycle

A memory should have a lifecycle instead of being permanently considered equally trustworthy.

A possible lifecycle is:

```text
Candidate
    ↓
Validated
    ↓
Active
    ↓
Updated
    ↓
Superseded
    ↓
Archived
```

A memory can also contain metadata such as:

```text
Confidence
Source
Created At
Updated At
Last Accessed
Importance
Frequency
Validity
```

For example:

```text
Memory:
    Yahya prefers concise responses.

Confidence:
    0.91

Source:
    Repeated interaction

Created:
    2026-09-01

Last confirmed:
    2026-09-21
```

This makes it possible to distinguish between:

* Something the user explicitly stated.
* Something observed once.
* Something inferred repeatedly.
* Something that may no longer be true.

---

# 18. Facts vs Inferences vs Events

EyraOS should distinguish between different types of information.

### Explicit Fact

```text
Yahya said:
"I prefer concise answers."
```

This is directly provided information.

### Behavioral Inference

```text
Yahya frequently responds positively to short answers.
```

This is inferred from observations.

### Event

```text
On 2026-09-21, Yahya requested a shorter response.
```

This is an episodic record.

These should not be treated as equally certain.

For example:

```text
Source:
    direct_statement

Confidence:
    1.0
```

versus:

```text
Source:
    behavioral_inference

Confidence:
    0.74
```

This distinction becomes important when memories conflict.

---

# 19. Proposed Storage Architecture

A relational database can provide the primary persistent storage.

A generic structure may contain:

```text
entities
relations
attributes
events
procedures
personality_parameters
memory_metadata
```

Additional indexes can be used for:

* Full-text search.
* Vector similarity.
* Temporal queries.
* Entity lookup.
* Relationship traversal.

A vector database is therefore not necessarily the entire memory system.

Vector search should be considered one retrieval mechanism inside the broader Memory Engine.

---

# 20. Final Architecture

The complete conceptual flow becomes:

```text
                  EYRAOS
                     │
                     ▼
              Cognitive Engine
                     │
                     ▼
             Memory Orchestrator
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
     Semantic     Episodic     Procedural
     Memory       Memory       Memory
        │            │            │
        └────────────┼────────────┘
                     │
              Self Model
                     │
              World Model
                     │
          Adaptive Personality
                     │
                     ▼
              Relevant Memory
                     │
                     ▼
              Working Memory
                     │
                     ▼
                    LLM
                     │
                     ▼
                Reasoning
                     │
                     ▼
                  Action
                     │
                     ▼
                Experience
                     │
                     ▼
              Episodic Memory
                     │
                     ▼
                Reflection
                     │
                     ▼
             Memory Consolidation
```

The resulting architecture treats memory as an independent cognitive subsystem rather than simply a large prompt attached to an LLM.

The LLM is responsible for reasoning, interpretation, planning, and natural-language interaction, while the Memory Engine is responsible for persistent knowledge, retrieval, relationships, history, and memory lifecycle.

This separation allows EyraOS to maintain a large and continuously growing memory system while keeping the active LLM context small, relevant, and computationally manageable.
