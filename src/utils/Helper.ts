import { CombineResult, FileParseResult, NewAnimeEntry } from "../types/AniRe.types.js";

export function formatSeason(seasonNumber: number | null): string {
    if (seasonNumber === null) return "S??";
    return `S${seasonNumber.toString().padStart(2, '0')}`;
}

export function formatEpisode(episodeNumber: number | null): string {
    if (episodeNumber === null) return "E??";
    return `E${episodeNumber.toString().padStart(2, '0')}`;
}

export async function combine(seasonNumber: number, existing: FileParseResult[], latest: NewAnimeEntry[]): Promise<CombineResult[]> {
    const combined: CombineResult[] = [];

    for (const exist of existing) {
        const matched = latest.find(e => e.episodeNumber === exist.episodeNumber);

        const seasonStr = formatSeason(seasonNumber);
        const episodeStr = formatEpisode(exist.episodeNumber);
        const title = matched?.title ?? "Unknown Episode Title";
        const fileExt = exist.fileExtension ? `.${exist.fileExtension}` : "";

        const finalFilename = `${exist.seriesTitle} - ${seasonStr}${episodeStr} - ${title}${fileExt}`;

        combined.push({
            originalFilename: exist.originalFilename,
            seriesTitle: exist.seriesTitle,
            episodeNumber: exist.episodeNumber,
            fileExtension: exist.fileExtension,
            episodeTitle: title,
            seasonNumber,
            finalFilename
        });
    }

    return combined;
}