const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words';

let isTagServiceLoading = false;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'she',
  'so', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'us',
  'was', 'we', 'were', 'will', 'with', 'you', 'your',
]);

type DatamuseWord = {
  word?: string;
};

function extractKeywords(noteBody: string): string[] {
  const words = noteBody
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  const uniqueKeywords = Array.from(new Set(words));
  return uniqueKeywords.slice(0, 3);
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
        const url = `${DATAMUSE_ENDPOINT}?ml=${encodeURIComponent(keyword)}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Datamuse request failed for "${keyword}" with ${response.status}`);
        }

        const data = (await response.json()) as DatamuseWord[];
        return data.map(item => String(item.word ?? '').trim()).filter(Boolean);
      }),
    );

    const merged = responses.flat().map(tag => tag.toLowerCase());
    const deduped = Array.from(new Set(merged));
    return deduped.slice(0, 5);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown tag service error';
    throw new Error(`Failed to suggest tags: ${message}`);
  } finally {
    isTagServiceLoading = false;
  }
}
