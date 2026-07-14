/**
 * Segments text into matching and non-matching parts for highlighting.
 */
export interface TextSegment {
  text: string;
  isMatch: boolean;
}

export function highlightText(text: string, query: string): TextSegment[] {
  if (!text || !query) {
    return [{ text, isMatch: false }];
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return [{ text, isMatch: false }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Find all occurrences of the query in the text
  let currentIndex = normalizedText.indexOf(normalizedQuery);

  while (currentIndex !== -1) {
    // Add non-matching text before the match
    if (currentIndex > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, currentIndex),
        isMatch: false,
      });
    }

    // Add matching text
    segments.push({
      text: text.substring(currentIndex, currentIndex + normalizedQuery.length),
      isMatch: true,
    });

    lastIndex = currentIndex + normalizedQuery.length;
    currentIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining non-matching text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isMatch: false,
    });
  }

  return segments;
}
