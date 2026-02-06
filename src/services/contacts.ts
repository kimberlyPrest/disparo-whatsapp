import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

export type Contact = Database['public']['Tables']['contacts']['Row']

export const contactsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Contact[]
  },

  async getByIds(ids: string[]) {
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .in('id', ids)

    if (error) throw error
    return data as Contact[]
  },

  async createBulk(
    contacts: { name: string; phone: string; message: string }[],
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Usuário não autenticado')

    const contactsWithUser = contacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      message: contact.message,
      user_id: user.id,
      status: 'pendente',
    }))

    const { error } = await supabase.from('contacts').insert(contactsWithUser)

    if (error) throw error
  },

  async update(id: string, updates: Partial<Contact>) {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)

    if (error) throw error
  },

  async deleteBulk(ids: string[]) {
    if (ids.length === 0) return

    const { error } = await supabase.from('contacts').delete().in('id', ids)

    if (error) throw error
  },

  async sendWhatsappMessage(contact: Contact) {
    const { error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        contactId: contact.id,
        phone: contact.phone,
        message: contact.message,
      },
    })

    if (error) throw error
  },
}
