# Hierarchy SIPOC — Mermaid Diagram Templates

Mermaid flowchart templates for generating SIPOC hierarchy diagrams: node shapes, edge styles, color coding, single-level, multi-level decomposition, and variance paths.

---

## Node Shape Reference

Each SIPOC element uses a distinct Mermaid node shape for visual differentiation:

| Element | Shape | Mermaid Syntax | Color |
|---------|-------|---------------|-------|
| Supplier | Parallelogram | `S1[/"Supplier Name"/]` | Blue `#dae8fc` |
| Input | Stadium (rounded) | `I1(["Input Name"])` | Orange `#fff2cc` |
| Process | Rectangle | `P1["Process Step Name"]` | Purple `#e1d5e7` |
| Output | Stadium (rounded) | `O1(["Output Name"])` | Green `#d5e8d4` |
| Customer | Reverse parallelogram | `C1[\"Customer Name"\]` | Pink `#f8cecc` |
| Variance | Rectangle (dashed border) | `V1["Variance: Description"]` | Yellow `#fff3cd` |
| Start/End | Circle | `START(("Start"))` / `END(("End"))` | Gray `#f5f5f5` |

## Edge Style Reference

| Flow Type | Mermaid Syntax | Use Case |
|-----------|---------------|----------|
| Normal flow | `-->` | Standard S→I→P→O→C progression |
| Labeled handoff | `-->\|"handoff label"\|` | Cross-boundary transfers with mechanism noted |
| Decomposition link | `-.->` | Connecting L1 step to L2 subgraph (or L2→L3) |
| Labeled decomposition | `-.->\|"decomposes to"\|` | Explicit decomposition annotation |
| Variance branch | `==>` | Thick arrow from main flow to variance path |
| Labeled variance | `==>\|"trigger condition"\|` | Thick arrow with trigger label |
| Variance rejoin | `-.->` | Dotted arrow from variance back to main flow |
| Labeled rejoin | `-.->\|"rejoins at"\|` | Dotted arrow with rejoin annotation |

## Style Definitions

Apply these styles at the end of every generated Mermaid diagram:

```mermaid
%% Standard SIPOC styles
classDef supplier fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#333
classDef input fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#333
classDef process fill:#e1d5e7,stroke:#9673a6,stroke-width:2px,color:#333
classDef output fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#333
classDef customer fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#333
classDef variance fill:#fff3cd,stroke:#c9a227,stroke-width:2px,stroke-dasharray:5 5,color:#333
classDef startend fill:#f5f5f5,stroke:#666,stroke-width:2px,color:#333
```

Apply classes to nodes after defining the graph:

```mermaid
class S1,S2 supplier
class I1,I2 input
class P1,P2 process
class O1,O2 output
class C1,C2 customer
class V1,V2 variance
```

---

## Template 1: Single-Level SIPOC Flow

A single process decomposed into its SIPOC elements in one horizontal flow.

```mermaid
flowchart LR
    %% Suppliers
    S1[/"Supplier A"/]
    S2[/"Supplier B"/]

    %% Inputs
    I1(["Input 1"])
    I2(["Input 2"])

    %% Process
    P1["1. Process Step One"]
    P2["2. Process Step Two"]
    P3["3. Process Step Three"]

    %% Outputs
    O1(["Output 1"])
    O2(["Output 2"])

    %% Customers
    C1[\"Customer A"\]
    C2[\"Customer B"\]

    %% Flow
    S1 --> I1
    S2 --> I2
    I1 --> P1
    I2 --> P1
    P1 -->|"handoff: email"| P2
    P2 -->|"handoff: API"| P3
    P3 --> O1
    P3 --> O2
    O1 --> C1
    O2 --> C2

    %% Styles
    classDef supplier fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#333
    classDef input fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#333
    classDef process fill:#e1d5e7,stroke:#9673a6,stroke-width:2px,color:#333
    classDef output fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#333
    classDef customer fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#333

    class S1,S2 supplier
    class I1,I2 input
    class P1,P2,P3 process
    class O1,O2 output
    class C1,C2 customer
```

---

## Template 2: Multi-Level Hierarchy SIPOC

Process decomposed across L1 (end-to-end), L2 (sub-processes), and L3 (tasks). Each level is a subgraph. Decomposition links connect levels.

