import { input } from '@inquirer/prompts';
import fs from 'fs/promises';
import gradient from 'gradient-string';

import { Jikan } from './anire/Jikan.js';
import tags from "./utils/Tags.js";

const jikan = new Jikan();

interface ParsedFilename {
    raw: string;
    anime: string | null;
    episodeNumber: number | null;
    extension: string | null;
}

interface NewAnimeEntry {
    title: string;
    episodeNumber: number | null;
}

interface CombineResult {
    raw: string;
    seriesTitle: string;
    seasonNumber: number | null;
    episodeNumber: number | null;
    episodeTitle: string | null;
    finalFilename: string;
    extension: string | null;
}

const dir = '/mnt/NAS/Media/Devan/Videos/New Folder';

const filenames = await fs.readdir(dir);

console.log(`[${tags.System}] Fetched ${filenames.length} files from SMB share.`);

const allowedExtensions = [".mkv", ".mp4", ".avi"];

const parsed: ParsedFilename[] = filenames.map(name => {
    if (!allowedExtensions.some(ext => name.endsWith(ext))) {
        return { raw: name, anime: null, episodeNumber: null, extension: null };
    }

    const match = name.match(/^\[[^\]]+]\s+(.*?)\s+-\s+(\d+(?:v\d+)?)(?=\s|\.)/);
    if (!match) return { raw: name, anime: null, episodeNumber: null, extension: null };

    // parse file extension
    const ext = name.match(/\.(mkv|mp4|avi)$/i)?.[1]?.toLowerCase();
    if (!ext || !allowedExtensions.includes(`.${ext}`)) {
        return { raw: name, anime: null, episodeNumber: null, extension: null };
    }

    const [, anime, episodeNumber] = match;
    return { raw: name, anime: anime.trim(), episodeNumber: parseInt(episodeNumber) || null, extension: ext };
});

const anilist = new Map<string, ParsedFilename[]>();

for (const { raw, anime, episodeNumber, extension } of parsed) {
    if (!anime) {
        console.log(`[${tags.Error}] Failed to resolve ${raw}`)
        continue
    };

    if (!anilist.has(anime)) {
        anilist.set(anime, []);
    }

    anilist.get(anime)?.push({ raw, anime, episodeNumber, extension });
}

const anientries = Array.from(anilist.entries()).map(([anime, episodes]) => ({ anime, episodes }));

if (anientries.length === 0) {
    console.log(`[${tags.Error}] No valid anime entries found in the directory.`);
    process.exit(1);
}

console.log(`[${tags.System}] Detected ${anientries.length} unique anime titles.\n`);

for (let i = 0; i < anientries.length; i++) {
    const { anime, episodes } = anientries[i];

    console.log(`[${tags.System}] [${i + 1}] ${anime}   [${episodes.length} eps] `);
    // console.log(`${episodes.map(e => `  [E${e.episodeNumber}] ${e.raw}`).join("\n")}`);
    // console.log()
}

const seriesSelectionInput = await input({
    message: "[Select Series] >> ", required: true, validate(value) {
        const index = parseInt(value);
        if (isNaN(index) || index < 1 || index > anientries.length) {
            return "Please enter a valid number corresponding to the anime series.";
        }
        return true;
    },
});

const selectedSeriesIndex = parseInt(seriesSelectionInput) - 1;
const selectedSeries = anientries[selectedSeriesIndex];

const animeSeasonSelectionInput = await input({
    message: "[Enter Season Number (e.g., 1, 2, 3)] >> ", required: true, validate(value) {
        const index = parseInt(value);
        if (isNaN(index) || index < 1) {
            return "Please enter a valid number corresponding to the episode.";
        }
        return true;
    },
});

const selectedSeason = parseInt(animeSeasonSelectionInput);

console.log(`[${tags.System}] Searching for ${selectedSeries.anime} on MAL...`);

const searchResults = await jikan.search(selectedSeries.anime);

if (searchResults.length === 0) {
    console.log(`[${tags.Error}] No results found for ${selectedSeries.anime} on MAL.`);
    process.exit(1);
}

const selectedAnimeData = searchResults[0];

if (!selectedAnimeData) {
    console.log(`[${tags.Error}] Invalid selection.`);
    process.exit(1);
}

const animeDetails = await jikan.fetchById(selectedAnimeData.mal_id ?? 0);
const animeEpisodes = await jikan.fetchEpisodesById(selectedAnimeData.mal_id ?? 0);

console.log(`[${tags.System}] Anime Details:`);
console.log(`  Title: ${animeDetails?.title}`);
console.log(`  Synopsis: ${animeDetails?.synopsis}`);
console.log(`  Episodes: ${animeDetails?.episodes}`)
console.log(`  Status: ${animeDetails?.status}`);

console.log(`\n[${tags.System}] Fetched Episode Names:`);
const episodeNames: NewAnimeEntry[] = animeEpisodes?.map((ep, index) => {
    return {
        title: ep.title ?? ep.title_japanese ?? ep.title_romanji ?? `Episode ${index + 1}`,
        episodeNumber: index + 1
    }
}) ?? [];

for (let i = 0; i < episodeNames.length; i++) {
    const element = episodeNames[i];
    console.log(`  [E${element.episodeNumber}] ${element.title}`);
}

console.log(`[${tags.System}] Renaming preview:`)

const data = await combine(selectedSeason, selectedSeries.episodes, episodeNames);

const beforeGradientColors = ['#E74C3C', '#C0392B'];
const afterGradientColors = ['#2ECC71', '#27AE60'];

const beforeGradient = gradient(beforeGradientColors);
const afterGradient = gradient(afterGradientColors);

for (const item of data) {
    console.log(beforeGradient(`[-] ${item.raw}`))
    console.log(afterGradient(`[+] ${item.finalFilename}`))
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

    for (const item of data) {
        const oldPath = `${dir}/${item.raw}`;
        const newPath = `${dir}/${item.finalFilename}`;

        try {
            await fs.rename(oldPath, newPath);
            console.log(`[${tags.Job}] Renamed`);
            console.log(`  From: ${item.raw}`);
            console.log(`  To: ${item.finalFilename}`);
        } catch (error) {
            console.log(`[${tags.Error}] Failed to rename ${item.raw}: ${(error as Error).message}`);
        }
    }

    console.log(`[${tags.System}] Renaming process completed.`);
} else {
    console.log(`[${tags.System}] Rename cancelled.`);
}

async function combine(seasonNumber: number, existing: ParsedFilename[], latest: NewAnimeEntry[]): Promise<CombineResult[]> {
    const combined: CombineResult[] = [];

    for (const exist of existing) {
        const matched = latest.find(e => e.episodeNumber === exist.episodeNumber);

        const seasonStr = `S${seasonNumber.toString().padStart(2, '0')}`;
        const episodeStr = `E${exist.episodeNumber?.toString().padStart(2, '0') ?? "??"}`;
        const title = matched?.title ?? "Unknown Episode Title"
        const fileExt = exist.extension ? `.${exist.extension}` : "";

        const finalFilename = `${exist.anime} - ${seasonStr}${episodeStr} - ${title}${fileExt}`;

        combined.push({
            raw: exist.raw,
            seriesTitle: exist.anime ?? "Unknown Series",
            seasonNumber,
            episodeNumber: exist.episodeNumber,
            episodeTitle: matched?.title ?? null,
            extension: exist.extension,
            finalFilename
        });
    }

    return combined;
}