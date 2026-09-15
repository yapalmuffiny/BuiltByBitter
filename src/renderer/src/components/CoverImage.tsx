import * as React from 'react'
import { Package } from 'lucide-react'
import { cn, toHttps } from '@/lib/utils'

interface CoverImageProps {
  src?: string
  alt?: string
  className?: string
  rounded?: string
}

export function CoverImage({
  src,
  alt,
  className,
  rounded = 'rounded-lg'
}: CoverImageProps): React.JSX.Element {
  const [errored, setErrored] = React.useState(false)
  const url = toHttps(src)
  const show = url && !errored

  return (
    <div className={cn('relative overflow-hidden bg-secondary', rounded, className)}>
      {show ? (
        <img
          src={url}
          alt={alt ?? ''}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
          <Package className="h-8 w-8" />
        </div>
      )}
    </div>
  )
}
