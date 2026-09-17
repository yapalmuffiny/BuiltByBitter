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
  ShieldAlert,
  Puzzle,
  Package
} from 'lucide-react'
import type { BBBAddon, ChangelogFields, ChangelogTemplate, FilePayload } from '@shared/types'
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
import { Badge } from '@/components/ui/badge'
import { ChangelogEditor } from './ChangelogEditor'
import { BBCodePreview } from './BBCodePreview'
import { CoverImage } from './CoverImage'
import { useToast } from '@/components/ui/toast'

function isFileAddon(addon: BBBAddon): boolean {
  return (addon.type ?? '').trim().toLowerCase() === 'extra'
}

export function UpdateComposer(): React.JSX.Element | null {
  const { composer, closeComposer } = useUI()
  const { refresh, connection, addonsForResource } = useData()
  const { toast } = useToast()

  const isResource = composer?.kind === 'resource'
  const availableAddons = React.useMemo(() => {
    if (!composer?.resource) return []
    return addonsForResource(composer.resource.resourceId).filter(isFileAddon)
  }, [composer?.resource, addonsForResource])

  const [file, setFile] = React.useState<File | null>(null)
  const [addonFiles, setAddonFiles] = React.useState<Record<number, File>>({})
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
  const [submittingStatus, setSubmittingStatus] = React.useState<string | null>(null)
  const [namePrompt, setNamePrompt] = React.useState<string | null>(null)
  const [dropActive, setDropActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const addonFileInputRefs = React.useRef<Record<number, HTMLInputElement | null>>({})

  React.useEffect(() => {
    if (!composer) return
    setFile(composer.file ?? null)
    setAddonFiles(composer.initialAddonFiles ?? (composer.addon && composer.file ? { [composer.addon.addonId]: composer.file } : {}))
    setVersionName('')
    setUpdateTitle('')
    setPostAnnouncement(true)
    setDryRun(true)
    setConfirming(false)
    setSubmitting(false)
    setSubmittingStatus(null)
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
  }, [composer, connection?.member?.username])

  if (!composer) return null

  const stagedAddonIds = Object.keys(addonFiles).map(Number).filter((id) => Boolean(addonFiles[id]))
  const stagedAddonsCount = stagedAddonIds.length
  const hasUpdatesToPost = Boolean(file || stagedAddonsCount > 0)
  const canSubmit = Boolean(hasUpdatesToPost && versionName.trim() && !submitting)

  const bbcode = generateChangelogBBCode(fields)

  const pickTemplate = (id: string): void => {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t) setFields(t.fields)
  }

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

  const onSave = (): void => {
    const existing = templates.find((t) => t.id === templateId)
    if (existing) void commitTemplate(existing.name, false)
    else setNamePrompt('House style')
  }

  const onSaveAsNew = (): void => setNamePrompt('New template')

  const handleResourceFiles = (files: FileList | null): void => {
    const f = files?.[0]
    if (f) setFile(f)
  }

  const handleAddonFile = (addonId: number, selectedFile: File | null): void => {
    setAddonFiles((prev) => {
      const copy = { ...prev }
      if (selectedFile) {
        copy[addonId] = selectedFile
      } else {
        delete copy[addonId]
      }
      return copy
    })
  }

  const doSubmit = async (): Promise<void> => {
    if (!hasUpdatesToPost || !versionName.trim()) return
    setSubmitting(true)

    try {
      if (isResource && file) {
        setSubmittingStatus(`Publishing ${composer.resource.title ?? 'main resource'}…`)
        const payloadFile: FilePayload = {
          name: file.name,
          size: file.size,
          data: await fileToBase64(file)
        }
        const effectiveTitle =
          updateTitle.trim() || fields.intro.trim() || `v${versionName.trim()}`
        await postResourceUpdate({
          resourceId: composer.resource.resourceId,
          versionName: versionName.trim(),
          file: payloadFile,
          update: { post: postAnnouncement, title: effectiveTitle, message: bbcode },
          dryRun
        })
      }

      for (let i = 0; i < stagedAddonIds.length; i++) {
        const addonId = stagedAddonIds[i]
        const aFile = addonFiles[addonId]
        if (!aFile) continue
        const addonInfo = availableAddons.find((a) => a.addonId === addonId)
        setSubmittingStatus(`Publishing addon (${i + 1}/${stagedAddonIds.length}): ${addonInfo?.title ?? `Addon #${addonId}`}…`)
        const payloadFile: FilePayload = {
          name: aFile.name,
          size: aFile.size,
          data: await fileToBase64(aFile)
        }
        await postAddonUpdate({
          addonId,
          versionName: versionName.trim(),
          file: payloadFile,
          dryRun
        })
      }

      if (!isResource && composer.addon && file) {
        setSubmittingStatus(`Publishing addon ${composer.addon.title ?? ''}…`)
        const payloadFile: FilePayload = {
          name: file.name,
          size: file.size,
          data: await fileToBase64(file)
        }
        await postAddonUpdate({
          addonId: composer.addon.addonId,
          versionName: versionName.trim(),
          file: payloadFile,
          dryRun
        })
      }

      const totalItems = (file ? 1 : 0) + stagedAddonsCount
      toast({
        variant: 'success',
        title: dryRun ? 'Dry run saved' : 'Release published',
        description: dryRun
          ? `${totalItems} release item(s) validated for v${versionName.trim()}.`
          : `v${versionName.trim()} is live on BuiltByBit across ${totalItems} item(s).`
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
      setSubmittingStatus(null)
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
          <div className="flex items-center gap-3 border-b border-border p-4">
            <CoverImage src={composer.resource.coverImageUrl} className="h-11 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                  {isResource ? 'Release package' : 'Addon version'}
                </span>
                {isResource && stagedAddonsCount > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Bulk: Main + {stagedAddonsCount} addon(s)
                  </Badge>
                ) : null}
              </div>
              <h2 className="truncate text-base font-semibold">{title}</h2>
            </div>
          </div>

          <div className={cn('grid gap-0', isResource ? 'md:grid-cols-[1fr_360px]' : 'grid-cols-1')}>
            <div className="flex flex-col gap-5 p-5 max-h-[75vh] overflow-y-auto">
              <div>
                <Label htmlFor="version">Version name</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">v</span>
                  <Input
                    id="version"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="1.0.0, 2.1-beta…"
                  />
                </div>
                {isResource && availableAddons.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applied to the main resource and all staged addons in this release.
                  </p>
                ) : null}
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Main resource file
                  </span>
                  {file ? (
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Required for resource update</span>
                  )}
                </Label>
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
                    handleResourceFiles(e.dataTransfer.files)
                  }}
                  className={cn(
                    'mt-1.5 rounded-lg border border-dashed border-border p-3 transition-colors',
                    dropActive && 'drop-active'
                  )}
                >
                  {file ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <FileUp className="h-4 w-4" />
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
                      className="flex w-full flex-col items-center gap-1 py-1.5 text-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-medium">Drop resource file or click to browse</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleResourceFiles(e.target.files)}
                  />
                </div>
              </div>

              {isResource && availableAddons.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 mb-0">
                      <Puzzle className="h-3.5 w-3.5 text-warm-pink" />
                      Product addons
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {stagedAddonsCount} of {availableAddons.length} staged
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-2.5">
                    {availableAddons.map((addon) => {
                      const attached = addonFiles[addon.addonId]
                      return (
                        <div
                          key={addon.addonId}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const f = e.dataTransfer.files?.[0]
                            if (f) handleAddonFile(addon.addonId, f)
                          }}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-md border p-2.5 transition-colors',
                            attached
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border/60 bg-background/50 hover:border-border'
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-medium">{addon.title}</span>
                              {attached ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-primary">
                                  Staged
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {attached ? `${attached.name} (${formatBytes(attached.size)})` : 'Drag file here or click upload'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {attached ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleAddonFile(addon.addonId, null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => addonFileInputRefs.current[addon.addonId]?.click()}
                              >
                                <Upload className="mr-1 h-3 w-3" />
                                Add file
                              </Button>
                            )}
                            <input
                              ref={(el) => {
                                addonFileInputRefs.current[addon.addonId] = el
                              }}
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleAddonFile(addon.addonId, f)
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {isResource ? (
                <>
                  <div>
                    <Label htmlFor="update-title">Update title</Label>
                    <Input
                      id="update-title"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder={fields.intro.trim() || 'Headline for this release'}
                      className="mt-1.5"
                    />
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
                  BuiltByBit accepts a version file for addons but no changelog message. Only the
                  file and version name are published.
                </div>
              )}
            </div>

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
                  <pre className="max-h-[380px] overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                    {bbcode}
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

          <div className="flex flex-col gap-3 border-t border-border p-4">
            {confirming && !dryRun ? (
              <div className="flex flex-col gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Ready to publish v{versionName.trim()} live
                </div>
                <div className="text-muted-foreground">
                  The following items will be published to BuiltByBit and notify buyers:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 mt-1">
                  {file ? (
                    <li>
                      <strong>{composer.resource.title}</strong> (main file: {file.name})
                    </li>
                  ) : null}
                  {stagedAddonIds.map((aid) => {
                    const addon = availableAddons.find((a) => a.addonId === aid)
                    return (
                      <li key={aid}>
                        <strong>{addon?.title ?? `Addon #${aid}`}</strong> (file: {addonFiles[aid]?.name})
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            {submittingStatus ? (
              <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{submittingStatus}</span>
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
