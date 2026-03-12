import { Link } from 'react-router-dom'
import { Button } from '../../../../components/ui/Button'

export function ReserveActions ({
  startTime,
  isPatientRole,
  holdResult,
  mercadoPagoLoading,
  mercadoPagoPreferenceId,
  checkingMercadoPago,
  mercadoPagoReturnPending,
  paymentUiState,
  authToken,
  onCreateHold,
  onStartMercadoPagoCheckout
}) {
  const canRetryMercadoPago = holdResult?.payment?.status === 'failed'

  return (
    <>
      <div className={`grid gap-2 ${isPatientRole ? 'sm:grid-cols-2' : ''}`}>
        <Button onClick={onCreateHold} disabled={!startTime}>Reservar turno (pendiente de pago)</Button>
        {isPatientRole
          ? (
            <Button
              variant='secondary'
              onClick={onStartMercadoPagoCheckout}
              disabled={
                !holdResult?.appointment?.id ||
                mercadoPagoLoading ||
                holdResult?.payment?.status === 'paid'
              }
            >
              {mercadoPagoLoading
                ? 'Cargando Mercado Pago...'
                : canRetryMercadoPago
                  ? 'Reintentar pago con Mercado Pago'
                  : mercadoPagoPreferenceId
                    ? 'Recargar boton de pago'
                  : 'Pagar con Mercado Pago'}
            </Button>
            )
          : null}
      </div>

      {paymentUiState
        ? (
          <div
            className={[
              'rounded-xl border p-3 text-sm',
              paymentUiState.tone === 'success' && 'border-emerald-300/70 bg-emerald-50/80 text-emerald-950',
              paymentUiState.tone === 'info' && 'border-sky-300/70 bg-sky-50/80 text-sky-950',
              paymentUiState.tone === 'warning' && 'border-amber-300/70 bg-amber-50/80 text-amber-950',
              paymentUiState.tone === 'danger' && 'border-red-300/70 bg-red-50/80 text-red-950'
            ].filter(Boolean).join(' ')}
          >
            <p className='font-semibold'>{paymentUiState.title}</p>
            <p className='mt-1 text-xs opacity-85'>{paymentUiState.description}</p>
          </div>
          )
        : null}

      {holdResult?.appointment?.id && holdResult?.payment?.status === 'pending'
        ? (
          <p className='text-xs text-emerald-900/75'>
            {mercadoPagoReturnPending
              ? 'No cierres esta pantalla mientras validamos el estado.'
              : 'Si abandonaste el checkout, puedes retomarlo desde aqui o desde Mis turnos.'}
            {checkingMercadoPago ? ' Verificando estado...' : ''}
          </p>
          )
        : null}

      {!authToken && (
        <p className='text-xs text-amber-700'>
          Debes <Link to='/ingresar' className='underline'>iniciar sesion</Link> como paciente para confirmar la reserva.
        </p>
      )}
    </>
  )
}
