import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import { selectAuth } from '../../features/auth/authSlice'

export function ProtectedRoute ({ allowedRoles, children }) {
  const auth = useAppSelector(selectAuth)

  if (!auth.token || !auth.role) {
    return <Navigate to='/ingresar' replace />
  }

  if (!allowedRoles.includes(auth.role)) {
    return <Navigate to='/' replace />
  }

  return children
}
