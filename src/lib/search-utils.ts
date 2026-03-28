/**
 * Generates an array of lowercase search tokens from attendee name and company name.
 * Stored on TrainingRecord.searchTokens to enable Firestore array-contains prefix search.
 *
 * Strategy:
 * - Split both strings into words
 * - Add each word as a token
 * - Add prefixes (length 2–10) of each word so partial-word search works
 * - Add the full normalized strings
 */
export function generateSearchTokens(attendeeName: string, companyName: string, firstName?: string, lastName?: string): string[] {
    const tokens = new Set<string>();

    const normalize = (str: string) =>
        str.toLowerCase().trim().replace(/\s+/g, ' ');

    const addPrefixes = (word: string) => {
        if (word.length < 2) return;
        tokens.add(word);
        for (let i = 2; i <= Math.min(word.length, 10); i++) {
            tokens.add(word.substring(0, i));
        }
    };

    const nameNorm = normalize(attendeeName);
    const companyNorm = normalize(companyName);

    // Full normalized strings
    if (nameNorm) tokens.add(nameNorm);
    if (companyNorm) tokens.add(companyNorm);

    // Individual words and their prefixes
    nameNorm.split(' ').filter(Boolean).forEach(addPrefixes);
    companyNorm.split(' ').filter(Boolean).forEach(addPrefixes);

    // Also tokenize firstName and lastName separately when provided
    if (firstName) normalize(firstName).split(' ').filter(Boolean).forEach(addPrefixes);
    if (lastName) normalize(lastName).split(' ').filter(Boolean).forEach(addPrefixes);

    return Array.from(tokens).filter(t => t.length > 0);
}
