import { CombineProp, CombineResult } from "../types/AniRe.types.js";

/**
 * Formats season number into string format with leading zeros.
 * @param seasonNumber 
 * @returns A formatted season string (e.g., "S01") or "S??" if null
 */
export function formatSeason(seasonNumber: number | null): string {
    if (seasonNumber === null) return "S??";
    return `S${seasonNumber.toString().padStart(2, '0')}`;
}

/**
 * Formats episode number into string format with leading zeros.
 * @param episodeNumber 
 * @returns A formatted episode string (e.g., "E01") or "E??" if null
 */
export function formatEpisode(episodeNumber: number | null): string {
    if (episodeNumber === null) return "E??";
    return `E${episodeNumber.toString().padStart(2, '0')}`;
}

/**
 * Combines local file entries with Jikan episode data to create a list of combined results with formatted filenames.
 * @param options - Combination options
 * @param options.seasonNumber - The season number for formatting
 * @param options.localEntries - Array of local file entries to process
 * @param options.jikanEntries - Array of Jikan episode data to match against
 * @returns An array of combined results with original filenames mapped to formatted output filenames
 */
export function combine({ seasonNumber, localEntries, jikanEntries }: CombineProp): CombineResult[] {
    const combined: CombineResult[] = [];

    for (const local of localEntries) {
        const epsNumberExist = local.episodeNumber !== null;
        const matched = epsNumberExist ? jikanEntries.find(jikan => jikan.episodeNumber === local.episodeNumber) : undefined;

        if (!matched) continue;

        const seasonStr = formatSeason(seasonNumber);
        const episodeStr = formatEpisode(local.episodeNumber);
        const title = matched?.title ?? "Unknown Episode Title";
        const fileExt = local.fileExtension ? `.${local.fileExtension}` : "";

        const finalFilename = `${local.seriesTitle} - ${seasonStr}${episodeStr} - ${title}${fileExt}`;

        combined.push({
            originalFilename: local.originalFilename,
            seriesTitle: local.seriesTitle,
            episodeNumber: local.episodeNumber,
            fileExtension: local.fileExtension,
            episodeTitle: title,
            seasonNumber,
            finalFilename
        });
    }

    return combined;
}