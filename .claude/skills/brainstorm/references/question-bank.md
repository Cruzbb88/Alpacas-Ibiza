# Brainstorm Question Bank

10 question categories for adaptive follow-up during Layer 1 (Capture & Clarify). The skill selects questions from uncovered categories based on what's missing from the brain dump.

## Categories

### 1. Scope
**Purpose:** Bound the idea — is this one thing or many?
- "Is this one tool or a system of tools?"
- "What's the boundary? Where does this start and stop?"
- "How would you describe this in one sentence to someone who's never seen it?"

### 2. Users
**Purpose:** Identify who benefits and who interacts.
- "Who uses this? Just you, or clients too?"
- "Are there different user types with different needs?"
- "Who would be upset if this didn't exist?"

### 3. Triggers
**Purpose:** Understand when this is needed.
- "What event makes you reach for this?"
- "How often does this need happen — daily, weekly, on-demand?"
- "What are you doing right before you'd use this?"

### 4. Outputs
**Purpose:** Define what the end result looks like.
- "What does the end result look like? A file, a report, a notification?"
- "What format does the output need to be in?"
- "Who consumes the output and what do they do with it?"

### 5. Integration
**Purpose:** Map connection points to existing systems.
- "Does this connect to existing skills, tools, or APIs?"
- "What data sources does it need access to?"
- "Are there existing workflows this should plug into?"

### 6. Edge Cases
**Purpose:** Surface boundary conditions and failure modes.
- "What happens when the input is bad or missing?"
- "What's the worst-case scenario if this breaks?"
- "Are there inputs that would be tricky or ambiguous?"

### 7. Priority
**Purpose:** Identify what matters most for MVP.
- "If you could only build one piece, which would it be?"
- "What's the 80/20 — the 20% that delivers 80% of the value?"
- "What's blocking you right now that this would unblock?"

### 8. Anti-Goals
**Purpose:** Explicitly exclude what this should NOT do.
- "What should this explicitly NOT do?"
- "Are there similar tools that over-engineer this? What would you strip away?"
- "What features would make this worse, not better?"

### 9. Existing Art
**Purpose:** Leverage prior solutions and avoid reinvention.
- "Is there something that does 80% of this already?"
- "What have you tried before? What worked and what didn't?"
- "Are there tools or patterns you've seen that inspired this?"

### 10. Scale
**Purpose:** Calibrate scope of impact.
- "One project? All projects? Cross-client?"
- "Does this need to work for 1 user or many?"
- "How much data/volume are we talking about?"

## Selection Algorithm

After parsing the user's brain dump, classify each category as:
- **Covered**: The dump explicitly addresses this (e.g., mentions "all projects" → Scale covered)
- **Partially covered**: Some signal but incomplete
- **Uncovered**: No relevant information

Question count formula:
| Categories Covered | Questions to Ask |
|-------------------|-----------------|
| 7-10 (clear dump) | 1-2 from uncovered |
| 4-6 (moderate) | 3-5 from uncovered |
| 0-3 (vague) | 6-10 from uncovered |

Priority order: Scope → Users → Triggers → Outputs → Priority → Integration → Anti-Goals → Edge Cases → Existing Art → Scale
