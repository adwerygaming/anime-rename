import { CombineProp, CombineResult } from "../types/AniRe.types.js";

export function formatSeason(seasonNumber: number | null): string {
    if (seasonNumber === null) return "S??";
    return `S${seasonNumber.toString().padStart(2, '0')}`;
}

export function formatEpisode(episodeNumber: number | null): string {
    if (episodeNumber === null) return "E??";
    return `E${episodeNumber.toString().padStart(2, '0')}`;
}

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