/** Whether a game title contains the search term, ignoring case and surrounding whitespace. */
export function matchesGameTitle(title: string, searchTerm: string): boolean {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    return title.toLowerCase().includes(normalizedSearchTerm);
}
