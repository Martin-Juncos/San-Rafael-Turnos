import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import { selectAuth } from '../../features/auth/authSlice'

export function RoleRoute ({ allowedRoles, children }) {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()

  if (!auth.role) {
    return <Navigate to='/ingresar' replace state={{ from: location }} />
  }

  if (!allowedRoles.includes(auth.role)) {
    return (
      <Navigate
        to='/no-autorizado'
        replace
        state={{ from: location.pathname, requiredRoles: allowedRoles }}
      />
    )
  }

  return children
}

