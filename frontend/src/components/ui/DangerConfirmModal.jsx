import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Button } from './Button'
import { Input } from './Input'

export function DangerConfirmModal ({
  open,
  title = 'Confirmar eliminacion',
  description = 'Esta accion elimina el registro de forma permanente.',
  expectedText = 'ELIMINAR',
  cancelLabel = 'Cancelar',
  confirmLabel = 'Eliminar definitivamente',
  onClose,
  onConfirm,
  loading = false
}) {
  const [confirmationValue, setConfirmationValue] = useState('')

  useEffect(() => {
    if (open) {
      setConfirmationValue('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [loading, onClose, open])

  if (!open) return null

  const canConfirm = confirmationValue.trim() === expectedText && !loading

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/45 p-4 backdrop-blur-sm'
      role='presentation'
      onClick={() => {
        if (!loading) {
          onClose?.()
        }
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='danger-confirm-title'
        aria-describedby='danger-confirm-description'
        className='glass-card w-full max-w-md space-y-5 p-5 sm:p-6'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-start gap-3'>
          <span
            className='mt-1 inline-flex h-3 w-3 shrink-0 rounded-full bg-red-500'
            aria-hidden='true'
          />
          <div className='space-y-1'>
            <h3 id='danger-confirm-title' className='text-lg font-semibold text-red-950'>
              {title}
            </h3>
            <p id='danger-confirm-description' className='text-sm leading-relaxed text-red-900/85'>
              {description}
            </p>
          </div>
        </div>

        <div className='rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-900'>
          Para continuar, escribe <span className='font-semibold'>{expectedText}</span>.
        </div>

        <Input
          label='Confirmacion'
          value={confirmationValue}
          onChange={(event) => setConfirmationValue(event.target.value)}
          placeholder={expectedText}
          autoFocus
        />

        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            variant='secondary'
            onClick={() => onClose?.()}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant='danger'
            className={clsx('px-4', !canConfirm && 'cursor-not-allowed opacity-70')}
            onClick={() => onConfirm?.()}
            disabled={!canConfirm}
          >
            {loading ? 'Eliminando...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
