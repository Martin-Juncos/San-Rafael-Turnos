import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const specialties = ['Clinica General', 'Cardiologia', 'Pediatria', 'Dermatologia']

export function LandingPage () {
  return (
    <div className='space-y-10'>
      <section className='glass-card overflow-hidden px-6 py-10 sm:px-10'>
        <div className='grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center'>
          <div className='space-y-5'>
            <p className='inline-flex rounded-full border border-brand-300 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700'>
              Turnos online con pagos y WhatsApp
            </p>
            <h1 className='text-3xl font-bold leading-tight text-emerald-950 sm:text-5xl'>
              Clinica San Rafael Arcangel
            </h1>
            <p className='max-w-2xl text-sm text-emerald-900/80 sm:text-base'>
              Gestiona agendas por especialidad y medico, evita sobre-reservas y confirma turnos en minutos con una experiencia digital simple y confiable.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link to='/reservar'><Button>Reservar turno</Button></Link>
              <Link to='/ingresar'><Button variant='secondary'>Ingresar</Button></Link>
            </div>
          </div>
          <Card className='space-y-3 bg-white/65'>
            <p className='text-sm font-semibold text-emerald-900'>Como funciona</p>
            <ol className='space-y-2 text-sm text-emerald-900/80'>
              <li>1. Elige especialidad, medico y horario.</li>
              <li>2. Completa tus datos y bloquea el turno por 10 minutos.</li>
              <li>3. Realiza el pago online y confirma por WhatsApp.</li>
            </ol>
          </Card>
        </div>
      </section>

      <section id='especialidades' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Especialidades</h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {specialties.map((name) => (
            <Card key={name} className='p-4 text-center'>
              <p className='text-sm font-semibold text-emerald-900'>{name}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id='profesionales' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Profesionales</h2>
        <div className='grid gap-4 md:grid-cols-3'>
          {['Dr. Juan Perez', 'Dra. Laura Soto', 'Dr. Martin Quiroga'].map((name) => (
            <Card key={name}>
              <p className='text-sm font-semibold text-emerald-950'>{name}</p>
              <p className='text-xs text-emerald-900/70'>Agenda sincronizada y disponibilidad en tiempo real.</p>
            </Card>
          ))}
        </div>
      </section>

      <section id='noticias' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Noticias</h2>
        <Card>
          <p className='text-sm text-emerald-900/80'>MVP: este modulo utiliza contenido mock hasta la publicacion editorial definitiva.</p>
        </Card>
      </section>

      <section id='sobre-nosotros' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Sobre nosotros</h2>
        <Card>
          <p className='text-sm text-emerald-900/80'>
            Trabajamos para brindar una atencion medica cercana, ordenada y moderna, integrando canales digitales que mejoran la experiencia de pacientes y equipos clinicos.
          </p>
        </Card>
      </section>

      <section id='contacto' className='grid gap-4 md:grid-cols-2'>
        <Card>
          <h3 className='text-lg font-semibold text-emerald-950'>Contacto</h3>
          <p className='mt-2 text-sm text-emerald-900/80'>Av. San Martin 1234, San Rafael, Mendoza</p>
          <p className='text-sm text-emerald-900/80'>Telefono: +54 260 412-3456</p>
          <p className='text-sm text-emerald-900/80'>Email: contacto@sanrafaelturnos.com</p>
        </Card>
        <Card>
          <h3 className='text-lg font-semibold text-emerald-950'>Redes</h3>
          <div className='mt-2 flex flex-wrap gap-2 text-sm text-emerald-900/80'>
            <span className='rounded-lg bg-white/70 px-3 py-1'>Instagram</span>
            <span className='rounded-lg bg-white/70 px-3 py-1'>Facebook</span>
            <span className='rounded-lg bg-white/70 px-3 py-1'>WhatsApp</span>
          </div>
        </Card>
      </section>
    </div>
  )
}
