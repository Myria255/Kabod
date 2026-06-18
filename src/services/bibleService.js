// services/bibleService.js
const API_BASE = 'https://api.scripture.api.bible/v1';

export const getChapter = async (apiKey, reference) => {
  const url = `${API_BASE}/bibles/F10/passages/${reference}?content-type=text&include-verse-numbers=true&include-titles=false`;
  const response = await fetch(url, {
    headers: { 'api-key': apiKey },
  });

  if (!response.ok) throw new Error('Erreur API');

  const data = await response.json();
  const content = data.data.content;

  const verseRegex = /<verse[^>]+osisb="([^"]+)"[^>]*>(.*?)<\/verse>/g;
  const verses = [];
  let match;
  let verseNum = 1;

  while ((match = verseRegex.exec(content)) !== null) {
    verses.push({
      id: match[1],
      verse: verseNum++,
      content: match[2],
    });
  }

  return verses;
};