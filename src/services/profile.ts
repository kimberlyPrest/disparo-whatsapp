import { supabase } from '@/lib/supabase/client'

export type ProfileData = {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  created_at?: string
}

export const profileService = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data as ProfileData
  },

  async update(
    userId: string,
    data: { name?: string; avatar_url?: string | null },
  ) {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)

    if (error) throw error
  },

  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    // Get the public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl
  },
}
