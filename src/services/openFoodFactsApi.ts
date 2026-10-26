// Open Food Facts API – sauber gekapselt, kein API-Key nötig
export interface OFFProduct {
  name: string
  brand?: string
  image?: string
  calories: number
  carbs: number
  sugar: number
  fat: number
  saturatedFat: number
  protein: number
  fiber: number
  salt: number
  sodium: number
  servingSize?: string
  servingQuantity?: number
  barcode: string
}

export interface OFFSearchResult {
  status: 'found' | 'not_found' | 'error'
  product?: OFFProduct
  message?: string
}

function normalizeProduct(code: string, p: Record<string, unknown>): OFFProduct {
  const nutriments = (p.nutriments as Record<string, unknown>) || {}
  const serving = (p.serving_size as string) || undefined

  return {
    name: String(p.product_name || p.product_name_de || p.product_name_en || 'Unbekanntes Produkt'),
    brand: p.brands ? String(p.brands) : undefined,
    image: p.image_small_url ? String(p.image_small_url) : p.image_url ? String(p.image_url) : undefined,
    calories: Math.round(Number(nutriments['energy-kcal_100g'] || nutriments['energy-kcal_100g'] || 0) * 10) / 10,
    carbs: Math.round(Number(nutriments.carbohydrates_100g || 0) * 10) / 10,
    sugar: Math.round(Number(nutriments.sugars_100g || 0) * 10) / 10,
    fat: Math.round(Number(nutriments.fat_100g || 0) * 10) / 10,
    saturatedFat: Math.round(Number(nutriments['saturated-fat_100g'] || nutriments.saturated-fat_100g || 0) * 10) / 10,
    protein: Math.round(Number(nutriments.proteins_100g || 0) * 10) / 10,
    fiber: Math.round(Number(nutriments.fiber_100g || nutriments.fiber || 0) * 10) / 10,
    salt: Math.round(Number(nutriments.salt_100g || nutriments.salt || 0) * 10) / 10,
    sodium: Math.round(Number(nutriments.sodium_100g || nutriments.sodium || 0) * 10) / 10,
    servingSize: serving,
    servingQuantity: p.serving_quantity ? Number(p.serving_quantity) : undefined,
    barcode: code,
  }
}

export async function lookupBarcode(barcode: string): Promise<OFFSearchResult> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_de,product_name_en,brands,image_small_url,image_url,nutriments,serving_size,serving_quantity`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!res.ok) {
      return { status: 'error', message: 'Server antwortete mit Fehler' }
    }

    const data = await res.json()

    if (data.status === 1 && data.product) {
      return { status: 'found', product: normalizeProduct(barcode, data.product) }
    } else {
      return { status: 'not_found', message: 'Produkt nicht in der Datenbank gefunden' }
    }
  } catch {
    return { status: 'error', message: 'Keine Internetverbindung oder Server nicht erreichbar' }
  }
}
