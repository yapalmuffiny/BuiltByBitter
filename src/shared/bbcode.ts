import type { ChangelogFields, ChangelogSection } from './types'

export const HOUSE_GREEN = 'rgb(97, 189, 109)'
export const HOUSE_BROWN = 'rgb(124, 112, 107)'

export function makeSection(partial?: Partial<ChangelogSection>): ChangelogSection {
  return {
    id: partial?.id ?? cryptoId(),
    heading: partial?.heading ?? "What's New",
    headingColor: partial?.headingColor ?? HOUSE_GREEN,
    headingSize: partial?.headingSize ?? 6,
    items: partial?.items ?? ['']
  }
}

export function defaultChangelogFields(signatureName = '', signatureStudio = ''): ChangelogFields {
  return {
    intro: '',
    sections: [makeSection()],
    closing: '',
    closingColor: HOUSE_BROWN,
    signatureName,
    signatureStudio
  }
}

export function cryptoId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? fallbackId()
  } catch {
    return fallbackId()
  }
}

function fallbackId(): string {
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function generateChangelogBBCode(fields: ChangelogFields): string {
  const blocks: string[] = []

  const intro = fields.intro.trim()
  if (intro) blocks.push(intro)

  const sectionBlocks: string[] = []
  for (const section of fields.sections) {
    const items = section.items.map((i) => i.trim()).filter(Boolean)
    if (!section.heading.trim() && items.length === 0) continue
    const lines: string[] = []
    if (section.heading.trim()) {
      lines.push(
        `[COLOR=${section.headingColor}][SIZE=${section.headingSize}]${section.heading.trim()}[/SIZE][/COLOR]`
      )
    }
    if (items.length) {
      lines.push('[LIST]')
      for (const item of items) lines.push(`[*]${item}`)
      lines.push('[/LIST]')
    }
    sectionBlocks.push(lines.join('\n'))
  }
  if (sectionBlocks.length) blocks.push(sectionBlocks.join('\n'))

  const closing = fields.closing.trim()
  if (closing) blocks.push(`[COLOR=${fields.closingColor}]${closing}[/COLOR]`)

  const name = fields.signatureName.trim()
  const studio = fields.signatureStudio.trim()
  if (name || studio) {
    blocks.push(studio ? `- ${name} @ ${studio}` : `- ${name}`)
  }

  return blocks.join('\n\n')
}

const SIZE_PX: Record<number, number> = { 1: 11, 2: 13, 3: 15, 4: 17, 5: 20, 6: 26, 7: 34 }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sanitizeColor(raw: string): string | null {
  const c = raw.trim()
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(c)) return c
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c
  if (/^[a-z]{3,20}$/i.test(c)) return c
  return null
}

function inline(text: string): string {
  let s = text
  s = s.replace(/\[COLOR=([^\]]+)\]([\s\S]*?)\[\/COLOR\]/gi, (_m, c, inner) => {
    const color = sanitizeColor(c)
    return color ? `<span style="color:${color}">${inline(inner)}</span>` : inline(inner)
  })
  s = s.replace(/\[SIZE=(\d+)\]([\s\S]*?)\[\/SIZE\]/gi, (_m, n, inner) => {
    const px = SIZE_PX[Number(n)] ?? 15
    return `<span style="font-size:${px}px;line-height:1.35">${inline(inner)}</span>`
  })
  s = s.replace(/\[B\]([\s\S]*?)\[\/B\]/gi, (_m, i) => `<strong>${inline(i)}</strong>`)
  s = s.replace(/\[I\]([\s\S]*?)\[\/I\]/gi, (_m, i) => `<em>${inline(i)}</em>`)
  s = s.replace(
    /\[U\]([\s\S]*?)\[\/U\]/gi,
    (_m, i) => `<span style="text-decoration:underline">${inline(i)}</span>`
  )
  s = s.replace(
    /\[URL=[^\]]+\]([\s\S]*?)\[\/URL\]/gi,
    (_m, inner) => `<span class="text-bbb underline">${inline(inner)}</span>`
  )
  s = s.replace(
    /\[URL\]([\s\S]*?)\[\/URL\]/gi,
    (_m, inner) => `<span class="text-bbb underline">${inline(inner)}</span>`
  )
  return s
}

export function renderBBCodeToHtml(bbcode: string): string {
  const escaped = escapeHtml(bbcode)
  const lines = escaped.split('\n')
  const out: string[] = []
  let inList = false

  const closeList = (): void => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine
    const trimmed = line.trim()

    if (/^\[LIST(=[^\]]*)?\]$/i.test(trimmed)) {
      if (!inList) {
        out.push('<ul class="my-1 ml-5 list-disc space-y-1">')
        inList = true
      }
      continue
    }
    if (/^\[\/LIST\]$/i.test(trimmed)) {
      closeList()
      continue
    }
    if (inList && /^\[\*\]/.test(trimmed)) {
      out.push(`<li>${inline(trimmed.replace(/^\[\*\]/, ''))}</li>`)
      continue
    }

    if (trimmed === '') {
      closeList()
      out.push('<div style="height:8px"></div>')
      continue
    }

    closeList()
    out.push(`<div>${inline(line)}</div>`)
  }
  closeList()
  return out.join('')
}
