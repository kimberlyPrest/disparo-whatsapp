import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  History,
  LogOut,
  User as UserIcon,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [profileName, setProfileName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return

      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single()

        // Cast data to any because avatar_url might not be in the generated types yet
        const profileData = data as any

        if (profileData) {
          if (profileData.name) setProfileName(profileData.name)
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url)
        } else if (user.user_metadata?.name) {
          setProfileName(user.user_metadata.name)
        }

        // Fallback name if still empty
        if (!profileName && !data?.name && !user.user_metadata?.name) {
          const emailName = user.email?.split('@')[0] || 'Usuário'
          setProfileName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }

    if (user) {
      fetchProfile()

      // Real-time updates for profile
      const subscription = supabase
        .channel('sidebar_profile')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const newData = payload.new as any
            if (newData) {
              if (newData.name) setProfileName(newData.name)
              if (newData.avatar_url !== undefined)
                setAvatarUrl(newData.avatar_url)
            }
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const menuItems = [
    {
      title: 'Página Inicial',
      url: '/dashboard',
      icon: Home,
    },
    {
      title: 'Novo disparo',
      url: '/upload',
      icon: PlusCircle,
    },
    {
      title: 'Disparos',
      url: '/disparos',
      icon: History,
    },
    {
      title: 'Configurações',
      url: '/settings',
      icon: Settings,
    },
  ]

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar className="border-r border-border bg-white">
      <SidebarHeader className="h-20 flex justify-center px-6 border-b-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#13ec5b]">
            <span className="font-bold text-white text-xl">R</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 leading-none">
              Ripple
            </span>
            <span className="text-xs text-slate-500 font-medium mt-1">
              Marketing Tool
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        'h-11 px-4 text-base transition-all duration-200 hover:bg-green-50 hover:text-green-700',
                        active
                          ? 'bg-green-50 text-green-700 font-medium shadow-sm ring-1 ring-green-100'
                          : 'text-slate-600',
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            'h-5 w-5',
                            active ? 'text-green-700' : 'text-slate-500',
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9 border border-white shadow-sm">
              <AvatarImage
                src={avatarUrl || ''}
                alt={profileName}
                className="object-cover"
              />
              <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                {profileName ? (
                  getInitials(profileName)
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {profileName}
              </span>
              <span
                className="text-xs text-slate-500 truncate"
                title={user?.email || ''}
              >
                {user?.email}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
