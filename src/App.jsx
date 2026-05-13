import { useState } from 'react'
import styles from './App.module.css'

const scoreLocally = (b) => {
  if (!b.website) return 10
  if (b.website.includes('facebook.com') || b.website.includes('instagram.com')) return 9
  if (b.reviews < 10) return 8
  if (b.reviews < 30) return 7
  if (b.reviews < 100) return 6
  if (b.reviews < 300) return 4
  if (b.reviews < 600) return 3
  return 2
}

const tierFromScore = (s) => s >= 7 ? 'hot' : s >= 4 ? 'warm' : 'cold'

const getWeaknesses = (b) => {
  const w = []
  if (!b.website) w.push('No website')
  else if (b.website.includes('facebook.com')) w.push('Facebook page only — no real site')
  else if (b.website.includes('instagram.com')) w.push('Instagram only — no real site')
  if (b.reviews < 10) w.push('Barely any reviews')
  else if (b.reviews < 50) w.push(`Only ${b.reviews} reviews`)
  if (b.rating < 4.0) w.push('Low rating')
  if (!b.phone) w.push('No phone listed')
  return w.slice(0, 3)
}

const getStrengths = (b) => {
  const s = []
  if (b.reviews > 200) s.push(`${b.reviews} reviews`)
  if (b.rating >= 4.8) s.push('High rated')
  if (b.website && !b.website.includes('facebook.com') && !b.website.includes('instagram.com')) s.push('Has website')
  return s.slice(0, 2)
}

