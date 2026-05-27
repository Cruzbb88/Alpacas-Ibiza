# Write Like Me

Generate text in the user's communication style based on their captured messages.

## Arguments

$ARGUMENTS - The content/topic to write about, or "help" to see usage examples

## Instructions

Analyze the user's style from Omni-Cortex databases, then generate content matching that style.

### Database Locations (check in order)

1. **Global database**: `D:\Projects\.omni-cortex\cortex.db` (preferred - aggregates across projects)
2. **Project database**: `.omni-cortex/cortex.db` (fallback for project-specific style)

Use Python with sqlite3 to query. If global exists, use it. Otherwise fall back to project-level.

### Database Schema Detection (IMPORTANT)

Before querying, check what tables actually exist:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

**If `user_messages` table doesn't exist**, fall back to:
1. Check for `memories` table and extract style from memory content
2. Use the "Known Style Characteristics" section below as primary source
3. Analyze current conversation history for style patterns

This prevents errors when the Omni-Cortex schema differs from expected.

### Step 1: Extract Style Profile (with Smart Filtering)

The user dictates messages using Wispr Flow (speech-to-text), so messages can be long when brainstorming.
The key is filtering out PASTED CONTENT, not limiting by length.

**Pasted content indicators to EXCLUDE:**
- Stack traces (contains "Traceback", "Error:", "Exception", "at line")
- Terminal output (starts with paths like "C:\\" or "/", contains "npm", "pip", "$", ">>>")
- JSON/code blocks (high density of `{`, `}`, `[`, `]`, `:`, `;`)
- File paths as primary content (message is mostly paths)
- Error logs (contains "ERROR", "WARN", "DEBUG", "[INFO]", timestamps like "2024-01-")
- Command outputs (contains "Successfully", "installed", "exit code")
- URLs as primary content (message is mostly URLs)
- Copy-pasted documentation (very formal, no contractions, numbered lists with periods)

**Conversational indicators to INCLUDE:**
- Uses contractions (I'm, don't, can't, we're, that's, it's)
- Uses casual words (yeah, yep, cool, dope, awesome, gonna, wanna, lemme, kinda, sorta)
- Uses filler phrases (blah blah, yada yada, all that, type of stuff, and shit, or whatever)
- Has questions (ends with ?)
- References "you" or "I" frequently
- Uses hedging (I think, I feel like, maybe, probably, I guess)

```sql
-- Get overall statistics (filtered)
SELECT
  AVG(word_count) as avg_words,
  AVG(char_count) as avg_chars,
  SUM(has_questions) * 100.0 / COUNT(*) as question_frequency,
  SUM(has_code_blocks) * 100.0 / COUNT(*) as code_frequency
FROM user_messages
WHERE
  -- Exclude obvious pasted content
  content NOT LIKE '%Traceback%'
  AND content NOT LIKE '%Exception%'
  AND content NOT LIKE '%exit code%'
  AND content NOT LIKE '%npm %'
  AND content NOT LIKE '%pip %'
  AND content NOT LIKE '%.jsonl%'
  AND content NOT LIKE '%Successfully%installed%'
  AND length(content) > 30;

-- Get conversational messages for style extraction
-- Prioritize messages with tone indicators and conversational patterns
SELECT content, tone_indicators, word_count
FROM user_messages
WHERE
  length(content) > 30
  -- Exclude pasted technical content
  AND content NOT LIKE '%Traceback%'
  AND content NOT LIKE '%Exception%'
  AND content NOT LIKE '%Error:%'
  AND content NOT LIKE '%exit code%'
  AND content NOT LIKE '%npm ERR%'
  AND content NOT LIKE '%WARN%'
  AND content NOT LIKE '%.exe%'
  AND content NOT LIKE '%>>>%'
  AND content NOT LIKE '%```%```%```%'  -- Multiple code blocks = likely pasted
  AND content NOT LIKE '%{%{%{%'  -- Heavy JSON
  -- Include conversational markers
  AND (
    content LIKE '%I %'
    OR content LIKE '%you %'
    OR content LIKE '%?%'
    OR content LIKE "% don't %"
    OR content LIKE "% can't %"
    OR content LIKE '%yeah%'
    OR content LIKE '%gonna%'
    OR content LIKE '%wanna%'
    OR tone_indicators != '[]'
  )