```mermaid
flowchart TB
    %% ===== L1: End-to-End Process =====
    subgraph L1["L1: End-to-End Process Name"]
        direction LR
        L1_S1[/"Supplier"/]
        L1_I1(["Input"])
        L1_P1["Main Process"]
        L1_O1(["Output"])
        L1_C1[\"Customer"\]

        L1_S1 --> L1_I1
        L1_I1 --> L1_P1
        L1_P1 --> L1_O1
        L1_O1 --> L1_C1
    end

    %% ===== L2: Sub-Processes =====
    subgraph L2["L2: Sub-Processes"]
        direction LR

        subgraph L2A["2.1 Sub-Process A"]
            direction LR
            L2A_S[/"Supplier A"/]
            L2A_I(["Input A"])
            L2A_P["Sub-Process A"]
            L2A_O(["Output A"])
            L2A_C[\"Customer A"\]

            L2A_S --> L2A_I --> L2A_P --> L2A_O --> L2A_C
        end

        subgraph L2B["2.2 Sub-Process B"]
            direction LR
            L2B_S[/"Supplier B"/]
            L2B_I(["Input B"])
            L2B_P["Sub-Process B"]
            L2B_O(["Output B"])
            L2B_C[\"Customer B"\]

            L2B_S --> L2B_I --> L2B_P --> L2B_O --> L2B_C
        end

        L2A_C -.->|"feeds into"| L2B_S
    end

    %% ===== L3: Tasks =====
    subgraph L3["L3: Task-Level Detail"]
        direction LR

        subgraph L3A["3.1 Task A1"]
            direction LR
            L3A_S[/"Supplier"/]
            L3A_I(["Input"])
            L3A_P["Task A1"]
            L3A_O(["Output"])
            L3A_C[\"Customer"\]

            L3A_S --> L3A_I --> L3A_P --> L3A_O --> L3A_C
        end

        subgraph L3B["3.2 Task A2"]
            direction LR
            L3B_S[/"Supplier"/]
            L3B_I(["Input"])
            L3B_P["Task A2"]
            L3B_O(["Output"])
            L3B_C[\"Customer"\]

            L3B_S --> L3B_I --> L3B_P --> L3B_O --> L3B_C
        end
    end

    %% ===== Decomposition Links =====
    L1_P1 -.->|"decomposes to"| L2A
    L1_P1 -.->|"decomposes to"| L2B
    L2A_P -.->|"decomposes to"| L3A
    L2A_P -.->|"decomposes to"| L3B

    %% Styles
    classDef supplier fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#333
    classDef input fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#333
    classDef process fill:#e1d5e7,stroke:#9673a6,stroke-width:2px,color:#333
    classDef output fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#333
    classDef customer fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#333

    class L1_S1,L2A_S,L2B_S,L3A_S,L3B_S supplier
    class L1_I1,L2A_I,L2B_I,L3A_I,L3B_I input
    class L1_P1,L2A_P,L2B_P,L3A_P,L3B_P process
    class L1_O1,L2A_O,L2B_O,L3A_O,L3B_O output
    class L1_C1,L2A_C,L2B_C,L3A_C,L3B_C customer
```

---

## Template 3: Variance Path

Variance branches off from a main flow step, handled in a yellow-dashed subgraph, and either rejoins or terminates.

```mermaid
flowchart TB
    %% Main Flow
    P1["1. Receive Request"]
    P2["2. Validate Data"]
    P3["3. Process Request"]
    P4["4. Deliver Output"]

    P1 --> P2
    P2 --> P3
    P3 --> P4

    %% Variance: Validation Failure
    subgraph VAR1["Variance: Validation Failure"]
        direction LR
        V1_S[/"Validation Engine"/]
        V1_I(["Failed Record + Error Details"])
        V1_P["Review & Correct Data"]
        V1_O(["Corrected Record"])
        V1_C[\"Data Entry Team"\]

        V1_S --> V1_I --> V1_P --> V1_O --> V1_C
    end

    %% Variance branching and rejoin
    P2 ==>|"validation fails"| VAR1
    VAR1 -.->|"rejoins at"| P2

    %% Variance: Escalation
    subgraph VAR2["Variance: High-Value Escalation"]
        direction LR
        V2_S[/"Processing Engine"/]
        V2_I(["High-Value Request"])
        V2_P["Senior Review & Approve"]
        V2_O(["Approved Request"])
        V2_C[\"Processing Team"\]

        V2_S --> V2_I --> V2_P --> V2_O --> V2_C
    end

    P3 ==>|"value > threshold"| VAR2
    VAR2 -.->|"rejoins at"| P4

    %% Styles
    classDef process fill:#e1d5e7,stroke:#9673a6,stroke-width:2px,color:#333
    classDef supplier fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#333
    classDef input fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#333
    classDef output fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#333
    classDef customer fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#333
    classDef variance fill:#fff3cd,stroke:#c9a227,stroke-width:2px,stroke-dasharray:5 5,color:#333

    class P1,P2,P3,P4 process
    class V1_S,V2_S supplier
    class V1_I,V2_I input
    class V1_P,V2_P variance
    class V1_O,V2_O output
    class V1_C,V2_C customer
```

