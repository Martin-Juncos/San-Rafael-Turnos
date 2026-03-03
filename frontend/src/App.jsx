import { AppHeader } from './components/layout/AppHeader'
import { AppFooter } from './components/layout/AppFooter'
import { FloatingWhatsAppButton } from './components/layout/FloatingWhatsAppButton'
import { AppRoutes } from './app/routes'

function App () {
  return (
    <div className='flex min-h-screen flex-col'>
      <AppHeader />
      <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0'>
        <AppRoutes />
      </main>
      <FloatingWhatsAppButton />
      <AppFooter />
    </div>
  )
}

export default App
