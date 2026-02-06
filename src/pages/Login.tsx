import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate } from 'react-router-dom'

const formSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export default function Login() {
  const { signIn, user, loading, resendConfirmationEmail } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [showResendButton, setShowResendButton] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

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

  const handleResendEmail = async () => {
    const email = form.getValues('email')
    if (!email) return

    setIsResending(true)
    try {
      const { error } = await resendConfirmationEmail(email)

      if (error) {
        // Check for "already confirmed" messages
        const errorMsg = error.message?.toLowerCase() || ''
        if (
          errorMsg.includes('already confirmed') ||
          errorMsg.includes('already been confirmed')
        ) {
          toast.info('Este e-mail já foi confirmado.', {
            description: 'Por favor, tente fazer login normalmente.',
            duration: 5000,
          })
          setShowResendButton(false)
        } else {
          toast.error('Erro ao reenviar', {
            description: error.message || 'Tente novamente mais tarde.',
          })
        }
      } else {
        toast.success('E-mail enviado!', {
          description: 'Verifique sua caixa de entrada para confirmar a conta.',
          duration: 5000,
        })
        // Optionally hide button or keep it for feedback
        setShowResendButton(false)
      }
    } catch (error) {
      toast.error('Erro inesperado', {
        description: 'Não foi possível reenviar o e-mail.',
      })
    } finally {
      setIsResending(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setShowResendButton(false) // Reset state on new attempt

    try {
      const { error } = await signIn(values.email, values.password)

      if (error) {
        const errorMessage = error.message || ''
        const errorCode = (error as any)?.code // Some AuthErrors have a code property

        // Specific handling for unconfirmed emails
        if (
          errorCode === 'email_not_confirmed' ||
          errorMessage.includes('Email not confirmed') ||
          errorMessage.includes('not confirmed')
        ) {
          setShowResendButton(true)
          toast.error('E-mail não confirmado', {
            description: 'Você precisa confirmar seu e-mail antes de entrar.',
            duration: 6000,
          })
        } else if (errorMessage.includes('Invalid login credentials')) {
          toast.error('Credenciais inválidas', {
            description: 'E-mail ou senha incorretos.',
          })
        } else {
          toast.error('Erro no login', { description: errorMessage })
        }
      } else {
        toast.success('Login realizado com sucesso!')
        // Navigation is handled by the useEffect/Navigate component when user state updates,
        // but explicit navigation here provides immediate feedback
        navigate('/upload')
      }
    } catch (error) {
      console.error('Unexpected login error:', error)
      toast.error('Ocorreu um erro inesperado', {
        description: 'Tente novamente mais tarde.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
          <CardDescription>
            Entre com seu email e senha para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showResendButton && (
            <Alert
              variant="destructive"
              className="mb-6 text-left border-destructive/50 bg-destructive/5 text-destructive-foreground"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="ml-2">Confirmação necessária</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p className="text-sm">
                  Seu e-mail ainda não foi confirmado. Verifique sua caixa de
                  entrada.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-destructive/30 hover:bg-destructive/10 hover:text-destructive bg-white dark:bg-slate-950"
                  onClick={handleResendEmail}
                  disabled={isResending}
                  type="button"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Reenviar e-mail de confirmação'
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link
              to="/signup"
              className="text-primary hover:underline font-medium"
            >
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
