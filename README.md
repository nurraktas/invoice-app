# Invoice App

Magic link ile giriş yapılan, Supabase üzerinden kimlik doğrulanan ve
oluşturulan faturaları PDF olarak müşteriye e-posta ile gönderen bir
Next.js uygulaması.

## Özellikler

- **Kimlik doğrulama:** Supabase Auth ile şifresiz (magic link) giriş.
  Giriş linki `app/auth/callback/route.ts` üzerinden oturuma çevrilir.
- **Fatura oluşturma:** `app/page.tsx` üzerindeki formla müşteri bilgisi
  ve kalemler girilir.
- **PDF üretimi:** `pdf-lib` ile sunucu tarafında fatura PDF'i oluşturulur
  (`app/api/generate-invoice/route.ts`). Türkçe karaktere özgü `ş, ğ, ı, İ`
  gibi harfler, standart WinAnsi fontunda desteklenmediği için Latin
  karşılıklarına çevrilir.
- **E-posta gönderimi:** Oluşturulan PDF, `resend` üzerinden müşteriye
  ek olarak gönderilir.
- **Kayıt:** Her fatura, ilgili kullanıcıya bağlı olarak Supabase
  `invoices` tablosuna kaydedilir.

## Başlarken

Bağımlılıkları kurun:

```bash
npm install
```

Ortam değişkenlerini tanımlayın (`.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
INVOICE_FROM_EMAIL=
```

Supabase projenizin **Authentication → URL Configuration** kısmına,
magic link'lerin dönebileceği redirect URL'i eklemeyi unutmayın
(örn. `http://localhost:3000/auth/callback` ve prod domain'iniz).

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini açarak sonucu görebilirsiniz.

## Proje yapısı

```
app/
  page.tsx                    → Giriş formu ve fatura oluşturma arayüzü
  auth/callback/route.ts      → Magic link kodu için oturum değişimi
  api/generate-invoice/route.ts → PDF oluşturma, e-posta gönderme, kayıt
lib/
  supabase-client.ts          → Tarayıcı tarafı Supabase client
  supabase-server.ts          → Sunucu tarafı Supabase client (cookie tabanlı)
  supabase-admin.ts           → Service role ile admin Supabase client
```

## Kullanılan başlıca paketler

- [Next.js](https://nextjs.org)
- [@supabase/ssr](https://supabase.com/docs/guides/auth/server-side) / [@supabase/supabase-js](https://supabase.com/docs/reference/javascript)
- [pdf-lib](https://pdf-lib.js.org/) — PDF oluşturma
- [resend](https://resend.com/) — e-posta gönderimi

## Dağıtım

Vercel üzerinden dağıtırken yukarıdaki ortam değişkenlerinin proje
ayarlarına eklendiğinden ve Supabase redirect URL listesinin prod
domain'i içerdiğinden emin olun. Detaylar için
[Next.js deployment dokümantasyonu](https://nextjs.org/docs/app/building-your-application/deploying).