const getWebsiteLabel = (website) => {
  if (!website) return '⚠️ No website'
  if (website.includes('facebook.com')) return '📘 Facebook only'
  if (website.includes('instagram.com')) return '📸 Instagram only'
  return website.replace(/https?:\/\//, '').split('/')[0]
}

export default function App() {
  const [trade, setTrade] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('Arkansas')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('score')
  const [pitching, setPitching] = useState(null)
  const [pitch, setPitch] = useState('')
  const [pitchTarget, setPitchTarget] = useState(null)

  const hot = leads.filter(l => l.tier === 'hot')
  const warm = leads.filter(l => l.tier === 'warm')
  const noSite = leads.filter(l => !l.website)

  async function runScan() {
    if (!trade || !city) return
    setLoading(true)
    setLeads([])
    setPitch('')
    setPitching(null)
    setPitchTarget(null)

    const searches = [
      `${trade} ${city} ${state}`,
      `${trade} Rogers Arkansas`,
      `${trade} Fayetteville Arkansas`,
      `${trade} Springdale Arkansas`,
      `${trade} Centerton Arkansas`,
    ]

    setStatusMsg('Scanning across NWA cities...')

    try {
      const allResults = await Promise.all(searches.map(q =>
        fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        }).then(r => r.json()).then(d => d.places || []).catch(() => [])
      ))

      const seen = new Set()
      const places = allResults.flat().filter(p => {
        const key = p.displayName?.text
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

      if (!places.length) { setStatusMsg('No results found.'); setLoading(false); return }

      setStatusMsg(`Found ${places.length} businesses — scoring and analyzing...`)

      const businesses = places.map(p => ({
        name: p.displayName?.text || 'Unknown',
        address: p.formattedAddress || '',
        rating: p.rating || 0,
        reviews: p.userRatingCount || 0,
        website: p.websiteUri || '',
        phone: p.nationalPhoneNumber || '',
        mapsUrl: p.googleMapsUri || ''
      }))

      const scored = businesses.map(b => {
        const score = scoreLocally(b)
        return {
          ...b,
          opportunityScore: score,
          tier: tierFromScore(score),
          weaknesses: getWeaknesses(b),
          strengths: getStrengths(b),
          pitchAngle: ''
        }
      }).sort((a, b) => b.opportunityScore - a.opportunityScore)

      setLeads(scored)
      setStatusMsg(`${scored.length} businesses analyzed across NWA`)

      const prompt = `Write a one-sentence pitch angle (max 12 words) for each of these local ${trade} businesses. Be specific to their situation.

${JSON.stringify(scored.map(b => ({ name: b.name, hasWebsite: !!b.website, reviews: b.reviews, rating: b.rating })))}

Respond ONLY with a JSON array: [{"name":"...","pitchAngle":"..."}]`

      const aiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const aiData = await aiRes.json()
      const text = aiData.content?.[0]?.text || '[]'
      let pitchAngles = []
      try { pitchAngles = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

      setLeads(prev => prev.map(b => {
        const pa = pitchAngles.find(p => p.name === b.name)
        return pa ? { ...b, pitchAngle: pa.pitchAngle } : b
      }))

    } catch (e) {
      setStatusMsg('Error: ' + e.message)
    }
    setLoading(false)
  }

  async function generatePitch(lead) {
    setPitching(lead.name)
    setPitchTarget(lead.name)
    setPitch('')
    const prompt = `Write a short cold text to pitch web design/SEO to "${lead.name}" in NWA Arkansas.

Weaknesses: ${lead.weaknesses.join(', ') || 'weak online presence'}
Rating: ${lead.rating} stars, ${lead.reviews} reviews
Has website: ${lead.website ? 'yes' : 'no'}
Phone: ${lead.phone || 'unknown'}

Under 60 words. Casual dude-to-dude. One clear ask. No fluff. No AI mention.`

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })
    const data = await res.json()
    setPitch(data.content?.[0]?.text || '')
    setPitching(null)
  }

  const filtered = leads
    .filter(l => {
      if (filter === 'all') return true
      if (filter === 'nosite') return !l.website
      return l.tier === filter
    })
    .sort((a, b) => {
      if (sort === 'score') return b.opportunityScore - a.opportunityScore
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'reviews') return b.reviews - a.reviews
      return 0
    })

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoDot}>⚡</div>
          <div>
            <div className={styles.logoName}>Web Pulse</div>
            <div className={styles.logoTag}>Local Business Intel</div>
          </div>
        </div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${styles.active}`}>🔍 Prospect Finder</div>
          <div className={`${styles.navItem} ${styles.soon}`}>📊 Site Audit <span className={styles.badge}>Soon</span></div>
          <div className={`${styles.navItem} ${styles.soon}`}>🏆 Competitor Intel <span className={styles.badge}>Soon</span></div>
          <div className={`${styles.navItem} ${styles.soon}`}>📈 Client Reports <span className={styles.badge}>Soon</span></div>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.footerLabel}>Powered by</div>
          <div className={styles.footerPowered}>Claude AI + Google Places</div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.pageTitle}>Prospect Finder</div>
          <div className={styles.pageSubtitle}>Find local businesses with weak online presence</div>
        </div>

        <div className={styles.searchCard}>
          <div className={styles.searchRow}>
            <div className={styles.field}>
              <label>Trade</label>
              <input type="text" placeholder="roofer, plumber, HVAC..." value={trade} onChange={e => setTrade(e.target.value)} onKeyDown={e => e.key === 'Enter' && runScan()} />
            </div>
            <div className={styles.field}>
              <label>City</label>
              <input type="text" placeholder="Bentonville" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && runScan()} />
            </div>
            <div className={styles.field}>
              <label>State</label>
              <input type="text" placeholder="Arkansas" value={state} onChange={e => setState(e.target.value)} onKeyDown={e => e.key === 'Enter' && runScan()} />
            </div>
            <button className={styles.scanBtn} onClick={runScan} disabled={loading || !trade || !city}>
              {loading ? <span className="spin">⟳</span> : '⚡'} Scan
            </button>
          </div>
          {statusMsg && <div className={styles.status}>{statusMsg}</div>}
        </div>

        {leads.length > 0 && (
          <>
            <div className={styles.metrics}>
              {[
                { label: 'Total Found', value: leads.length, color: '' },
                { label: 'Hot Leads', value: hot.length, color: 'var(--hot)' },
                { label: 'Warm Leads', value: warm.length, color: 'var(--warm)' },
                { label: 'No Website', value: noSite.length, color: 'var(--accent)' }
              ].map(m => (
                <div key={m.label} className={styles.metric}>
                  <div className={styles.metricLabel}>{m.label}</div>
                  <div className={styles.metricVal} style={{ color: m.color || 'var(--text)' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div className={styles.controls}>
              <div className={styles.tabs}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'hot', label: '🔥 Hot' },
                  { key: 'warm', label: '⚠️ Warm' },
                  { key: 'cold', label: 'Cold' },
                  { key: 'nosite', label: '🚫 No Website' },
                ].map(t => (
                  <button key={t.key} className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`} onClick={() => setFilter(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', fontSize: '13px' }}>
                <option value="score">Sort: Opportunity</option>
                <option value="rating">Sort: Rating</option>
                <option value="reviews">Sort: Reviews</option>
              </select>
            </div>

            <div className={styles.leads}>
              {filtered.map((lead, i) => (
                <div key={i} className={`${styles.lead} ${styles[lead.tier]} fade-up`}>
                  <div className={styles.leadScore} style={{ color: lead.tier === 'hot' ? 'var(--hot)' : lead.tier === 'warm' ? 'var(--warm)' : 'var(--text-muted)' }}>
                    {lead.opportunityScore}
                  </div>
                  <div className={styles.leadBody}>
                    <div className={styles.leadName}>{lead.name}</div>
                    {lead.phone && (
                      <div style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '4px' }}>
                        📞 {lead.phone}
                      </div>
                    )}
                    <div className={styles.leadMeta}>
                      <span>{getWebsiteLabel(lead.website)}</span>
                      <span>·</span>
                      <span>{'★'.repeat(Math.round(lead.rating))}{'☆'.repeat(5 - Math.round(lead.rating))} {lead.rating || '—'}</span>
                      <span>·</span>
                      <span>{lead.reviews} reviews</span>
                    </div>
                    <div className={styles.pitchLine}>{lead.pitchAngle}</div>
                    <div className={styles.tags}>
                      {lead.weaknesses.map((w, j) => <span key={j} className={`${styles.tag} ${styles.tagBad}`}>{w}</span>)}
                      {lead.strengths.map((s, j) => <span key={j} className={`${styles.tag} ${styles.tagGood}`}>{s}</span>)}
                    </div>
                    {pitchTarget === lead.name && pitch && (
                      <div className={styles.pitchBox}>{pitch}</div>
                    )}
                    {pitching === lead.name && (
                      <div className={styles.pitchBox}>Generating pitch...</div>
                    )}
                  </div>
                  <div className={styles.leadActions}>
                    {lead.website && !lead.website.includes('facebook.com') && !lead.website.includes('instagram.com') && (
                      <a href={lead.website} target="_blank" rel="noreferrer" className={styles.actionBtn}>Site ↗</a>
                    )}
                    {lead.website && lead.website.includes('facebook.com') && (
                      <a href={lead.website} target="_blank" rel="noreferrer" className={styles.actionBtn}>📘 FB ↗</a>
                    )}
                    {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className={styles.actionBtn}>GBP ↗</a>}
                    <button className={`${styles.actionBtn} ${styles.pitchBtn}`} onClick={() => generatePitch(lead)}>
                      {pitching === lead.name ? '...' : 'Pitch'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}