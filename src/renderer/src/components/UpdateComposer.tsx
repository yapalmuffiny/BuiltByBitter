import * as React from 'react'
import {
  Upload,
  FileUp,
  X,
  Loader2,
  AlertTriangle,
  Save,
  FilePlus2,
  Info,
  Eye,
  Code2,
  ShieldAlert
} from 'lucide-react'
import type { ChangelogFields, ChangelogTemplate, FilePayload } from '@shared/types'
import { generateChangelogBBCode, defaultChangelogFields } from '@shared/bbcode'
import { cn, fileToBase64, formatBytes } from '@/lib/utils'
import { useUI } from '@/lib/ui-context'
import { useData } from '@/lib/data-context'
import {
  getTemplates,
  saveTemplate,
  postResourceUpdate,
  postAddonUpdate
} from '@/lib/api'
import { cryptoId } from '@shared/bbcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChangelogEditor } from './ChangelogEditor'
import { BBCodePreview } from './BBCodePreview'
import { CoverImage } from './CoverImage'
import { useToast } from '@/components/ui/toast'

export function UpdateComposer(): React.JSX.Element | null {
  const { composer, closeComposer } = useUI()
  const { refresh, connection } = useData()
  const { toast } = useToast()

  const isResource = composer?.kind === 'resource'

  const [file, setFile] = React.useState<File | null>(null)
  const [versionName, setVersionName] = React.useState('')
  const [updateTitle, setUpdateTitle] = React.useState('')
  const [fields, setFields] = React.useState<ChangelogFields>(defaultChangelogFields())
  const [postAnnouncement, setPostAnnouncement] = React.useState(true)
  const [dryRun, setDryRun] = React.useState(true)
  const [previewMode, setPreviewMode] = React.useState<'rendered' | 'raw'>('rendered')
  const [templates, setTemplates] = React.useState<ChangelogTemplate[]>([])
  const [templateId, setTemplateId] = React.useState<string>('')
  const [confirming, setConfirming] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  // Electron's renderer doesn't implement window.prompt(), so template naming
  // is handled by this small in-app dialog instead.
  const [namePrompt, setNamePrompt] = React.useState<string | null>(null)
  const [dropActive, setDropActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset state whenever a new target opens.
  React.useEffect(() => {
    if (!composer) return
    setFile(composer.file ?? null)
    setVersionName('')
    setUpdateTitle('')
    setPostAnnouncement(true)
    setDryRun(true)
    setConfirming(false)
    setSubmitting(false)
    setPreviewMode('rendered')
    ;(async () => {
      try {
        const tpls = await getTemplates()
        setTemplates(tpls)
        if (tpls.length) {
          setTemplateId(tpls[0].id)
          setFields(tpls[0].fields)
        } else {
          setTemplateId('')
          setFields(defaultChangelogFields(connection?.member?.username ?? '', 'Zero Development'))
        }
      } catch {
        setFields(defaultChangelogFields(connection?.member?.username ?? '', 'Zero Development'))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer])

  if (!composer) return null

  const bbcode = generateChangelogBBCode(fields)

  const pickTemplate = (id: string): void => {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t) setFields(t.fields)
  }

  // Persist the current fields as a template. When `asNew` (or nothing is
  // selected yet) we mint a fresh id; otherwise we overwrite the selected one.
  const commitTemplate = async (name: string, asNew: boolean): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = templates.find((t) => t.id === templateId)
    const t: ChangelogTemplate = {
      id: asNew || !existing ? cryptoId() : existing.id,
      name: trimmed,
      fields,
      updatedAt: Date.now()
    }
    try {
      await saveTemplate(t)
      const tpls = await getTemplates()
      setTemplates(tpls)
      setTemplateId(t.id)
      toast({ variant: 'success', title: 'Template saved', description: trimmed })
    } catch (err) {
      toast({ variant: 'error', title: 'Save failed', description: String(err) })
    }
  }

  // "Save" overwrites the selected template silently; if none is selected yet it
  // falls back to naming a new one. "New" always names a new template.
  const onSave = (): void => {
    const existing = templates.find((t) => t.id === templateId)
    if (existing) void commitTemplate(existing.name, false)
    else setNamePrompt('House style')
  }

  const onSaveAsNew = (): void => setNamePrompt('New template')

  const handleFiles = (files: FileList | null): void => {
    const f = files?.[0]
    if (f) setFile(f)
  }

  const canSubmit = Boolean(file && versionName.trim() && !submitting)

  const doSubmit = async (): Promise<void> => {
    if (!file || !versionName.trim()) return
    setSubmitting(true)
    try {
      const payloadFile: FilePayload = {
        name: file.name,
        size: file.size,
        data: await fileToBase64(file)
      }
      if (isResource) {
        // BBB requires a non-empty title for the update/announcement. Fall back
        // to the changelog intro line, then the version name, so a live post
        // never fails with "Please enter a valid title".
        const effectiveTitle =
          updateTitle.trim() || fields.intro.trim() || `v${versionName.trim()}`
        await postResourceUpdate({
          resourceId: composer.resource.resourceId,
          versionName: versionName.trim(),
          file: payloadFile,
          update: { post: postAnnouncement, title: effectiveTitle, message: bbcode },
          dryRun
        })
      } else if (composer.addon) {
        await postAddonUpdate({
          addonId: composer.addon.addonId,
          versionName: versionName.trim(),
          file: payloadFile,
          dryRun
        })
      }
      toast({
        variant: 'success',
        title: dryRun ? 'Dry run saved' : 'Update posted',
        description: dryRun
          ? `v${versionName.trim()} was validated (nothing sent to BBB).`
          : `v${versionName.trim()} is live on BuiltByBit.`
      })
      await refresh()
      closeComposer()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Post failed',
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  const onPrimary = (): void => {
    if (dryRun) return void doSubmit()
    if (!confirming) {
      setConfirming(true)
      return
    }
    void doSubmit()
  }

  const title = isResource
    ? composer.resource.title ?? `Resource #${composer.resource.resourceId}`
    : composer.addon?.title ?? `Addon #${composer.addon?.addonId}`

  const confirmName = (): void => {
    if (!namePrompt?.trim()) return
    void commitTemplate(namePrompt, true)
    setNamePrompt(null)
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && closeComposer()}>
      <DialogContent className={cn('p-0', isResource ? 'max-w-5xl' : 'max-w-lg')}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <CoverImage src={composer.resource.coverImageUrl} className="h-11 w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                {isResource ? 'Post update' : 'Addon version'}
              </span>
            </div>
            <h2 className="truncate text-base font-semibold">{title}</h2>
          </div>
        </div>

        <div className={cn('grid gap-0', isResource ? 'md:grid-cols-[1fr_360px]' : 'grid-cols-1')}>
          {/* Left: form */}
          <div className="flex flex-col gap-5 p-5">
            {/* File */}
            <div
              onDragEnter={(e) => {
                e.preventDefault()
                setDropActive(true)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDropActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDropActive(false)
                handleFiles(e.dataTransfer.files)
              }}
              className={cn(
                'rounded-lg border border-dashed border-border p-4 transition-colors',
                dropActive && 'drop-active'
              )}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  className="flex w-full flex-col items-center gap-1 py-2 text-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Drop your version file or click to browse</span>
                  <span className="text-xs text-muted-foreground">
                    Uploaded to BuiltByBit as the new version file
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Version */}
            <div>
              <Label htmlFor="version">Version name</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">v</span>
                <Input
                  id="version"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="5.0, 5.0-stable…"
                />
              </div>
            </div>

            {isResource ? (
              <>
                {/* Announcement title (required by BBB for the update post) */}
                <div>
                  <Label htmlFor="update-title">Update title</Label>
                  <Input
                    id="update-title"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    placeholder={fields.intro.trim() || 'What this update is about'}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Headline for the Updates-tab post. Blank uses the intro line.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label className="mb-0">Changelog</Label>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 ? (
                      <select
                        value={templateId}
                        onChange={(e) => pickTemplate(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background/60 px-2 text-xs"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={onSave}>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onSaveAsNew}>
                      <FilePlus2 className="h-3.5 w-3.5" />
                      New
                    </Button>
                  </div>
                </div>
                <ChangelogEditor fields={fields} onChange={setFields} />
              </>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                BuiltByBit's API accepts a version file for addons but no changelog message. Only the
                file and version name are sent.
              </div>
            )}
          </div>

          {/* Right: preview (resource only) */}
          {isResource ? (
            <div className="flex flex-col gap-3 border-l border-border bg-background/30 p-5">
              <div className="flex items-center justify-between">
                <Label className="mb-0">Preview</Label>
                <div className="flex rounded-md border border-border p-0.5">
                  <button
                    onClick={() => setPreviewMode('rendered')}
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-1 text-xs',
                      previewMode === 'rendered' ? 'bg-secondary' : 'text-muted-foreground'
                    )}
                  >
                    <Eye className="h-3 w-3" /> Rendered
                  </button>
                  <button
                    onClick={() => setPreviewMode('raw')}
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-1 text-xs',
                      previewMode === 'raw' ? 'bg-secondary' : 'text-muted-foreground'
                    )}
                  >
                    <Code2 className="h-3 w-3" /> BBCode
                  </button>
                </div>
              </div>
              {previewMode === 'rendered' ? (
                <BBCodePreview bbcode={bbcode} />
              ) : (
                <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                  {bbcode || '// empty'}
                </pre>
              )}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-xs">
                  <div className="font-medium">Also post as an announcement</div>
                  <div className="text-muted-foreground">Shows in the resource's Updates tab</div>
                </div>
                <Switch checked={postAnnouncement} onCheckedChange={setPostAnnouncement} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {confirming && !dryRun ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              This publishes <strong>v{versionName.trim()}</strong> live and notifies buyers. This
              can't be undone from here.
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={dryRun}
                onCheckedChange={(v) => {
                  setDryRun(v)
                  setConfirming(false)
                }}
              />
              <span className="flex items-center gap-1.5">
                Dry run
                <span className="text-xs text-muted-foreground">(validate, nothing sent)</span>
              </span>
            </label>
            <div className="flex items-center gap-2">
              {confirming && !dryRun ? (
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                  Cancel
                </Button>
              ) : null}
              <Button
                onClick={onPrimary}
                disabled={!canSubmit}
                variant={!dryRun && confirming ? 'destructive' : 'default'}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !dryRun && confirming ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {dryRun
                  ? 'Save dry run'
                  : confirming
                    ? 'Confirm & post live'
                    : 'Post to live'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Template naming (replaces the unsupported window.prompt) */}
    <Dialog open={namePrompt !== null} onOpenChange={(o) => !o && setNamePrompt(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save changelog template</DialogTitle>
          <DialogDescription>Give this template a name so you can reuse it later.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={namePrompt ?? ''}
          onChange={(e) => setNamePrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmName()
            }
          }}
          placeholder="Template name"
        />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setNamePrompt(null)}>
            Cancel
          </Button>
          <Button onClick={confirmName} disabled={!namePrompt?.trim()}>
            <Save className="h-4 w-4" />
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
