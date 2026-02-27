import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '5493777679100'
const WHATSAPP_MESSAGE = 'Hola, quiero hacer una consulta sobre turnos en Clinica San Rafael Arcangel.'

export function FloatingWhatsAppButton () {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      aria-label='Abrir WhatsApp de Clinica San Rafael Arcangel'
      title='WhatsApp'
      className='fixed bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-brand-700 bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:bottom-6 sm:right-6 print:hidden'
    >
      <MessageCircle className='h-5 w-5' />
      <span className='hidden sm:inline'>WhatsApp</span>
    </a>
  )
}
