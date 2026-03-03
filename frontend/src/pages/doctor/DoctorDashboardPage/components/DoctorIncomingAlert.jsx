import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'

export function DoctorIncomingAlert ({
  incomingAlert,
  onOpenChat,
  onClose
}) {
  if (!incomingAlert) return null

  return (
    <Card className='space-y-2 border-amber-300/70 bg-amber-50/70'>
      <p className='text-sm font-semibold text-amber-900'>{incomingAlert.title}</p>
      <p className='text-sm text-amber-900/85'>{incomingAlert.description}</p>
      <div className='flex flex-wrap gap-2'>
        <Button
          variant='secondary'
          className='px-3 py-1.5 text-xs'
          onClick={onOpenChat}
        >
          Abrir chat
        </Button>
        <Button className='px-3 py-1.5 text-xs' onClick={onClose}>
          Cerrar alerta
        </Button>
      </div>
    </Card>
  )
}