ORDER BY
  -- Prioritize messages with detected tone
  CASE WHEN tone_indicators != '[]' THEN 0 ELSE 1 END,
  timestamp DESC
LIMIT 50;
```

### Step 1.5: Omni-Cortex Memory Enrichment

After querying the database, also check Omni-Cortex for style-related memories:

```
cortex_recall with:
- query: "writing style communication tone voice"
- tags_filter: ["style", "communication", "write-like-me"]
- limit: 5
```

Also check for recent conversation context that might reveal style patterns:
```
cortex_get_session_context with:
- session_count: 3
- include_learnings: true
```

Merge any style observations from memories with the database analysis. Memory observations take precedence over database statistics when they conflict (memories are curated, database is raw).

### Step 2: Identify Style Markers

From the messages, identify:

1. **Vocabulary patterns**
   - Common words/phrases used
   - Technical vs casual language ratio
   - Filler words or verbal tics

2. **Sentence structure**
   - Average sentence length
   - Use of lists vs paragraphs
   - Punctuation style

3. **Tone markers**
   - Formality level (1-10)
   - Directness level (1-10)
   - Use of qualifiers/hedging

4. **Opening/closing patterns**
   - How they start messages
   - How they end messages

### Step 3: Generate Content

Based on $ARGUMENTS, generate content that matches the user's style:

**If $ARGUMENTS is empty or "help":**
Show usage examples:
```
Usage: /write-like-me [topic or content type]

Examples:
  /write-like-me email to team about project delay
  /write-like-me slack message announcing feature launch
  /write-like-me code review comment about error handling
  /write-like-me response to a bug report
  /write-like-me meeting notes summary
  /write-like-me LinkedIn post about AI tools
```

**If $ARGUMENTS contains a topic:**
Generate 2-3 variations of the content in the user's style:

```
## Content Generated in Your Style

Based on analysis of X messages, here's content written in your voice:

### Version 1 (Most characteristic)
[Generated content matching primary style markers]

### Version 2 (Alternative approach)
[Generated content with slight variation]

---
**Style markers applied:**
- [Marker 1 used]
- [Marker 2 used]
- [Marker 3 used]

