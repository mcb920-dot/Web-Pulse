import { useState } from 'react'
import styles from './App.module.css'

const TIERS = { hot: { label: '🔥 Hot', color: 'var(--hot)' }, warm: { label: '⚠️ Warm', color: 'var(--warm)' }, cold: { label: 'Cold', color: 'var(--cold)' } }

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

  const hot = leads.filter(l => l.tier === 'hot')
  const warm = leads.filter(l => l.tier === 'warm')
  const noSite = leads.filter(l => !l.website)

  async function runScan() {
    if (!trade || !city) return
    setLoading(true)
    setLeads([])
    setPitch('')
    setPitching(null)
    setStatusMsg('Scanning Google Places...')

    try {
     vercel --prod}

      setStatusMsg(`Found ${places.length} businesses — analyzing with AI...`)

      const businesses = places.map(p => ({
        name: p.displayName?.text || 'Unknown',
        address: p.formattedAddress || '',
        rating: p.rating || 0,
        reviews: p.userRatingCount || 0,
        website: p.websiteUri || '',
        phone: p.nationalPhoneNumber || '',
        mapsUrl: p.googleMapsUri || ''
      }))

      const prompt = `You are a local SEO analyst scoring ${trade} businesses in ${city}, ${state} as prospects for web design/SEO services.

For each business, output:
- opportunityScore: 1-10 (10 = weakest web presence = best opportunity)
- tier: "hot" (7-10), "warm" (4-6), "cold" (1-3)
- weaknesses: array of max 3 short strings
- strengths: array of max 2 short strings  
- pitchAngle: one punchy sentence max 15 words

Businesses:
${JSON.stringify(businesses.map(b => ({ name: b.name, hasWebsite: !!b.website, website: b.website || 'none', rating: b.rating, reviews: b.reviews })))}

Respond ONLY with a valid JSON array, no markdown fences, no extra text:
[{"name":"...","opportunityScore":8,"tier":"hot","weaknesses":["..."],"strengths":["..."],"pitchAngle":"..."}]`

      const aiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const aiData = await aiRes.json()
      const text = aiData.content?.[0]?.text || '[]'
      let analysis = []
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

      const merged = businesses.map((b, i) => {
        const ai = analysis.find(a => a.name === b.name) || analysis[i] || {}
        return { ...b, opportunityScore: ai.opportunityScore || 5, tier: ai.tier || 'warm', weaknesses: ai.weaknesses || [], strengths: ai.strengths || [], pitchAngle: ai.pitchAngle || '' }
      }).sort((a, b) => b.opportunityScore - a.opportunityScore)

      setLeads(merged)
      setStatusMsg(`${merged.length} businesses analyzed`)
    } catch (e) {
      setStatusMsg('Error: ' + e.message)
    }
    setLoading(false)
  }

  async function generatePitch(lead) {
    setPitching(lead.name)
    setPitch('')
    const prompt = `Write a short, direct cold outreach text message to pitch web design and SEO services to "${lead.name}" in ${city}, ${state}.

Their weaknesses: ${lead.weaknesses.join(', ') || 'weak online presence'}
Rating: ${lead.rating || 'unknown'} stars, ${lead.reviews} reviews
Has website: ${lead.website ? 'yes' : 'no'}

Keep it under 60 words. Casual, dude-to-dude tone. One clear ask. No fluff. Don't mention AI.`

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
    .filter(l => filter === 'all' || l.tier === filter)
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
                {['all', 'hot', 'warm', 'cold'].map(t => (
                  <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
                    {t === 'all' ? 'All' : t === 'hot' ? '🔥 Hot' : t === 'warm' ? '⚠️ Warm' : 'Cold'}
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
                    <div className={styles.leadMeta}>
                      <span>{lead.website ? lead.website.replace(/https?:\/\//,'').split('/')[0] : '⚠️ No website'}</span>
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
                    {pitching === lead.name && <div className={styles.pitchBox}>Generating pitch...</div>}
                    {pitch && pitching === null && filtered[0]?.name === lead.name && <div className={styles.pitchBox}>{pitch}</div>}
                  </div>
                  <div className={styles.leadActions}>
                    {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className={styles.actionBtn}>Site ↗</a>}
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

        {pitch && (
          <div className={styles.pitchModal}>
            <div className={styles.pitchModalInner}>
              <div className={styles.pitchModalTitle}>Cold Pitch</div>
              <div className={styles.pitchModalText}>{pitch}</div>
              <button className={styles.pitchModalClose} onClick={() => setPitch('')}>✕ Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
