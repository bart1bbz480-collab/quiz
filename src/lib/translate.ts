// Gratis vertaling via MyMemory API (geen sleutel nodig, max ~5000 tekens/dag per IP)

type LangPair = 'nl|fr' | 'nl|en'

export async function translate(text: string, langpair: LangPair): Promise<string> {
  if (!text.trim()) return ''
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Vertaling mislukt')
  const json = await res.json() as { responseStatus: number; responseData: { translatedText: string } }
  if (json.responseStatus !== 200) throw new Error('Vertaling mislukt')
  return json.responseData.translatedText
}
