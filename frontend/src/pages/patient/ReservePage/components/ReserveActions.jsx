import { Link } from 'react-router-dom'
import { Button } from '../../../../components/ui/Button'

export function ReserveActions ({
  startTime,
  isPatientRole,
  holdResult,
  mercadoPagoLoading,
  mercadoPagoPreferenceId,
  checkingMercadoPago,
  authToken,
  onCreateHold,
  onStartMercadoPagoCheckout
}) {
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
                : mercadoPagoPreferenceId
                  ? 'Recargar boton de pago'
                  : 'Pagar con Mercado Pago'}
            </Button>
            )
          : null}
      </div>

      {holdResult?.appointment?.id && holdResult?.payment?.status === 'pending'
        ? (
          <p className='text-xs text-emerald-900/75'>
            El turno queda confirmado cuando Mercado Pago devuelve el pago y el backend sincroniza el estado.
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
