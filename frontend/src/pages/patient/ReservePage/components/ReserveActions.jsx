import { Link } from 'react-router-dom'
import { Button } from '../../../../components/ui/Button'

export function ReserveActions ({
  startTime,
  isPatientRole,
  holdResult,
  mercadoPagoLoading,
  checkingMercadoPago,
  authToken,
  onCreateHold,
  onStartMercadoPagoCheckout
}) {
  return (
    <>
      <div className='grid gap-2 sm:grid-cols-2'>
        <Button onClick={onCreateHold} disabled={!startTime}>Reservar turno (pendiente de pago)</Button>
        <Button
          variant='secondary'
          onClick={onStartMercadoPagoCheckout}
          disabled={
            !isPatientRole ||
            !holdResult?.appointment?.id ||
            mercadoPagoLoading ||
            holdResult?.payment?.status === 'paid'
          }
        >
          {mercadoPagoLoading ? 'Redirigiendo...' : 'Pagar con Mercado Pago (sandbox)'}
        </Button>
      </div>

      {holdResult?.appointment?.id && holdResult?.payment?.status === 'pending'
        ? (
          <p className='text-xs text-emerald-900/75'>
            El turno queda confirmado solo cuando Mercado Pago envie un webhook valido y el backend verifique el pago.
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