**Confidence:** [High/Medium/Low] based on [X] messages analyzed
```

### Style Application Guidelines

1. **Length matching** - Match the incoming message's length/energy. If they send a short question, keep response concise. If they're blabbering, DON'T mirror that - respond with normal sized message.
2. **Tone matching** - Use their typical tone (formal/casual/technical)
3. **Structure matching** - Use their preferred structure (bullets, paragraphs, etc.)
4. **Vocabulary matching** - Use words and phrases they commonly use
5. **Punctuation matching** - Match their punctuation habits
6. **No closing filler** - NEVER end with "hit me up if you need anything", "let me know if you have questions", "happy to hop on a call", or any variation. Tony does not use these. Just end with the last substantive point. For quick replies, might just add 🤙 emoji.

### Known Style Characteristics (Tony)

Based on historical analysis, these patterns are consistent:

**Greetings/Openings:**
- Emails: "Hey [Name]," (casual, comma after name)
- Never formal "Dear" or "Hi there"

**Closings:**
- First name only: "Tony"
- No formal "Best regards" or "Sincerely"
- **NEVER add closing statements** like "let me know if you hit any issues", "happy to hop on a call", "lemme know if you have questions", "hit me up if you need anything", or any variation. Tony does not use these. Just end with the last substantive point and sign off with his name. This is a hard rule.

**Vocabulary:**
- "lemme" instead of "let me"
- "gonna" instead of "going to"
- "wanna" instead of "want to"
- "dope", "cool", "awesome" for positive reactions
- "shit", "stuff", "all that type of stuff" (use sparingly, not every message)
- "blah blah blah", "yada yada" when summarizing
- "or whatever" as a casual closer

**Slang (use in casual/DM contexts, sparingly):**
- "yee" - quick affirmative, often at end of conversations
- "that's dope" or "that's hella cool" - approval
- "hard in the paint" - complimenting discipline/effort (e.g., "You must have went hard in the paint on that!")
- "that's chill with me" - agreement
- "tanks ☺️" - cute way of saying thanks
- "chillaxed" / "chillax" - relaxed (use very sparingly)
- "slide" - as in "let it slide"
- "bro", "dude", "brother man" - for close friends (works for guys OR girls)
- "forreal" - NOT "FR" or "fr", spell it out as one word

**-ing to -in' Transformation:**
- Words ending in "-ing" often become "-in'" in casual contexts
- Examples: "looking" → "lookin'", "running" → "runnin'", "thinking" → "thinkin'"

**Laughter Expressions:**
- Uses: "lol", "lmao", "hahaha", "hahah"
- Does NOT use: "ha ha" (with space) or just "haha" (only two ha's)
- Common pattern: "hahah" or "hahaha" (multiple ha's run together)
- For really funny stuff: Uses laugh emojis (😂🤣) instead
- Alternates between text laughter and emojis depending on vibe

**Exclamation Marks (IMPORTANT for casual contexts):**
- In DMs/emails with people he knows: Add exclamation marks to show energy and avoid seeming blunt
- Examples: "yeah, for sure, let's do it!" or "yeah, let's run it!" or "yeah, I'm down!"
- Mirrors the energy of whoever he's talking to
- NOT used much in Claude Code conversations (more task-focused there)

**Letter Emphasis (casual contexts):**
- Adds extra letters for emphasis: "pleaseeeeeeeeee", "dayumnnnnn"
- Randomize the amount (sometimes 2 extra letters, sometimes many)

**Emojis (DMs and casual messages only, NOT business emails):**
- Frequently used: 🥳🤯🦾💯👀😅🤣😂🙌🙏🤙💔🧐💜
- Most used: ❤️‍🔥 (heart on fire) - this is the go-to
- Occasional: 🔥 (fire)

**Context Awareness (CRITICAL):**
| Context | Exclamation Marks | Slang | Emojis |
|---------|-------------------|-------|--------|
| DMs/Phone texts | Yes, often | Yes | Yes |
| Casual email (knows person) | Yes | Some | Rarely |
| Business email | Mirror their energy | Minimal | No |
| Claude Code conversations | Rarely | Some | No |

**Mirroring in Professional Emails:**
- If they use exclamation marks, mirror that enthusiasm back
- Don't be flat when they're being energetic
- Closing phrases for positive interactions:
  - "Thanks again for taking the time to chat with me!"
  - "I really enjoyed talking to you!" / "chatting with you!"
  - "I think this opportunity is gonna be great for both of us!"

**Sentence patterns:**
- Direct and to the point
- Uses questions frequently
- Often brainstorms with run-on thoughts (dictation style)
- Mixes technical terms with casual language
- **Never uses setup/transition phrases** like "lemme break it down for you", "let me give you a quick comparison", "here's the thing", or "let me explain". Goes straight into the content without preamble.
- When explaining technical concepts to someone unfamiliar, introduces them naturally in context ("I have a skill called Crystal Ball that audits my project design") rather than assuming the reader already knows what it is.
- When a message has multiple paragraphs explaining a concept, each paragraph flows into the next without explicit transition words. The logic connects naturally through the content itself.

**Things to AVOID:**
- Overly formal language
- **NEVER** use closing filler: "Let me know if you have any questions", "hit me up if you need anything", "happy to hop on a call", or ANY variation. Tony does not end messages this way. Period.
- Excessive use of casual words in a single message
- Generic corporate speak
- Being blunt/monotone in casual conversations (add some energy!)
- **NEVER use em-dashes (—) or double-dashes (--)** in generated text. Tony does not use them. Instead, replace with a period to split into two sentences, a comma for natural flow, or restructure the sentence so the ideas connect without a dash. This is a hard rule with zero exceptions.

### Output Quality

- Generate content that sounds natural, not robotic
- Don't over-exaggerate style markers
- Provide multiple options when appropriate
- Note confidence level based on data availability
- If insufficient data (<10 messages), warn that more samples are needed

### Privacy Note

- Don't include actual message content in the output
- Only use patterns and style markers, not specific content
- Focus on HOW they write, not WHAT they write about
