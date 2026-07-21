// Proxies a handwritten todo-list photo to Gemini and returns structured win candidates.
// GEMINI_API_KEY is a Supabase secret (set via `supabase secrets set`), never exposed to the client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Short task title, cleaned up from the handwriting' },
      tier: {
        type: 'STRING',
        enum: ['bronze', 'silver', 'gold'],
        description: 'Guessed effort/importance: bronze=quick/easy, silver=normal, gold=hard/significant',
      },
      note: { type: 'STRING', description: 'Any extra detail on the line beyond the task title, or empty string' },
    },
    required: ['name', 'tier', 'note'],
  },
}

const PROMPT = `This image shows a handwritten or written todo list / notepad page. Read every distinct task or item on the page and return it as an entry. Skip page titles, dates, and decorative elements that are not actual tasks. Guess a "tier" for each: bronze for quick/easy items, silver for normal items, gold for items that look important or effortful (e.g. underlined, starred, or emphasized). Put any extra detail beyond the short title into "note" (empty string if none).`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType } = await req.json()
    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ items: [], error: 'Missing imageBase64 or mimeType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ items: [], error: 'Server missing GEMINI_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(JSON.stringify({ items: [], error: `Gemini error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiJson = await geminiRes.json()
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
    const items = text ? JSON.parse(text) : []

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
