import { Navigate, Route, Routes } from 'react-router-dom'
import { AppHeader } from './components/layout/AppHeader'
import { AppFooter } from './components/layout/AppFooter'
import { FloatingWhatsAppButton } from './components/layout/FloatingWhatsAppButton'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LandingPage } from './pages/public/LandingPage'
import { SpecialtiesPage } from './pages/public/SpecialtiesPage'
import { SpecialtyDoctorsPage } from './pages/public/SpecialtyDoctorsPage'
import { ProfessionalsPage } from './pages/public/ProfessionalsPage'
import { NewsPage } from './pages/public/NewsPage'
import { NewsDetailPage } from './pages/public/NewsDetailPage'
import { AboutPage } from './pages/public/AboutPage'
import { FaqPage } from './pages/public/FaqPage'
import { LoginPage } from './pages/public/LoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ClinicDashboardPage } from './pages/clinic/ClinicDashboardPage'
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage'
import { DoctorPrintDayPage } from './pages/doctor/DoctorPrintDayPage'
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage'
import { ReservePage } from './pages/patient/ReservePage'
import { NotFoundPage } from './pages/public/NotFoundPage'

function App () {
  return (
    <div className='flex min-h-screen flex-col'>
      <AppHeader />
      <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0'>
        <Routes>
          <Route path='/' element={<LandingPage />} />
          <Route path='/especialidades' element={<SpecialtiesPage />} />
          <Route path='/especialidades/:specialtyId/profesionales' element={<SpecialtyDoctorsPage />} />
          <Route path='/profesionales' element={<ProfessionalsPage />} />
          <Route path='/noticias' element={<NewsPage />} />
          <Route path='/noticias/:newsId' element={<NewsDetailPage />} />
          <Route path='/sobre-nosotros' element={<AboutPage />} />
          <Route path='/preguntas-frecuentes' element={<FaqPage />} />
          <Route path='/ingresar' element={<LoginPage />} />
          <Route
            path='/reservar'
            element={
              <ProtectedRoute allowedRoles={['admin', 'clinic', 'doctor', 'patient']}>
                <ReservePage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/dashboard/admin'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dashboard/clinica'
            element={
              <ProtectedRoute allowedRoles={['clinic']}>
                <ClinicDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dashboard/medico'
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dashboard/medico/imprimir'
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPrintDayPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dashboard/paciente'
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path='/dashboard' element={<Navigate to='/' replace />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </main>
      <FloatingWhatsAppButton />
      <AppFooter />
    </div>
  )
}

export default App
