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
    if (!tag.trim()) return false;
    if (tag.length > 20) return false;
    if (tag.split(' ').length > 1) return false; // Only single words
    return true;
  });
}

export function getTagServiceLoadingState(): boolean {
  return isTagServiceLoading;
}

export async function suggestTagsFromBody(
  noteBody: string,
  noteTitle?: string,
): Promise<string[]> {
  if (!noteBody || !noteBody.trim()) {
    throw new Error('Note body is required to generate tag suggestions.');
  }

  // Extract keywords from both title and body
  const titleKeywords = noteTitle ? extractKeywords(noteTitle) : [];
  const bodyKeywords = extractKeywords(noteBody);
  const allKeywords = Array.from(
    new Set([...titleKeywords, ...bodyKeywords]),
  );

  if (allKeywords.length === 0) {
    return [];
  }

  isTagServiceLoading = true;

  try {
    // Start with the keywords themselves (primary tags)
    const primaryTags = filterTags(allKeywords);

    // Fetch synonyms for variety (only 1-2 per keyword)
    const synonymResponses = await Promise.all(
      allKeywords.map(async keyword => {
        try {
          const url = `${DATAMUSE_ENDPOINT}?rel_syn=${encodeURIComponent(
            keyword,
          )}&max=5`;
          const response = await fetch(url);
          if (!response.ok) return [];

          const data = (await response.json()) as DatamuseWord[];
          return data
            .map(item => String(item.word ?? '').trim())
            .filter(Boolean)
            .slice(0, 1); // Only 1 synonym per keyword
        } catch {
          return [];
        }
      }),
    );

    const synonymTags = filterTags(synonymResponses.flat());

    // Combine: primary keywords first, then synonyms
    const allTags = Array.from(new Set([...primaryTags, ...synonymTags]));
    return allTags.slice(0, 8);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown tag service error';
    throw new Error(`Failed to suggest tags: ${message}`);
  } finally {
    isTagServiceLoading = false;
  }
}
