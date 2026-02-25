import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const aboutSections = [
  {
    id: 'identidad',
    title: 'Identidad',
    paragraphs: [
      'En Clinica San Rafael Arcangel entendemos la atencion medica como un compromiso integral con las personas, sus familias y la comunidad. Nuestra forma de trabajar se apoya en una conviccion clara: brindar salud de calidad no significa unicamente ofrecer una consulta o un diagnostico preciso, sino tambien cuidar cada etapa de la experiencia del paciente, desde el primer contacto hasta el seguimiento posterior. Por eso, impulsamos un modelo de atencion que combina cercania humana, organizacion, profesionalismo e innovacion, con el objetivo de ofrecer un servicio confiable, claro y eficiente. Creemos que cada persona merece ser atendida con respeto, escucha y calidez, en un entorno donde se sienta acompanada, orientada y contenida. Esa mirada nos permite construir vinculos de confianza duraderos y fortalecer una atencion centrada verdaderamente en las necesidades de quienes nos eligen.',
      'A lo largo de nuestra trayectoria, hemos consolidado una identidad institucional basada en la responsabilidad, la etica profesional y la mejora continua. Cada paso de nuestro crecimiento ha estado orientado a fortalecer la calidad de atencion, optimizar la organizacion interna y responder con mayor eficacia a las demandas actuales del ambito de la salud. En este camino, el reconocimiento y la confianza de nuestros pacientes han sido fundamentales, ya que representan el respaldo mas valioso a nuestro trabajo diario y nos motivan a seguir avanzando. Nos esforzamos por sostener estandares de atencion que reflejen compromiso, seriedad y vocacion de servicio, entendiendo que la calidad en salud se construye tanto en los grandes procesos clinicos como en los pequenos detalles cotidianos: la puntualidad, la orientacion adecuada, la claridad en la informacion y el trato respetuoso en cada interaccion.'
    ]
  },
  {
    id: 'equipo',
    title: 'Equipo',
    paragraphs: [
      'Nuestro equipo esta conformado por profesionales capacitados y comprometidos con una atencion medica responsable, humana y actualizada. Valoramos especialmente la formacion continua, el trabajo interdisciplinario y la comunicacion clara entre los distintos sectores, porque sabemos que una buena experiencia de atencion tambien depende de la coordinacion entre profesionales, personal administrativo y equipos de apoyo. Promovemos una cultura institucional en la que la calidad tecnica y la calidez humana conviven de manera equilibrada, permitiendo brindar respuestas mas agiles, precisas y cercanas. Cada integrante de la clinica, desde la recepcion hasta los consultorios, cumple un rol fundamental en la construccion de una atencion ordenada y de excelencia, con una actitud de servicio orientada al bienestar de los pacientes.'
    ]
  },
  {
    id: 'instalaciones',
    title: 'Instalaciones',
    paragraphs: [
      'Contamos con instalaciones modernas, funcionales y preparadas para ofrecer un entorno comodo, seguro y profesional. Nuestros espacios han sido pensados para favorecer una atencion eficiente, con areas organizadas, ambientes agradables y una circulacion clara que contribuya a mejorar la experiencia de quienes asisten a la clinica. La recepcion, los consultorios y las distintas areas de atencion reflejan una planificacion enfocada en la comodidad, la accesibilidad y la confianza, integrando una estetica institucional sobria y contemporanea con condiciones adecuadas para el trabajo clinico y administrativo. Entendemos que el entorno tambien comunica calidad, y por eso cuidamos cada detalle para que nuestras instalaciones acompanen la atencion con el mismo nivel de profesionalismo y dedicacion que ofrecemos en cada consulta.'
    ]
  },
  {
    id: 'mejora-continua',
    title: 'Mejora continua',
    paragraphs: [
      'Ademas, trabajamos de manera constante en la mejora de nuestros procesos para facilitar el acceso, optimizar tiempos y hacer mas simple la gestion de la atencion. Esta vision nos permite avanzar hacia una experiencia mas ordenada y previsible para pacientes y equipos, favoreciendo una comunicacion mas clara y una organizacion mas eficiente en cada etapa. Nuestro proposito no es solo responder a las necesidades del presente, sino tambien crecer como institucion de salud con una mirada de futuro, incorporando practicas de trabajo modernas y fortaleciendo una atencion cada vez mas cercana, profesional y confiable. En Clinica San Rafael Arcangel reafirmamos cada dia nuestro compromiso con una medicina de calidad, centrada en las personas, sostenida por el esfuerzo de un equipo capacitado y acompanada por un entorno institucional que inspira confianza, tranquilidad y bienestar.'
    ]
  }
]

