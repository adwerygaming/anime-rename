export function formatSeason(seasonNumber: number | null): string {
    if (seasonNumber === null) return "S??";
    return `S${seasonNumber.toString().padStart(2, '0')}`;
}

export function formatEpisode(episodeNumber: number | null): string {
    if (episodeNumber === null) return "E??";
    return `E${episodeNumber.toString().padStart(2, '0')}`;
}