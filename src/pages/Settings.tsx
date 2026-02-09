import { useEffect, useState, useRef } from 'react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Save, User as UserIcon, Camera, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile'
import { Navigate } from 'react-router-dom'

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.',
  }),
  email: z.string().email(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function Settings() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      try {
        const profile = await profileService.get(user.id)
        if (profile) {
          form.reset({
            name: profile.name || '',
            email: user.email || '',
          })
          if (profile.avatar_url) {
            setPreviewUrl(profile.avatar_url)
          }
        } else {
          form.reset({
            name: '',
            email: user.email || '',
          })
        }
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProfile()
    }
  }, [user, form])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB')
        return
      }
      setAvatarFile(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return
    setIsSaving(true)

    try {
      let avatarUrl = undefined

      if (avatarFile) {
        try {
          avatarUrl = await profileService.uploadAvatar(user.id, avatarFile)
        } catch (error) {
          console.error('Error uploading avatar:', error)
          toast.error('Erro ao fazer upload da imagem')
          throw error
        }
      }

      await profileService.update(user.id, {
        name: data.name,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      })

      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userInitials = form.getValues('name')
    ? form
        .getValues('name')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.substring(0, 2).toUpperCase()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações de perfil e foto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize sua foto de perfil e dados pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative group">
                      <Avatar
                        className="w-32 h-32 border-4 border-muted cursor-pointer transition-opacity hover:opacity-90"
                        onClick={triggerFileInput}
                      >
                        <AvatarImage
                          src={previewUrl || ''}
                          alt="Foto de perfil"
                          className="object-cover"
                        />
                        <AvatarFallback className="text-4xl bg-muted">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                        title="Alterar foto"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerFileInput}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Alterar foto
                    </Button>
                  </div>

                  <div className="flex-1 w-full space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Seu nome"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-muted" />
                          </FormControl>
                          <FormDescription>
                            O email não pode ser alterado diretamente.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
