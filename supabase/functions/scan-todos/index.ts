// Proxies a handwritten todo-list photo through Azure AI Vision (OCR) then Groq (structuring).
// AZURE_VISION_ENDPOINT, AZURE_VISION_KEY, GROQ_API_KEY are Supabase secrets, never exposed to the client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPrompt(habitNames: string[]): string {
  const habitList = habitNames.length > 0 ? habitNames.map((n) => `"${n}"`).join(', ') : '(none)'
  return `You will be given raw OCR text lines from a photo of a handwritten or written todo list / notepad page. Turn each distinct task or item into an entry. Skip page titles, dates, and decorative elements that are not actual tasks. Merge lines that are clearly a single wrapped task.

Guess a "tier" for each: "bronze" for quick/easy items, "silver" for normal items, "gold" for items that look important or effortful (e.g. underlined, starred, or emphasized in the source).

Put any extra detail beyond the short title into "note" (empty string if none).

The user's existing recurring habits are: ${habitList}. If an item's text clearly refers to one of these habits (e.g. "Gym" or "went to the gym" for a habit named "Gym"), set "habitMatch" to the exact habit name from that list, copied exactly. Otherwise set it to null.

Some lines may have a parenthetical tag at the end like "(clutch)" or "(habit)" — these are explicit instructions from the user, not part of the task text. If present, set "explicitType" to "clutch" or "habit" respectively (else null), and strip the tag out of "name" entirely.

Respond with ONLY a JSON object of the form {"items": [{"name": string, "tier": "bronze"|"silver"|"gold", "note": string, "habitMatch": string|null, "explicitType": "clutch"|"habit"|null}]}.`
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType, habitNames } = await req.json()
    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ items: [], error: 'Missing imageBase64 or mimeType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const azureEndpoint = Deno.env.get('AZURE_VISION_ENDPOINT')
    const azureKey = Deno.env.get('AZURE_VISION_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!azureEndpoint || !azureKey || !groqKey) {
      return new Response(
        JSON.stringify({ items: [], error: 'Server missing AZURE_VISION_ENDPOINT, AZURE_VISION_KEY, or GROQ_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 1: Azure AI Vision — synchronous OCR (Image Analysis 4.0 "read" feature) ──
    const ocrRes = await fetch(
      `${azureEndpoint.replace(/\/$/, '')}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/octet-stream',
        },
        body: base64ToBytes(imageBase64),
      }
    )

    if (!ocrRes.ok) {
      const errText = await ocrRes.text()
      return new Response(JSON.stringify({ items: [], error: `Azure Vision error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ocrJson = await ocrRes.json()
    const lines: string[] =
      ocrJson?.readResult?.blocks?.flatMap((b: any) => b.lines?.map((l: any) => l.text) ?? []) ?? []

    if (lines.length === 0) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Step 2: Groq — structure the raw OCR lines into tiered todo candidates ──
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildPrompt(Array.isArray(habitNames) ? habitNames : []) },
          { role: 'user', content: lines.join('\n') },
        ],
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      return new Response(JSON.stringify({ items: [], error: `Groq error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqJson = await groqRes.json()
    const content = groqJson?.choices?.[0]?.message?.content
    const parsed = content ? JSON.parse(content) : { items: [] }

    return new Response(JSON.stringify({ items: parsed.items ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
