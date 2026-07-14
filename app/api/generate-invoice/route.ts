import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase-admin'



type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    // 1) Kullanıcıyı doğrula (Authorization header'daki token'dan)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Giriş yapılmamış' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }
    const userId = userData.user.id

    // 2) Gövdeyi oku
    const { clientName, clientEmail, items, notes, total } = (await req.json()) as {
      clientName: string
      clientEmail: string
      items: InvoiceItem[]
      notes: string
      total: number
    }

    if (!clientName || !clientEmail || !items?.length) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 })
    }

    const invoiceNumber = `INV-${Date.now()}`

    // 3) PDF oluştur
    const pdfBytes = await buildInvoicePdf({
      invoiceNumber,
      clientName,
      items,
      notes,
      total,
    })

    // 4) E-posta ile gönder
    await resend.emails.send({
      from: process.env.INVOICE_FROM_EMAIL!,
      to: clientEmail,
      subject: `Fatura ${invoiceNumber}`,
      text: `Merhaba ${clientName},\n\nEkte faturanızı bulabilirsiniz.\n\nToplam: ${total.toFixed(2)} TRY`,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
        },
      ],
    })

    // 5) Veritabanına kaydet (geçmiş faturalar için)
    await supabaseAdmin.from('invoices').insert({
      user_id: userId,
      client_name: clientName,
      client_email: clientEmail,
      invoice_number: invoiceNumber,
      items,
      total,
      notes,
    })

    return NextResponse.json({ success: true, invoiceNumber })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

async function buildInvoicePdf({
  invoiceNumber,
  clientName,
  items,
  notes,
  total,
}: {
  invoiceNumber: string
  clientName: string
  items: InvoiceItem[]
  notes: string
  total: number
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = 800

  page.drawText('FATURA', { x: 50, y, size: 24, font: boldFont })
  y -= 20
  page.drawText(invoiceNumber, { x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) })

  y -= 40
  page.drawText(`Müşteri: ${clientName}`, { x: 50, y, size: 12, font })

  y -= 40
  // Tablo başlığı
  page.drawText('Açıklama', { x: 50, y, size: 10, font: boldFont })
  page.drawText('Adet', { x: 330, y, size: 10, font: boldFont })
  page.drawText('Birim Fiyat', { x: 400, y, size: 10, font: boldFont })
  page.drawText('Tutar', { x: 500, y, size: 10, font: boldFont })
  y -= 10
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 20

  for (const item of items) {
    page.drawText(item.description, { x: 50, y, size: 10, font })
    page.drawText(String(item.quantity), { x: 330, y, size: 10, font })
    page.drawText(item.unit_price.toFixed(2), { x: 400, y, size: 10, font })
    page.drawText((item.quantity * item.unit_price).toFixed(2), { x: 500, y, size: 10, font })
    y -= 20
  }

  y -= 10
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 25

  page.drawText('TOPLAM', { x: 400, y, size: 12, font: boldFont })
  page.drawText(`${total.toFixed(2)} TRY`, { x: 480, y, size: 12, font: boldFont })

  if (notes) {
    y -= 50
    page.drawText('Not:', { x: 50, y, size: 10, font: boldFont })
    y -= 15
    page.drawText(notes, { x: 50, y, size: 10, font, maxWidth: 495 })
  }

  return pdfDoc.save()
}
