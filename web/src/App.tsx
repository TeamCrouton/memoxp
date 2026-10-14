import { useEffect, useState, type FormEvent } from 'react'

type Memo = { id: number; content: string; pinned: boolean; created_at: string }

const json = { 'Content-Type': 'application/json' }

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/memos')
      if (!res.ok) throw new Error()
      setMemos(await res.json())
    } catch {
      setError("Impossible de joindre l'API")
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/memos', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ content: text }),
    })
    if (!res.ok) {
      setError('Le mémo ne peut pas être vide')
      return
    }
    setText('')
    setError('')
    load()
  }

  async function togglePin(m: Memo) {
    await fetch(`/api/memos/${m.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ pinned: !m.pinned }),
    })
    load()
  }

  async function remove(id: number) {
    // 404 = déjà supprimé ailleurs : on rafraîchit simplement la liste
    await fetch(`/api/memos/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <main>
      <h1>memoXP</h1>
      <form onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nouveau mémo"
          aria-label="Nouveau mémo"
        />
        <button type="submit">Ajouter</button>
      </form>
      {error && <p className="error">{error}</p>}
      {memos.length === 0 ? (
        <p className="empty">Aucun mémo pour l'instant.</p>
      ) : (
        <ul>
          {memos.map((m) => (
            <li key={m.id} className={m.pinned ? 'pinned' : ''}>
              <span>{m.content}</span>
              <button onClick={() => togglePin(m)}>{m.pinned ? 'Désépingler' : 'Épingler'}</button>
              <button className="danger" onClick={() => remove(m.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
