'use client'

import {useState, useEffect} from 'react'
import {createClient} from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
}

export default function Home() {
  const supabase = createClient()

  // --- Auth durumu ---
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // --- Form durumu ---
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  useEffect(() => {
    
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
  
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (!error) setMagicLinkSent(true)
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string) {
    const newItems = [...items]
    if (field === 'description') {
      newItems[index][field] = value
    } else {
      newItems[index][field] = Number(value)
    }
    setItems(newItems)
  }

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setResultMessage(null)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/generate-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ clientName, clientEmail, items, notes, total }),
    })

    setSending(false)

    if (res.ok) {
      setResultMessage('Fatura oluşturuldu ve gönderildi.')
      setClientName('')
      setClientEmail('')
      setItems([{ description: '', quantity: 1, unit_price: 0 }])
      setNotes('')
    } else {
      setResultMessage('Bir hata oluştu, tekrar dene.')
    }
  }

  // --- Giriş yapılmamışsa: magic link formu ---
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-full max-w-sm p-8 bg-white rounded-lg border border-neutral-200">
          <h1 className="text-xl font-semibold mb-1">Fatura Oluşturucu</h1>
          <p className="text-sm text-neutral-500 mb-6">E-postanla giriş yap, şifre gerekmez.</p>

          {magicLinkSent ? (
            <p className="text-sm text-neutral-700">
              {email} adresine bir giriş linki gönderdik. Gelen kutunu kontrol et.
            </p>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                required
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full bg-neutral-900 text-white rounded-md py-2 text-sm font-medium"
              >
                Giriş linki gönder
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  // --- Giriş yapılmışsa: fatura formu ---
  return (
    <main className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-neutral-200 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Yeni Fatura</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Çıkış yap
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Müşteri adı</label>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Müşteri e-postası</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Kalemler</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Açıklama"
                    required
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    className="w-16 border border-neutral-300 rounded-md px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Birim fiyat"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                    className="w-28 border border-neutral-300 rounded-md px-2 py-2 text-sm"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-neutral-400 hover:text-red-500 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              + Kalem ekle
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Not (opsiyonel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
            <span className="text-sm text-neutral-500">Toplam</span>
            <span className="text-lg font-semibold">{total.toFixed(2)} ₺</span>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-neutral-900 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Gönderiliyor...' : 'Fatura oluştur ve gönder'}
          </button>

          {resultMessage && (
            <p className="text-sm text-center text-neutral-600">{resultMessage}</p>
          )}
        </form>
      </div>
    </main>
  )
}

