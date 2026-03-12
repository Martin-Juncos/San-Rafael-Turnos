import { useEffect } from 'react'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || ''

let mercadoPagoInitialized = false

export function MercadoPagoWallet ({
  preferenceId,
  onReady,
  onError,
  onSubmit
}) {
  useEffect(() => {
    if (!publicKey || mercadoPagoInitialized) return
    initMercadoPago(publicKey, { locale: 'es-AR' })
    mercadoPagoInitialized = true
  }, [])

  if (!preferenceId) {
    return null
  }

  if (!publicKey) {
    return (
      <div className='rounded-xl border border-amber-300/70 bg-amber-50/80 p-3 text-sm text-amber-900'>
        Falta la clave publica de Mercado Pago en el frontend para mostrar el boton de pago.
      </div>
    )
  }

  return (
    <div className='space-y-2 rounded-xl border border-sky-200/70 bg-sky-50/80 p-3'>
      <p className='text-sm font-semibold text-sky-950'>Pago con Mercado Pago</p>
      <p className='text-xs text-sky-900/80'>
        Usa el boton oficial de Mercado Pago para completar el pago del turno.
      </p>
      <Wallet
        initialization={{
          preferenceId,
          redirectMode: 'blank'
        }}
        onReady={onReady}
        onError={onError}
        onSubmit={onSubmit}
      />
    </div>
  )
}