const galleryItems = [
  {
    title: 'Administracion y recepcion',
    src: '/about/administracion.png'
  },
  {
    title: 'Consultorio',
    src: '/about/consultorio.png'
  },
  {
    title: 'Pasillos',
    src: '/about/pasillos.png'
  },
  {
    title: 'Frente de la clinica',
    src: '/about/frente-clinica.png'
  }
]

function AboutGalleryImage ({ src, title }) {
  const [failed, setFailed] = useState(false)

  return (
    <Card className='overflow-hidden p-0'>
      {failed
        ? (
          <div className='flex h-56 items-center justify-center bg-emerald-100/80 px-6 text-center text-sm font-medium text-emerald-900/80'>
            {title}: imagen pendiente de carga
          </div>
          )
        : (
          <img
            src={src}
            alt={title}
            loading='lazy'
            className='h-56 w-full object-cover'
            onError={() => setFailed(true)}
          />
          )}
      <div className='border-t border-emerald-100 px-4 py-3'>
        <p className='text-sm font-semibold text-emerald-950'>{title}</p>
      </div>
    </Card>
  )
}

export function AboutPage () {
  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-4 p-6 sm:p-8'>
        <div className='flex flex-wrap items-center gap-4'>
          <img
            src='/logo-san-rafael.png'
            alt='Logo Clinica San Rafael Arcangel'
            className='h-14 w-14 rounded-xl bg-white/70 object-contain p-1 ring-1 ring-emerald-200'
          />
          <div>
            <h1 className='text-3xl font-semibold text-emerald-950'>Clinica San Rafael Arcangel</h1>
            <p className='text-sm text-emerald-900/75'>Salud de calidad con cercania, organizacion e innovacion.</p>
          </div>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Link to='/'><Button variant='secondary'>Volver al inicio</Button></Link>
          <Link to='/reservar'><Button>Reservar turno</Button></Link>
        </div>
      </section>

      <Card className='space-y-4'>
        <h2 className='text-xl font-semibold text-emerald-950'>Conocenos mejor</h2>
        <div className='flex flex-wrap gap-2'>
          {aboutSections.map((section) => (
            <a
              key={`section-nav-${section.id}`}
              href={`#${section.id}`}
              className='rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-900 transition hover:border-brand-300 hover:text-brand-700'
            >
              {section.title}
            </a>
          ))}
        </div>
      </Card>

      <section className='space-y-4'>
        {aboutSections.map((section) => (
          <section key={section.id} id={section.id} className='scroll-mt-24'>
            <Card className='space-y-4'>
              <div className='flex items-center gap-3'>
                <h3 className='inline-flex rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700'>
                  {section.title}
                </h3>
              </div>
              <div className='h-px w-full bg-gradient-to-r from-brand-200 via-emerald-200 to-transparent' />
              <div className='space-y-4'>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.id}-${paragraphIndex}`} className='text-sm leading-relaxed text-emerald-900/90'>
                    {paragraph}
                  </p>
                ))}
              </div>
            </Card>
          </section>
        ))}
      </section>

      <section className='space-y-3'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Nuestros espacios</h2>
        <div className='grid gap-4 sm:grid-cols-2'>
          {galleryItems.map((item) => (
            <AboutGalleryImage key={item.title} src={item.src} title={item.title} />
          ))}
        </div>
      </section>
    </div>
  )
}
