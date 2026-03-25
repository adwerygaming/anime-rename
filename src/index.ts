import { input } from '@inquirer/prompts';
import fs from 'fs/promises';

import { Jikan } from './anire/Jikan.js';
import { CombineResult, FileParseResult, NewAnimeEntry } from './types/AniRe.types.js';
import { formatEpisode, formatSeason } from './utils/Helper.js';
import tags, { afterGradient, beforeGradient } from "./utils/Tags.js";

const jikan = new Jikan();

const allowedExtensions = [".mkv", ".mp4", ".avi"];
const folderPath = '/mnt/NAS/Harddisk/Download/test';

console.log(`[${tags.System}] Folder Path: ${folderPath}`)
const files = await fs?.readdir(folderPath)

console.log(`[${tags.System}] Fetched ${files.length} files from SMB share.`);

// Files loading
const parsed: FileParseResult[] = []
for (const file of files) {
    if (!allowedExtensions.some(ext => file.endsWith(ext))) {
        console.log(`[${tags.Warning}] ${file} has an unsupported extension.`);
        continue
    }

    const match = file.match(/^\[[^\]]+]\s+(.*?)\s+-\s+(\d+(?:v\d+)?)(?=\s|\.)/);
    if (!match) {
        console.log(`[${tags.Warning}] ${file} does not match the expected naming pattern.`);
        continue
    }

    // parse file extension
    const ext = file.match(/\.(mkv|mp4|avi)$/i)?.[1]?.toLowerCase();
    if (!ext || !allowedExtensions.includes(`.${ext}`)) {
        console.log(`[${tags.Warning}] ${file} has an invalid file extension.`);
        continue;
    }

    const [, anime, episodeNumber] = match;
    parsed.push({
        originalFilename: file,
        seriesTitle: anime.trim(),
        episodeNumber: parseInt(episodeNumber ?? 0),
        fileExtension: ext
    });
}

const aniMap = new Map<string, FileParseResult[]>();

// dedupe
for (const { episodeNumber, fileExtension, originalFilename, seriesTitle } of parsed) {
    if (!seriesTitle) {
        console.log(`[${tags.Error}] Failed to resolve ${originalFilename}`)
        continue
    };

    if (!aniMap.has(seriesTitle)) {
        aniMap.set(seriesTitle, []);
    }

    aniMap.get(seriesTitle)?.push({ originalFilename, seriesTitle, episodeNumber, fileExtension });
}

// transform 
const aniEntries = [...aniMap.entries()].map(([anime, episodes]) => ({ anime, episodes }));
if (aniEntries.length === 0) {
    console.log(`[${tags.Error}] No valid anime entries found in the directory.`);
    process.exit(1);
}

console.log()
console.log(`[${tags.System}] Found ${aniEntries.length} anime titles.`);
for (let i = 0; i < aniEntries.length; i++) {
    const { anime, episodes } = aniEntries[i];

    console.log(`[${tags.System}] [${i + 1}] ${anime}   [${episodes.length} eps] `);
}

// input 1 - select series
const seriesSelectionInput = await input({
    message: "[Select Series] >> ", default: "1", validate(value) {
        const index = parseInt(value);
        if (isNaN(index) || index < 1 || index > aniEntries.length) {
            return "Please enter a valid number corresponding to the anime series.";
        }
        return true;
    },
});
const selectedSeriesIndex = parseInt(seriesSelectionInput) - 1;
const selectedSeries = aniEntries[selectedSeriesIndex];

// input 2 - select season
// TODO: Detect season automatically. either using item.length / 12 or idk, bcs usually 1 season has around 12. some are not.
const animeSeasonSelectionInput = await input({
    message: "[Enter Season Number (e.g., 1, 2, 3)] >> ", default: "1", validate(value) {
        const index = parseInt(value);
        if (isNaN(index) || index < 1) {
            return "Please enter a valid number corresponding to the episode.";
        }
        return true;
    },
});
const selectedSeason = parseInt(animeSeasonSelectionInput);

// Fetching anime details from Jikan
console.log(`[${tags.System}] Searching for ${selectedSeries.anime} on Jikan...`);
const searchResults = await jikan.search(selectedSeries.anime);
if (searchResults.length === 0) {
    console.log(`[${tags.Error}] No results found for ${selectedSeries.anime} on Jikan.`);
    process.exit(1);
}

const selectedAnimeData = searchResults[0];
if (!selectedAnimeData) {
    console.log(`[${tags.Error}] Invalid selection.`);
    process.exit(1);
}

// anime details
const animeDetails = await jikan.fetchById(selectedAnimeData.mal_id ?? 0);
const animeEpisodes = await jikan.fetchEpisodesById(selectedAnimeData.mal_id ?? 0);

