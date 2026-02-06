import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/upload" replace />
  }

  return <Navigate to="/site" replace />
}