---

## Template 4: Combined Hierarchy + Variance

Full template combining multi-level decomposition with variance paths. Use this as the starting pattern for complex SIPOC diagrams.

```mermaid
flowchart TB
    %% ===== L1 =====
    subgraph L1["L1: End-to-End Process"]
        direction LR
        L1_S[/"Primary Supplier"/]
        L1_I(["Primary Input"])
        L1_P["End-to-End Process Name"]
        L1_O(["Final Output"])
        L1_C[\"Primary Customer"\]

        L1_S --> L1_I --> L1_P --> L1_O --> L1_C
    end

    %% ===== L2 =====
    subgraph L2["L2: Sub-Processes"]
        direction TB

        subgraph L2A["2.1 First Sub-Process"]
            direction LR
            L2A_S[/"Supplier"/] --> L2A_I(["Input"]) --> L2A_P["Sub-Process 1"] --> L2A_O(["Output"]) --> L2A_C[\"Next Step"\]
        end

        subgraph L2B["2.2 Second Sub-Process"]
            direction LR
            L2B_S[/"Supplier"/] --> L2B_I(["Input"]) --> L2B_P["Sub-Process 2"] --> L2B_O(["Output"]) --> L2B_C[\"Customer"\]
        end

        L2A_C -.->|"feeds"| L2B_S
    end

    %% ===== Variance =====
    subgraph VAR["Variance: Exception Path"]
        direction LR
        V_S[/"Error Source"/] --> V_I(["Error Details"]) --> V_P["Handle Exception"] --> V_O(["Resolution"]) --> V_C[\"Escalation Team"\]
    end

    %% ===== Connections =====
    L1_P -.->|"decomposes to"| L2A
    L1_P -.->|"decomposes to"| L2B
    L2A_P ==>|"error condition"| VAR
    VAR -.->|"rejoins at"| L2B_S

    %% Styles
    classDef supplier fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px,color:#333
    classDef input fill:#fff2cc,stroke:#d6b656,stroke-width:2px,color:#333
    classDef process fill:#e1d5e7,stroke:#9673a6,stroke-width:2px,color:#333
    classDef output fill:#d5e8d4,stroke:#82b366,stroke-width:2px,color:#333
    classDef customer fill:#f8cecc,stroke:#b85450,stroke-width:2px,color:#333
    classDef variance fill:#fff3cd,stroke:#c9a227,stroke-width:2px,stroke-dasharray:5 5,color:#333

    class L1_S,L2A_S,L2B_S,V_S supplier
    class L1_I,L2A_I,L2B_I,V_I input
    class L1_P,L2A_P,L2B_P process
    class L1_O,L2A_O,L2B_O,V_O output
    class L1_C,L2A_C,L2B_C,V_C customer
    class V_P variance
```

---

## Node Naming Conventions

Consistent node ID prefixes prevent collisions across levels and variances:

| Scope | Prefix Pattern | Example |
|-------|---------------|---------|
| L1 elements | `L1_{element}` | `L1_S1`, `L1_P1`, `L1_O1` |
| L2 sub-process N | `L2{letter}_{element}` | `L2A_S`, `L2A_P`, `L2B_I` |
| L3 task N | `L3{letter}_{element}` | `L3A_P`, `L3B_O` |
| Variance N | `V{number}_{element}` | `V1_S`, `V1_P`, `V2_O` |
| Start/End | `START`, `END` | `START(("Start"))` |

Where `{element}` is one of: `S` (Supplier), `I` (Input), `P` (Process), `O` (Output), `C` (Customer).

When a level has multiple suppliers, inputs, outputs, or customers, append a number: `L2A_S1`, `L2A_S2`.

---

## Diagram Splitting Rules

If a diagram exceeds **30 nodes**, split into separate diagrams:

1. **Level split**: One diagram per hierarchy level (L1, L2, L3)
2. **Variance split**: Main flow in one diagram, each complex variance in its own
3. **Cross-reference**: Add a comment node linking to the other diagram: `NOTE["See: L2 Diagram"]`

When splitting, repeat the connecting node in both diagrams so the reader can follow the link.

---

## Subgraph Styling Notes

Mermaid subgraph visual differentiation:

- **L1 subgraph**: Default style (no special styling needed)
- **L2 subgraph**: Default style, nested within L1's scope
- **L3 subgraph**: Default style, nested within L2's scope
- **Variance subgraph**: Label prefixed with "Variance:" for clarity

Subgraph titles should follow the pattern: `"{level_number}: {descriptive_name}"` (e.g., `"2.1 Validate Change Request"`, `"Variance: Missing Data"`).
