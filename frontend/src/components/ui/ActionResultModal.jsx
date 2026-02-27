import { useEffect } from 'react'
import clsx from 'clsx'
import { Button } from './Button'

const typeConfig = {
  success: {
    dotClassName: 'bg-emerald-500',
    titleClassName: 'text-emerald-950',
    descriptionClassName: 'text-emerald-900/80',
    defaultTitle: 'Accion completada'
  },
  error: {
    dotClassName: 'bg-red-500',
    titleClassName: 'text-red-900',
    descriptionClassName: 'text-red-800/85',
    defaultTitle: 'No se pudo completar la accion'
  }
}

export function ActionResultModal ({
  open,
  type = 'success',
  title,
  description,
  confirmLabel = 'Entendido',
  onClose,
  onConfirm
}) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  if (!open) return null

  const config = typeConfig[type] || typeConfig.success

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/35 p-4 backdrop-blur-sm'
      role='presentation'
      onClick={() => onClose?.()}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='action-result-title'
        aria-describedby='action-result-description'
        className='glass-card w-full max-w-md space-y-5 p-5 sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-start gap-3'>
          <span
            className={clsx('mt-1 inline-flex h-3 w-3 shrink-0 rounded-full', config.dotClassName)}
            aria-hidden='true'
          />
          <div className='space-y-1'>
            <h3 id='action-result-title' className={clsx('text-lg font-semibold', config.titleClassName)}>
              {title || config.defaultTitle}
            </h3>
            <p id='action-result-description' className={clsx('text-sm leading-relaxed', config.descriptionClassName)}>
              {description || 'Operacion finalizada.'}
            </p>
          </div>
        </div>

        <div className='flex justify-end'>
          <Button onClick={() => (onConfirm || onClose)?.()}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  )
}
