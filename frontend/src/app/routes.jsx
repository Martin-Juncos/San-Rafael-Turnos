import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { RoleRoute } from '../components/layout/RoleRoute'

const LandingPage = lazy(() => import('../pages/public/LandingPage').then((module) => ({ default: module.LandingPage })))
const SpecialtiesPage = lazy(() => import('../pages/public/SpecialtiesPage').then((module) => ({ default: module.SpecialtiesPage })))
const SpecialtyDoctorsPage = lazy(() => import('../pages/public/SpecialtyDoctorsPage').then((module) => ({ default: module.SpecialtyDoctorsPage })))
const ProfessionalsPage = lazy(() => import('../pages/public/ProfessionalsPage').then((module) => ({ default: module.ProfessionalsPage })))
const NewsPage = lazy(() => import('../pages/public/NewsPage').then((module) => ({ default: module.NewsPage })))
const NewsDetailPage = lazy(() => import('../pages/public/NewsDetailPage').then((module) => ({ default: module.NewsDetailPage })))
const AboutPage = lazy(() => import('../pages/public/AboutPage').then((module) => ({ default: module.AboutPage })))
const FaqPage = lazy(() => import('../pages/public/FaqPage').then((module) => ({ default: module.FaqPage })))
const LoginPage = lazy(() => import('../pages/public/LoginPage').then((module) => ({ default: module.LoginPage })))
const UnauthorizedPage = lazy(() => import('../pages/public/UnauthorizedPage').then((module) => ({ default: module.UnauthorizedPage })))
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const ClinicDashboardPage = lazy(() => import('../pages/clinic/ClinicDashboardPage').then((module) => ({ default: module.ClinicDashboardPage })))
const DoctorDashboardPage = lazy(() => import('../pages/doctor/DoctorDashboardPage').then((module) => ({ default: module.DoctorDashboardPage })))
const DoctorPrintDayPage = lazy(() => import('../pages/doctor/DoctorPrintDayPage').then((module) => ({ default: module.DoctorPrintDayPage })))
const DoctorConsultNotePage = lazy(() => import('../pages/doctor/DoctorConsultNotePage').then((module) => ({ default: module.DoctorConsultNotePage })))
const DoctorPatientsRecordsPage = lazy(() => import('../pages/doctor/DoctorPatientsRecordsPage').then((module) => ({ default: module.DoctorPatientsRecordsPage })))
const DoctorPatientRecordsDetailPage = lazy(() => import('../pages/doctor/DoctorPatientRecordsDetailPage').then((module) => ({ default: module.DoctorPatientRecordsDetailPage })))
const PatientDashboardPage = lazy(() => import('../pages/patient/PatientDashboardPage').then((module) => ({ default: module.PatientDashboardPage })))
const ReservePage = lazy(() => import('../pages/patient/ReservePage').then((module) => ({ default: module.ReservePage })))

function RouteFallback () {
  return (
    <div className='rounded-xl border border-emerald-200/70 bg-white/70 p-4 text-sm text-emerald-900/80' role='status' aria-live='polite'>
      Cargando pantalla...
    </div>
  )
}

const GuardedRoute = ({ allowedRoles, children }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={allowedRoles}>
      {children}
    </RoleRoute>
  </ProtectedRoute>
)

export function AppRoutes () {
  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path='/no-autorizado' element={<UnauthorizedPage />} />

        <Route
          path='/reservar'
          element={
            <GuardedRoute allowedRoles={['admin', 'clinic', 'doctor', 'secretary', 'patient']}>
              <ReservePage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/admin'
          element={
            <GuardedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/clinica'
          element={
            <GuardedRoute allowedRoles={['clinic']}>
              <ClinicDashboardPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/medico'
          element={
            <GuardedRoute allowedRoles={['doctor', 'secretary']}>
              <DoctorDashboardPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/medico/imprimir'
          element={
            <GuardedRoute allowedRoles={['doctor', 'secretary']}>
              <DoctorPrintDayPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/medico/consulta/:appointmentId'
          element={
            <GuardedRoute allowedRoles={['doctor']}>
              <DoctorConsultNotePage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/medico/registros-pacientes'
          element={
            <GuardedRoute allowedRoles={['doctor']}>
              <DoctorPatientsRecordsPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/medico/registros-pacientes/:patientId'
          element={
            <GuardedRoute allowedRoles={['doctor']}>
              <DoctorPatientRecordsDetailPage />
            </GuardedRoute>
          }
        />
        <Route
          path='/dashboard/paciente'
          element={
            <GuardedRoute allowedRoles={['patient']}>
              <PatientDashboardPage />
            </GuardedRoute>
          }
        />

        <Route path='/dashboard' element={<Navigate to='/' replace />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
