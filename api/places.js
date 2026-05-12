export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Missing query' })

  try {
    const encoded = encodeURIComponent(query)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encoded}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(200).json({ error: data.status, message: data.error_message, places: [] })
    }

    const places = (data.results || []).map(p => ({
      displayName: { text: p.name },
      formattedAddress: p.formatted_address,
      rating: p.rating,
      userRatingCount: p.user_ratings_total,
      websiteUri: p.website || '',
      nationalPhoneNumber: p.formatted_phone_number || '',
      googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      businessStatus: p.business_status
    }))

    return res.status(200).json({ places })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}