---
name: study-notes-creator
description: Create organized, visual study notes with folder structures, diagrams, and example-based learning from source materials (PDFs, lecture notes, documentation). Use when creating structured learning materials, exam preparation notes, or educational documentation. Triggers - organize study notes, create visual learning materials, generate notes with diagrams, exam prep notes, example-based learning.
---
 
# Study Notes Creator
 
Transform source materials into organized, visual study notes with themed folders, rich diagrams, and example-based learning.
 
## Workflow
 
```mermaid
flowchart LR
    A[Source Materials] --> B[Extract Topics]
    B --> C[Plan Structure]
    C --> D[Create Notes]
    D --> E[Add Diagrams + Examples]
    E --> F[Build Index]
```
 
---
 
## Step 1: Understand the Source
 
1. **Read the source** - PDFs, lecture notes, existing docs
2. **Identify 5-8 main topics** - Major themes
3. **Find subtopics** - What falls under each theme?
4. **Note example opportunities** - Where can real examples help?
 
---
 
## Step 2: Plan Folder Structure
 
```
subject/
├── README.md                    # Master index
├── concepts/                    # Core theory
│   ├── 01-introduction.md
│   └── 02-fundamentals.md
├── techniques/                  # How-to procedures
│   ├── 01-method-a.md
│   └── 02-method-b.md
├── examples/                    # Worked problems
│   ├── 01-basic-examples.md
│   └── 02-advanced-examples.md
└── practice/                    # Exercises
    └── 01-exercises.md
```
 
---
 
## Step 3: Note Template
 
```markdown
# [Topic Title]
 
One sentence summary.
 
## Overview
 
[Mermaid diagram showing the main concept]
 
## Key Concepts
 
### Concept 1
 
Brief explanation.
 
**Example:**
[Concrete example with real-world scenario]
 
## Summary Table
 
| Term | Definition | Example |
|------|------------|---------|
| A | What A is | Real use case |
 
## Practice Problems
 
1. Problem statement
   <details>
   <summary>Solution</summary>
   Step-by-step solution
   </details>
 
## Related
 
- [[other-note]] - Connection
```
 
---
 
## Step 4: Mermaid Diagrams (Primary)
 
### Flowchart (Process Flow)
 
```mermaid
flowchart LR
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action]
    C -->|No| E[End]
```
 
**Use for:** Processes, decision trees, algorithms, workflows
 
### Flowchart TB (Hierarchy/Tree)
 
```mermaid
flowchart TB
    A[Main Topic] --> B[Branch A]
    A --> C[Branch B]
    A --> D[Branch C]
    B --> E[Detail 1]
    B --> F[Detail 2]
    C --> G[Detail 3]
```
 
**Use for:** Taxonomies, classifications, org charts, topic breakdowns
 
### Sequence Diagram
 
```mermaid
sequenceDiagram
    participant A as Actor
    participant S as System
    A->>S: Request
    S-->>A: Response
    A->>S: Follow-up
```
 
**Use for:** Interactions, conversations, API calls, cause-effect chains
 
### State Diagram
 
```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Active : Start
    Active --> Success : Complete
    Active --> Error : Fail
    Error --> Idle : Retry
    Success --> [*]
```
 
**Use for:** Lifecycles, status changes, phases, state machines
 
### Cycle Diagram
 
```mermaid
flowchart LR
    A[Stage 1] --> B[Stage 2]
    B --> C[Stage 3]
    C --> D[Stage 4]
    D --> A
```
 
**Use for:** Water cycle, feedback loops, iterative processes, life cycles
 
### Timeline
 
```mermaid
timeline
    title Historical Events
    1800 : Event A
    1850 : Event B
    1900 : Event C
    1950 : Event D
```
 
**Use for:** Historical timelines, project phases, evolution of concepts
 
### Mind Map
 
```mermaid
mindmap
  root((Topic))
    Branch A
      Detail 1
      Detail 2
    Branch B
      Detail 3
      Detail 4
```
 
**Use for:** Brainstorming, topic overviews, concept relationships
 
---
 
## Step 5: ASCII Diagrams (Edge Cases)
 
Use ASCII only for:
- **Overview boxes** with custom text layout
- **Layer/stack diagrams**
- **Comparison layouts**
 
### Overview Box
 
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOPIC TITLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Key Point 1    Key Point 2    Key Point 3                                  │
│      │              │              │                                        │
│  [details]      [details]      [details]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
 
### Layers/Stack
 
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Layer 4 (Top)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 3                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 2                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 1 (Bottom)                               │
└─────────────────────────────────────────────────────────────────────────────┘
```
 
### Box Characters Reference
 
```
Corners: ┌ ┐ └ ┘   Lines: ─ │   T-joints: ├ ┤ ┬ ┴   Arrows: ▶ ▼ ◀ ▲
```
 
---
 
## Step 6: Example-Based Learning Patterns
 
### Pattern 1: Concept → Example → Variation
 
```markdown
## [Concept Name]
 
**Definition:** Brief explanation.
 
**Example:**
[Concrete, real-world scenario]
 
**Variation:**
What if [different condition]? → [Different outcome]
```
 
**Cross-discipline examples:**
 
| Subject | Concept | Example | Variation |
|---------|---------|---------|-----------|
| Biology | Osmosis | Red blood cells in salt water shrink | In pure water? → Cells swell |
| Economics | Supply/Demand | Oil price rises when OPEC cuts production | New oil discovered? → Price falls |
| Physics | Momentum | Bowling ball vs tennis ball at same speed | Same mass, different speed? |
| History | Cause/Effect | Industrial Revolution → urbanization | No steam engine? |
 
### Pattern 2: Problem → Solution → Explanation
 
```markdown
**Problem:** [Specific question]
 
**Solution:**
Step 1: [Action]
Step 2: [Action]
Result: [Answer]
 
**Why it works:** [Underlying principle]
```
 
### Pattern 3: Compare and Contrast
 
| Aspect | Topic A | Topic B |
|--------|---------|---------|
| Feature 1 | ... | ... |
| Feature 2 | ... | ... |
 
**Similarities:** Both...
**Key Difference:** A is... while B is...
 
---
 
## Step 7: Build the Index
 
```markdown
# [Subject Name]
 
Brief description.
 
## Quick Navigation
 
### 📚 Core Concepts
- [[concepts/01-topic|Topic Name]] - Brief description
 
### 🔧 Techniques/Methods
- [[techniques/01-method|Method Name]] - Brief description
 
### 💡 Examples
- [[examples/01-basic|Basic Examples]] - Start here
 
---
 
*Last updated: YYYY-MM-DD*
```
 
---
 
## Quality Checklist
 
- [ ] Every note has at least 1 Mermaid diagram
- [ ] Every concept has at least 1 concrete example
- [ ] Examples use real, relatable scenarios
- [ ] Folder structure is numbered for reading order
- [ ] README links to all notes
- [ ] Wikilinks connect related topics
