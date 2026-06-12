/**
 * DraftPolicyRenderer — minimal markdown → React renderer for auto-generated legal drafts.
 *
 * Handles only the constructs produced by auto-policy.ts:
 *   # / ## / ###  headings
 *   > blockquote lines
 *   | table rows |
 *   - list items / * list items
 *   **bold** inline
 *   [text](url) links
 *   blank lines → paragraph breaks
 *
 * No external dependency. Not a general-purpose parser.
 */

import React from 'react'

interface Props {
  markdown: string
  className?: string
}

// ── Inline parser (bold + links) ─────────────────────────────────────────────

function parseInline(text: string, key: React.Key): React.ReactNode {
  // Split on **bold** and [text](url)
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          return (
            <a key={i} href={linkMatch[2]} className="underline text-primary" target="_blank" rel="noopener noreferrer">
              {linkMatch[1]}
            </a>
          )
        }
        return part
      })}
    </React.Fragment>
  )
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTableBlock(lines: string[]): React.ReactNode {
  const dataLines = lines.filter(l => !/^\s*\|[-| ]+\|\s*$/.test(l))
  const rows = dataLines.map(l =>
    l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  )
  if (rows.length === 0) return null
  const [head, ...body] = rows
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40">
            {head.map((cell, i) => (
              <th key={i} className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                {parseInline(cell, i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border px-3 py-2 text-foreground/80">
                  {parseInline(cell, ci)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function DraftPolicyRenderer({ markdown, className }: Props) {
  const lines = markdown.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={key++} className="text-lg font-semibold text-foreground mt-6 mb-2">
          {parseInline(line.slice(4), key)}
        </h3>
      )
      i++
      continue
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-xl font-bold text-foreground mt-8 mb-3 border-b border-border pb-1">
          {parseInline(line.slice(3), key)}
        </h2>
      )
      i++
      continue
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={key++} className="text-2xl font-bold text-foreground mt-6 mb-4">
          {parseInline(line.slice(2), key)}
        </h1>
      )
      i++
      continue
    }

    // Blockquote (> lines) — rendered as amber notice box
    if (line.startsWith('> ')) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2))
        i++
      }
      nodes.push(
        <blockquote key={key++} className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 rounded-r my-4 text-sm text-foreground/80">
          {bqLines.map((bl, bi) => (
            <p key={bi} className={bi > 0 ? 'mt-1' : ''}>{parseInline(bl, bi)}</p>
          ))}
        </blockquote>
      )
      continue
    }

    // Horizontal rule
    if (line.trim() === '---') {
      nodes.push(<hr key={key++} className="border-border my-6" />)
      i++
      continue
    }

    // Table — collect contiguous | lines
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      nodes.push(<React.Fragment key={key++}>{parseTableBlock(tableLines)}</React.Fragment>)
      continue
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      nodes.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-3 text-foreground/80">
          {listItems.map((item, li) => (
            <li key={li}>{parseInline(item, li)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — collect until blank line or block element
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('|') &&
      !lines[i].match(/^[-*] /) &&
      lines[i].trim() !== '---'
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      nodes.push(
        <p key={key++} className="text-foreground/80 leading-relaxed mb-3">
          {parseInline(paraLines.join(' '), key)}
        </p>
      )
    }
  }

  return (
    <div className={className ?? 'prose-draft'}>
      {nodes}
    </div>
  )
}
