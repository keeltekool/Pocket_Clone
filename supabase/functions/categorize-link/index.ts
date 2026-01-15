import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { linkId, userId, title, domain, url } = await req.json()

    if (!linkId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing linkId or userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user's existing buckets
    const { data: buckets, error: bucketsError } = await supabase
      .from('buckets')
      .select('id, name')
      .eq('user_id', userId)

    if (bucketsError) {
      throw new Error(`Failed to fetch buckets: ${bucketsError.message}`)
    }

    const bucketNames = buckets?.map(b => b.name) || []

    // Call Claude to categorize
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const prompt = `You are a link categorization assistant. Given a saved link, suggest the best bucket/category for it.

Link details:
- Title: ${title || 'Unknown'}
- Domain: ${domain || 'Unknown'}
- URL: ${url}

User's existing buckets: ${bucketNames.length > 0 ? bucketNames.join(', ') : 'None yet'}

Instructions:
1. If an existing bucket fits well, return its exact name
2. If no bucket fits, suggest a new short category name (1-2 words, like "Tech", "News", "Shopping", "Work", "Learning")
3. Return ONLY a JSON object, nothing else

Response format:
{"bucket": "bucket name here", "isNew": true/false}

Examples:
- Tech article on existing "Tech" bucket: {"bucket": "Tech", "isNew": false}
- Recipe site with no food bucket: {"bucket": "Recipes", "isNew": true}`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content[0]?.text || ''

    // Parse Claude's response
    let suggestion
    try {
      suggestion = JSON.parse(responseText.trim())
    } catch {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[^}]+\}/)
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse Claude response')
      }
    }

    let bucketId: string | null = null
    let bucketName: string = suggestion.bucket

    if (suggestion.isNew) {
      // Create new bucket
      const { data: newBucket, error: createError } = await supabase
        .from('buckets')
        .insert({ user_id: userId, name: suggestion.bucket })
        .select()
        .single()

      if (createError) {
        // Bucket might already exist (race condition), try to find it
        const { data: existingBucket } = await supabase
          .from('buckets')
          .select('id, name')
          .eq('user_id', userId)
          .eq('name', suggestion.bucket)
          .single()

        if (existingBucket) {
          bucketId = existingBucket.id
          bucketName = existingBucket.name
        }
      } else {
        bucketId = newBucket.id
        bucketName = newBucket.name
      }
    } else {
      // Find existing bucket
      const existingBucket = buckets?.find(
        b => b.name.toLowerCase() === suggestion.bucket.toLowerCase()
      )
      if (existingBucket) {
        bucketId = existingBucket.id
        bucketName = existingBucket.name
      }
    }

    // Update the link with the bucket
    if (bucketId) {
      const { error: updateError } = await supabase
        .from('links')
        .update({ bucket_id: bucketId })
        .eq('id', linkId)

      if (updateError) {
        throw new Error(`Failed to update link: ${updateError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bucketId,
        bucketName,
        isNew: suggestion.isNew
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Categorization error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
