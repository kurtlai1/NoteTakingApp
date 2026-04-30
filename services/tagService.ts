const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words';

let isTagServiceLoading = false;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'by',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'his',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'she',
  'so',
  'that',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'us',
  'was',
  'we',
  'were',
  'will',
  'with',
  'you',
  'your',
]);

type DatamuseWord = {
  word?: string;
};

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(
      word => word.length > 2 && word.length <= 15 && !STOP_WORDS.has(word),
    );

  const uniqueKeywords = Array.from(new Set(words));
  return uniqueKeywords.slice(0, 5);
}

function filterTags(tags: string[]): string[] {
  return tags.filter(tag => {
    // Remove overly long tags (often obscure scientific names)
    if (tag.length > 15) return false;
    // Remove tags with multiple spaces (phrases that aren't concise)
    if (tag.split(' ').length > 2) return false;
    // Remove empty strings
    if (!tag.trim()) return false;
    return true;
  });
}

export function getTagServiceLoadingState(): boolean {
  return isTagServiceLoading;
}

export async function suggestTagsFromBody(noteBody: string): Promise<string[]> {
  if (!noteBody || !noteBody.trim()) {
    throw new Error('Note body is required to generate tag suggestions.');
  }

  const keywords = extractKeywords(noteBody);
  if (keywords.length === 0) {
    return [];
  }

  isTagServiceLoading = true;

  try {
    const responses = await Promise.all(
      keywords.map(async keyword => {
        try {
          // Fetch related adjectives (practical descriptors)
          const adjUrl = `${DATAMUSE_ENDPOINT}?rel_jjb=${encodeURIComponent(
            keyword,
          )}&max=5`;
          const adjResponse = await fetch(adjUrl);
          const adjData =
            adjResponse.ok ? ((await adjResponse.json()) as DatamuseWord[]) : [];
          const adjTags = adjData.map(item => String(item.word ?? '').trim())
            .filter(Boolean)
            .slice(0, 2);

          // Fetch synonyms (direct related words)
          const synUrl = `${DATAMUSE_ENDPOINT}?rel_syn=${encodeURIComponent(
            keyword,
          )}&max=5`;
          const synResponse = await fetch(synUrl);
          const synData =
            synResponse.ok ? ((await synResponse.json()) as DatamuseWord[]) : [];
          const synTags = synData.map(item => String(item.word ?? '').trim())
            .filter(Boolean)
            .slice(0, 2);

          // Fetch broader categories (more general kinds)
          const genUrl = `${DATAMUSE_ENDPOINT}?rel_gen=${encodeURIComponent(
            keyword,
          )}&max=5`;
          const genResponse = await fetch(genUrl);
          const genData =
            genResponse.ok ? ((await genResponse.json()) as DatamuseWord[]) : [];
          const genTags = genData.map(item => String(item.word ?? '').trim())
            .filter(Boolean)
            .slice(0, 2);

          // Fetch specific subtypes (specific kinds)
          const spcUrl = `${DATAMUSE_ENDPOINT}?rel_spc=${encodeURIComponent(
            keyword,
          )}&max=5`;
          const spcResponse = await fetch(spcUrl);
          const spcData =
            spcResponse.ok ? ((await spcResponse.json()) as DatamuseWord[]) : [];
          const spcTags = spcData.map(item => String(item.word ?? '').trim())
            .filter(Boolean)
            .slice(0, 2);

          // Combine: adjectives, synonyms, categories, then subtypes
          return [...adjTags, ...synTags, ...genTags, ...spcTags];
        } catch (error) {
          console.warn(
            `Tag fetch error for "${keyword}":`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          return [];
        }
      }),
    );

    let merged = responses.flat().map(tag => tag.toLowerCase());
    merged = filterTags(merged);
    const deduped = Array.from(new Set(merged));
    return deduped.slice(0, 8);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown tag service error';
    throw new Error(`Failed to suggest tags: ${message}`);
  } finally {
    isTagServiceLoading = false;
  }
}
