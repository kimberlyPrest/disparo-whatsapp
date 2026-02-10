import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, phone, message } = await req.json()

    if (!name || !phone || !message) {
      throw new Error('Missing required fields: name, phone, message')
    }

    const webhookUrl = 'https://skinnysalmon-n8n.cloudfy.cloud/webhook/disparos'

    const payload = {
      Nome: name,
      Telefone: phone,
      Texto: message,
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Webhook error: ${response.status} ${text}`)
    }

    // Attempt to parse response, but handle non-JSON responses gracefully
    let data
    const text = await response.text()
    try {
      data = text ? JSON.parse(text) : { success: true }
    } catch {
      data = { message: text }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )
  }
})
