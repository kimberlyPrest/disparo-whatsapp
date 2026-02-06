import { supabase } from '@/lib/supabase/client'

export interface Contact {
  id: string
  user_id: string
  name: string
  phone: string
  message: string
  status: string
  created_at: string
}

export type NewContact = Omit<
  Contact,
  'id' | 'created_at' | 'user_id' | 'status'
> & { status?: string }

export const contactsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Contact[]
  },

  async create(contact: NewContact) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contact,
        user_id: user.id,
        status: contact.status || 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data as Contact
  },

  async createBulk(contacts: NewContact[]) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const contactsWithUser = contacts.map((c) => ({
      ...c,
      user_id: user.id,
      status: c.status || 'pending',
    }))

    // Insert in chunks of 100 to avoid limits
    const chunkSize = 100
    const errors = []

    for (let i = 0; i < contactsWithUser.length; i += chunkSize) {
      const chunk = contactsWithUser.slice(i, i + chunkSize)
      const { error } = await supabase.from('contacts').insert(chunk)
      if (error) errors.push(error)
    }

    if (errors.length > 0) throw errors[0]
    return true
  },

  async update(
    id: string,
    updates: Partial<Omit<Contact, 'id' | 'user_id' | 'created_at'>>,
  ) {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Contact
  },

  async delete(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)

    if (error) throw error
    return true
  },

  async deleteBulk(ids: string[]) {
    const { error } = await supabase.from('contacts').delete().in('id', ids)

    if (error) throw error
    return true
  },
}
