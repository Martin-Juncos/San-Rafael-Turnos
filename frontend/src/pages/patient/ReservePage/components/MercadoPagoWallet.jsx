import { useEffect, useState } from 'react'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || ''

let mercadoPagoInitialized = false

export function MercadoPagoWallet ({
  preferenceId,
  onReady,
  onError,
  onSubmit
}) {
  const [walletReadyToRender, setWalletReadyToRender] = useState(false)

  useEffect(() => {
    if (!publicKey || mercadoPagoInitialized) return
    initMercadoPago(publicKey, { locale: 'es-AR' })
    mercadoPagoInitialized = true
  }, [])

  useEffect(() => {
    if (!preferenceId || !publicKey) {
      setWalletReadyToRender(false)
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setWalletReadyToRender(true)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [preferenceId])

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
      {walletReadyToRender
        ? (
          <Wallet
            key={preferenceId}
            initialization={{
              preferenceId,
              redirectMode: 'blank'
            }}
            onReady={onReady}
            onError={onError}
            onSubmit={onSubmit}
          />
          )
        : (
          <div className='rounded-lg border border-sky-200/70 bg-white/70 px-4 py-3 text-xs text-sky-900/75'>
            Cargando boton seguro de Mercado Pago...
          </div>
          )}
    </div>
  )
}
