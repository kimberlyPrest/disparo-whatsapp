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
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'

const formSchema = z.object({
  email: z.string().email('Email inválido'),
})

export default function AuthPage() {
  const { signInWithEmail, user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const { error } = await signInWithEmail(values.email)
      if (error) {
        toast.error('Erro ao enviar link', { description: error.message })
      } else {
        setEmailSent(true)
        toast.success('Link enviado!', {
          description: 'Verifique sua caixa de entrada para fazer login.',
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('Ocorreu um erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Digite seu email para receber um link de acesso mágico
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center space-y-4 py-6">
              <div className="bg-green-100 p-4 rounded-full w-fit mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-700">
                Email enviado!
              </h3>
              <p className="text-muted-foreground">
                Verifique sua caixa de entrada e clique no link para acessar.
              </p>
              <Button
                variant="outline"
                onClick={() => setEmailSent(false)}
                className="mt-4"
              >
                Tentar outro email
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Link de Acesso'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
