// Busca as avaliações reais do Google (Places API New) e grava em reviews.json.
// Rodado pelo GitHub Action .github/workflows/reviews.yml.
//
// Variáveis de ambiente esperadas:
//   GOOGLE_PLACES_API_KEY  -> secret do repositório (chave do Google Cloud)
//   PLACE_ID               -> variable do repositório (ID do local no Google)
//
// Observações:
//   - A Places API retorna no máximo 5 avaliações (limitação do Google).
//   - Atualizamos diariamente para respeitar os termos de cache do Google.

import { writeFile, readFile } from 'node:fs/promises';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.PLACE_ID;
const OUTPUT = new URL('../reviews.json', import.meta.url);

if (!API_KEY) {
  console.error('❌ Faltando GOOGLE_PLACES_API_KEY (secret do repositório).');
  process.exit(1);
}
if (!PLACE_ID) {
  console.error('❌ Faltando PLACE_ID (variable do repositório).');
  process.exit(1);
}

const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?languageCode=pt-BR`;

const res = await fetch(url, {
  headers: {
    'X-Goog-Api-Key': API_KEY,
    // Só pedimos os campos que usamos (mais barato e rápido):
    'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
  },
});

if (!res.ok) {
  const body = await res.text();
  console.error(`❌ Places API retornou ${res.status}: ${body}`);
  process.exit(1);
}

const data = await res.json();

const reviews = (data.reviews ?? [])
  .map((r) => ({
    author: r.authorAttribution?.displayName ?? 'Aluno(a) AcadMeta',
    authorUri: r.authorAttribution?.uri ?? data.googleMapsUri ?? '',
    photo: r.authorAttribution?.photoUri ?? '',
    rating: r.rating ?? 5,
    text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
    when: r.relativePublishTimeDescription ?? '',
    time: r.publishTime ?? '',
  }))
  // Só mostramos avaliações com texto e nota alta (prova social positiva):
  .filter((r) => r.text.length > 0 && r.rating >= 4)
  .sort((a, b) => (b.time > a.time ? 1 : -1));

const output = {
  updatedAt: new Date().toISOString(),
  placeUri: data.googleMapsUri ?? '',
  rating: data.rating ?? null,
  total: data.userRatingCount ?? null,
  reviews,
};

// Evita reescrever (e commitar) quando nada mudou de fato, ignorando o updatedAt.
let previous = null;
try {
  previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
} catch {
  /* arquivo ainda não existe */
}
const sameContent =
  previous &&
  JSON.stringify({ ...previous, updatedAt: null }) ===
    JSON.stringify({ ...output, updatedAt: null });

if (sameContent) {
  console.log('ℹ️  Avaliações inalteradas — mantendo reviews.json.');
} else {
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`✅ ${reviews.length} avaliação(ões) gravada(s) em reviews.json.`);
}
