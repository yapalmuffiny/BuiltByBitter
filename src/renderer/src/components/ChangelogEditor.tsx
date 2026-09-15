import * as React from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import type { ChangelogFields, ChangelogSection } from '@shared/types'
import { makeSection, HOUSE_GREEN, HOUSE_BROWN } from '@shared/bbcode'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const PRESET_COLORS = [
  HOUSE_GREEN,
  HOUSE_BROWN,
  'rgb(84, 152, 232)',
  'rgb(226, 80, 80)',
  'rgb(230, 172, 60)',
  'rgb(160, 160, 160)'
]

const SIZES = [4, 5, 6, 7]

function ColorSwatches({
  value,
  onChange
}: {
  value: string
  onChange: (c: string) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={cn(
            'h-5 w-5 rounded-full border transition-transform',
            value === c ? 'scale-110 border-white ring-2 ring-primary/60' : 'border-black/30'
          )}
          title={c}
        />
      ))}
    </div>
  )
}

export function ChangelogEditor({
  fields,
  onChange
}: {
  fields: ChangelogFields
  onChange: (f: ChangelogFields) => void
}): React.JSX.Element {
  const update = (patch: Partial<ChangelogFields>): void => onChange({ ...fields, ...patch })

  const updateSection = (id: string, patch: Partial<ChangelogSection>): void => {
    update({ sections: fields.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  }

  const setItem = (sectionId: string, index: number, value: string): void => {
    const section = fields.sections.find((s) => s.id === sectionId)
    if (!section) return
    const items = [...section.items]
    items[index] = value
    updateSection(sectionId, { items })
  }

  const addItem = (sectionId: string): void => {
    const section = fields.sections.find((s) => s.id === sectionId)
    if (!section) return
    updateSection(sectionId, { items: [...section.items, ''] })
  }

  const removeItem = (sectionId: string, index: number): void => {
    const section = fields.sections.find((s) => s.id === sectionId)
    if (!section) return
    const items = section.items.filter((_, i) => i !== index)
    updateSection(sectionId, { items: items.length ? items : [''] })
  }

  const moveItem = (sectionId: string, index: number, dir: -1 | 1): void => {
    const section = fields.sections.find((s) => s.id === sectionId)
    if (!section) return
    const items = [...section.items]
    const target = index + dir
    if (target < 0 || target >= items.length) return
    ;[items[index], items[target]] = [items[target], items[index]]
    updateSection(sectionId, { items })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor="intro">Intro line</Label>
        <Input
          id="intro"
          value={fields.intro}
          onChange={(e) => update({ intro: e.target.value })}
          placeholder="API Gated Requests are here!"
          className="mt-1.5"
        />
      </div>

      {fields.sections.map((section, si) => (
        <div key={section.id} className="rounded-lg border border-border bg-background/30 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={section.heading}
              onChange={(e) => updateSection(section.id, { heading: e.target.value })}
              placeholder="What's New"
              className="h-8 font-medium"
            />
            <select
              value={section.headingSize}
              onChange={(e) => updateSection(section.id, { headingSize: Number(e.target.value) })}
              className="h-8 rounded-md border border-input bg-background/60 px-2 text-xs"
              title="Heading size"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  Size {s}
                </option>
              ))}
            </select>
            {fields.sections.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() =>
                  update({ sections: fields.sections.filter((s) => s.id !== section.id) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color</span>
            <ColorSwatches
              value={section.headingColor}
              onChange={(c) => updateSection(section.id, { headingColor: c })}
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <Input
                  value={item}
                  onChange={(e) => setItem(section.id, i, e.target.value)}
                  placeholder="Describe what changed…"
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 text-muted-foreground"
                  onClick={() => moveItem(section.id, i, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 text-muted-foreground"
                  onClick={() => moveItem(section.id, i, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 text-muted-foreground hover:text-red-400"
                  onClick={() => removeItem(section.id, i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 self-start text-muted-foreground"
              onClick={() => addItem(section.id)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </Button>
          </div>
          {si === fields.sections.length - 1 ? null : <div className="h-1" />}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => update({ sections: [...fields.sections, makeSection({ heading: 'Fixes' })] })}
      >
        <Plus className="h-3.5 w-3.5" />
        Add section
      </Button>

      <div>
        <Label htmlFor="closing">Closing note</Label>
        <Input
          id="closing"
          value={fields.closing}
          onChange={(e) => update({ closing: e.target.value })}
          placeholder="Plus a handful of small fixes and cleanups across the backend"
          className="mt-1.5"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Color</span>
          <ColorSwatches value={fields.closingColor} onChange={(c) => update({ closingColor: c })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sig-name">Signature name</Label>
          <Input
            id="sig-name"
            value={fields.signatureName}
            onChange={(e) => update({ signatureName: e.target.value })}
            placeholder="Muffiny"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="sig-studio">Studio</Label>
          <Input
            id="sig-studio"
            value={fields.signatureStudio}
            onChange={(e) => update({ signatureStudio: e.target.value })}
            placeholder="Zero Development"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  )
}