console.log(`[${tags.Jikan}] [Anime Details]`);
console.log(`[${tags.Jikan}] ${animeDetails?.title}`);
animeDetails?.synopsis?.split("\n").filter((x): x is string => x.length > 0).map((x) => console.log(`[${tags.Jikan}] ${x}`))
console.log(`[${tags.Jikan}] MAL ID         : ${animeDetails?.mal_id}`)
console.log(`[${tags.Jikan}] Episodes       : ${animeDetails?.episodes} Eps`)
console.log(`[${tags.Jikan}] Status         : ${animeDetails?.status}`);
console.log(`[${tags.Jikan}] Duration       : ${animeDetails?.duration}`);
console.log(`[${tags.Jikan}] Rating         : ${animeDetails?.rating}`);
console.log(`[${tags.Jikan}] Season         : ${animeDetails?.season}`);
console.log(`[${tags.Jikan}] Year           : ${animeDetails?.year}`);
console.log(`[${tags.Jikan}] Broadcast Time : ${animeDetails?.broadcast?.string}`);
console.log(`[${tags.Jikan}] Genres         : ${animeDetails?.genres?.map(s => s.name).join(", ")}`);
console.log(`[${tags.Jikan}] Studios        : ${animeDetails?.studios?.map(s => s.name).join(", ")}`);
console.log(`[${tags.Jikan}] Producers      : ${animeDetails?.producers?.map(s => s.name).join(", ")}`);
console.log(`[${tags.Jikan}] Learn More     : ${animeDetails?.url}`);

console.log(`\n[${tags.Jikan}] Fetched Episode Names:`);
const episodeNames: NewAnimeEntry[] = animeEpisodes?.map((ep, index) => {
    return {
        title: ep.title ?? ep.title_japanese ?? ep.title_romanji ?? `Episode ${index + 1}`,
        episodeNumber: index + 1
    }
}) ?? [];

for (let i = 0; i < episodeNames.length; i++) {
    const eps = episodeNames[i];

    const seasonStr = formatSeason(selectedSeason);
    const episodeStr = formatEpisode(eps.episodeNumber);

    console.log(`[${tags.Jikan}] -> [${seasonStr}${episodeStr}] ${eps.title}`);
}

const data = await combine(selectedSeason, selectedSeries.episodes, episodeNames);

console.log()
console.log(`[${tags.System}] Renaming preview:`)
for (const item of data) {
    console.log(`[${tags.System}] ${beforeGradient(`[-] ${item.originalFilename}`)}`)
    console.log(`[${tags.System}] ${afterGradient(`[+] ${item.finalFilename}`)}`)
}

const renameConfirmSelectionInput = await input({
    message: "[Confirm Rename (Y/N)] >> ", required: true, validate(value) {
        const validInputs = ['y', 'n'];
        if (!validInputs.includes(value.toLowerCase())) {
            return "Please enter 'Y' for yes or 'N' for no.";
        }
        return true;
    },
});

const renameConfirmed = renameConfirmSelectionInput.toLowerCase() === 'y';

if (renameConfirmed) {
    console.log(`[${tags.System}] Proceeding with renaming...`);
    console.log()

    let successCount = 0;
    let failedCount = 0;

    for (const item of data) {
        const oldPath = `${folderPath}/${item.originalFilename}`;
        const newPath = `${folderPath}/${item.finalFilename}`;

        try {
            console.log(`[${tags.Job}] Renaming`);
            console.log(`[${tags.Job}]  -> ${beforeGradient(item.originalFilename)}`);
            console.log(`[${tags.Job}]  -> ${afterGradient(item.finalFilename)}`);
            await fs.rename(oldPath, newPath);
            successCount++
        } catch (error) {
            console.log(`[${tags.Error}] Failed to rename ${item.originalFilename}: ${(error as Error).message}`);
            failedCount++
        }
    }

    console.log()
    console.log(`[${tags.System}] Renaming process completed. | Total: ${data.length} | Success: ${successCount} | Failed: ${failedCount}`);
} else {
    console.log(`[${tags.System}] Rename cancelled.`);
}

async function combine(seasonNumber: number, existing: FileParseResult[], latest: NewAnimeEntry[]): Promise<CombineResult[]> {
    const combined: CombineResult[] = [];

    for (const exist of existing) {
        const matched = latest.find(e => e.episodeNumber === exist.episodeNumber);

        const seasonStr = formatSeason(seasonNumber);
        const episodeStr = formatEpisode(exist.episodeNumber);
        const title = matched?.title ?? "Unknown Episode Title"
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