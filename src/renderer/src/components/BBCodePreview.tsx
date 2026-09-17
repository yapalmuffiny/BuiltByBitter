import * as React from 'react'
import { renderBBCodeToHtml } from '@shared/bbcode'

export function BBCodePreview({ bbcode }: { bbcode: string }): React.JSX.Element {
  const html = React.useMemo(() => renderBBCodeToHtml(bbcode), [bbcode])

  if (!bbcode.trim()) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Your changelog preview will appear here.
      </div>
    )
  }

  return (
    <div
      className="prose-preview rounded-lg border border-border bg-background/40 p-4 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
