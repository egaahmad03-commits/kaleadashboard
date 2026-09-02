// supabase/functions/generate-description/index.ts
//
// Edge Function ini dipanggil dari admin panel (tombol "Generate dengan AI"
// di field Deskripsi). API key Gemini disimpan sebagai secret di server
// Supabase, TIDAK PERNAH dikirim ke browser — jadi aman dipakai di admin
// panel yang berjalan di GitHub Pages (frontend statis).
//
// Cara deploy (jalankan dari root project, butuh Supabase CLI):
//   supabase functions deploy generate-description
//   supabase secrets set GEMINI_API_KEY=AIxxxxxxxxxxxxxxxxxxxxxx
//
// Ambil API key gratis di: https://aistudio.google.com/apikey
//
// Setelah dideploy, fungsi otomatis bisa dipanggil dari admin.js lewat:
//   supabaseClient.functions.invoke('generate-description', { body: {...} })

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model Gemini yang dipakai. Alternatif lain: "gemini-2.0-flash-lite" (lebih murah/cepat)
// atau "gemini-1.5-pro" (lebih pintar, lebih mahal).
const GEMINI_MODEL = "gemini-2.0-flash";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, material, color, dimensions, category } = await req.json();

    if (!name || !material || !color || !dimensions) {
      return new Response(
        JSON.stringify({ error: "Data produk tidak lengkap (nama, material, warna, dimensi wajib diisi)." }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error('Secret GEMINI_API_KEY belum diset di Supabase (jalankan: supabase secrets set GEMINI_API_KEY=...).');
    }

    const prompt = `Buatkan deskripsi produk furniture untuk toko online Kalea Furniture dalam Bahasa Indonesia.
Maksimal 400 karakter, gaya menjual tapi natural (tidak berlebihan/bombastis), tanpa markdown, langsung satu paragraf.

Nama produk: ${name}
Kategori: ${category || "-"}
Material: ${material}
Warna: ${color}
Dimensi: ${dimensions}

Balas HANYA dengan teks deskripsinya saja, tanpa embel-embel, tanpa tanda kutip.`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.8,
          },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini API error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((part: any) => part.text || "")
      .join("")
      .trim();

    if (!text) throw new Error("AI tidak mengembalikan teks deskripsi.");

    return new Response(JSON.stringify({ description: text }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});