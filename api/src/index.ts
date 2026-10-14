import express from 'express'
import pg from 'pg'

const PORT = Number(process.env.PORT ?? 4000)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

export const app = express()
app.use(express.json())

// Sonde de santé : utilisée par Docker, la CI et Kubernetes.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev' })
  } catch {
    res.status(503).json({ status: 'base indisponible' })
  }
})

// Liste des mémos : épinglés d'abord, puis les plus récents.
app.get('/api/memos', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM memos ORDER BY pinned DESC, created_at DESC, id DESC')
  res.json(rows)
})

// Création : un mémo vide est refusé (422).
app.post('/api/memos', async (req, res) => {
  const content = String(req.body?.content ?? '').trim()
  if (!content) {
    res.status(422).json({ error: 'Le contenu est obligatoire' })
    return
  }
  if (content.length > 2000) {
    res.status(422).json({ error: 'Le contenu dépasse 2000 caractères' })
    return
  }
  const { rows } = await pool.query('INSERT INTO memos (content) VALUES ($1) RETURNING *', [content])
  res.status(201).json(rows[0])
})

// Épingler / désépingler.
app.patch('/api/memos/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.sendStatus(404)
    return
  }
  const { rows } = await pool.query('UPDATE memos SET pinned = $1 WHERE id = $2 RETURNING *', [
    Boolean(req.body?.pinned),
    id,
  ])
  if (rows.length === 0) {
    res.sendStatus(404)
    return
  }
  res.json(rows[0])
})

// Suppression : 204 si supprimé, 404 s'il n'existait pas (ou plus).
app.delete('/api/memos/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.sendStatus(404)
    return
  }
  const result = await pool.query('DELETE FROM memos WHERE id = $1', [id])
  res.sendStatus(result.rowCount ? 204 : 404)
})

async function start() {
  // La table est créée au démarrage si elle n'existe pas encore.
  await pool.query(`CREATE TABLE IF NOT EXISTS memos (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)
  const server = app.listen(PORT, () => console.log(`API prête sur le port ${PORT}`))

  // Arrêt propre quand Docker ou Kubernetes envoie SIGTERM.
  process.on('SIGTERM', () => {
    console.log('SIGTERM reçu, arrêt propre')
    server.close(() => pool.end().then(() => process.exit(0)))
  })
}

start().catch((err) => {
  console.error('Démarrage impossible :', err)
  process.exit(1)
})
