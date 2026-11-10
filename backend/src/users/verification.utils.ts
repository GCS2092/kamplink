// Numero de carte: majuscules, sans espaces ni separateurs
export function normaliserCarte(v: string): string {
  return (v || '').toUpperCase().replace(/[\s\-_.\/]/g, '');
}

// Nom/prenom: sans accents, minuscules, espaces simplifies
export function normaliserNom(v: string): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}