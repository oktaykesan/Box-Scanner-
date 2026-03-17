/**
 * BoxScan — Gemini Multi-Photo Analysis Prompt
 * Backend: Node.js / Hono  |  Model: gemini-2.5-flash
 */

export interface PromptBoxItem {
    name: string;         // Türkçe eşya adı
    quantity: number;     // Adet (bilinmiyorsa 1)
    condition: "iyi" | "hasarlı" | "belirsiz";
}

export interface GeminiBoxAnalysis {
    suggestedLabel: string;       // Kutunun önerilen adı/etiketi
    suggestedShelf: string;       // Önerilen raf/bölge
    items: PromptBoxItem[];       // Tespit edilen eşyalar
    hasDangerousItems: boolean;
    dangerNotes: string;          // Tehlike açıklaması, yoksa ""
    hasDamagedItems: boolean;
    damageNotes: string;          // Hasar açıklaması, yoksa ""
    confidence: "yüksek" | "orta" | "düşük";
    analysisNotes: string;        // Ekstra gözlemler veya uyarılar
}

/**
 * Gemini'ye gönderilecek içerik parçalarını oluşturur.
 * base64Images: her fotoğrafın pure base64 stringi (data:... prefix'i olmadan)
 */
export function buildAnalysisPrompt(images: { data: string; mimeType: string }[]) {
    const imageCount = images.length;
    const angleDesc =
        imageCount === 1
            ? "tek bir açıdan çekilmiş fotoğraf"
            : `${imageCount} farklı açıdan çekilmiş fotoğraf`;

    // Fotoğraf parçaları
    const imageParts = images.map((img) => ({
        inlineData: {
            data: img.data,
            mimeType: img.mimeType,
        },
    }));

    // Metin prompt'u
    const textPart = {
        text: `
Sen bir depo envanter analisti yapay zekasısın. Sana bir depo kutusunun ${angleDesc} verildi.
${imageCount > 1 ? "Tüm fotoğraflar aynı kutunun farklı açılarını göstermektedir; birbirini tamamlayan bilgileri birleştirerek tek bir kapsamlı analiz yap." : ""}

Görevin:
1. Kutunun içindeki TÜM eşyaları tespit et.
2. Her eşyanın adını Türkçe olarak yaz.
3. Adetleri say; sayamıyorsan tahmini bir değer ver.
4. Her eşyanın durumunu değerlendir: "iyi", "hasarlı" veya "belirsiz".
5. Tehlikeli madde/nesne varsa (kimyasal, kesici, yanıcı vb.) mutlaka belirt.
6. Hasarlı veya kırık eşya varsa belirt.
7. Kutunun içeriğine uygun kısa ve açıklayıcı bir etiket/ad öner (örn: "Elektrik Malzemeleri", "Mutfak Eşyaları – Cam").
8. İçeriğe göre uygun bir depo rafı/bölgesi öner (örn: "Raf A – Ağır", "Soğuk Depo", "Tehlikeli Maddeler Bölümü").

ÇIKTI FORMATI — YALNIZCA aşağıdaki JSON yapısını döndür, başka hiçbir şey yazma:

{
  "suggestedLabel": "string",
  "suggestedShelf": "string",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "condition": "iyi" | "hasarlı" | "belirsiz"
    }
  ],
  "hasDangerousItems": boolean,
  "dangerNotes": "string",
  "hasDamagedItems": boolean,
  "damageNotes": "string",
  "confidence": "yüksek" | "orta" | "düşük",
  "analysisNotes": "string"
}

Önemli kurallar:
- Türkçe kullan, kısaltma yapma.
- Eşya adlarını genel kategoriler değil somut isimler olarak yaz (❌ "alet" → ✅ "tornavida").
- Göremediğin, emin olamadığın eşyaları listeye ekleme; bunun yerine analysisNotes'a yaz.
- JSON dışında açıklama, yorum veya markdown ekleme.
- confidence alanı: tüm eşyaları net görebildiysen "yüksek", kısmen görebildiysen "orta", büyük kısmı belirsizse "düşük".
`.trim(),
    };

    return [...imageParts, textPart];
}

/**
 * Gemini'nin döndürdüğü ham metni parse eder.
 * JSON dışı karakterleri (markdown fences, açıklamalar) temizler.
 */
export function parseGeminiResponse(rawText: string): GeminiBoxAnalysis {
    // Markdown code fence varsa temizle
    const cleaned = rawText
        .replace(/`{3,}(?:json)?\s*/gi, "")
        .replace(/`/g, "")
        .trim();

    // JSON bloğunu bul (ilk { ... son } arasını al)
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Gemini yanıtında geçerli JSON bulunamadı.");
    }

    const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr) as GeminiBoxAnalysis;

    // Temel validasyon
    if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error("Geçersiz analiz yanıtı: items alanı eksik.");
    }

    return parsed;
}
