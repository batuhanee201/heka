const TR_MAP: Record<string, string> = {
  ş: 's', ğ: 'g', ı: 'i', ö: 'o', ü: 'u', ç: 'c',
  Ş: 's', Ğ: 'g', İ: 'i', Ö: 'o', Ü: 'u', Ç: 'c',
}

export function slugify(text: string): string {
  return text
    .split('')
    .map((c) => TR_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
