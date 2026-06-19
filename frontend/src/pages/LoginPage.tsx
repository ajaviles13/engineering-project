import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login'
      const res = await axios.post(endpoint, { user: data })
      const token = res.headers['authorization']?.replace('Bearer ', '') ?? ''
      login(token, res.data.user)
      navigate('/')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? 'Authentication failed')
      }
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          {isRegister ? 'Create account' : 'Sign in'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">BookKeeper — Scalable transaction management</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="demo@bookkeeping.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="password123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Loading...' : (isRegister ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsRegister(!isRegister)} className="text-indigo-600 hover:underline">
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
        <p className="text-xs text-gray-400 mt-3 text-center">Demo: demo@bookkeeping.com / password123</p>
      </div>
    </div>
  )
}
