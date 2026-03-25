import { input } from '@inquirer/prompts';
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

const filenames = [
    "[Erai-raws] Yuru Yuri - 01 ~ 12 [1080p][Multiple Subtitle]",
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 01 (1080p) [887D5425].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 02 (1080p) [B0FC0447].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 03 (1080p) [D2E630E1].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 04 (1080p) [B87BD10F].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 05 (1080p) [5D11F2E3].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 06 (1080p) [691303CA].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 07 (1080p) [F7CDC583].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 08 (1080p) [AACB608A].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 09 (1080p) [98F51D38].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 10 (1080p) [248F955E].mkv",   
    "[SubsPlease] Kirei ni Shite Moraemasu ka. - 11 (1080p) [E11AB06B].mkv",   
    "[SubsPlease] Mayonaka Heart Tune - 01 (1080p) [41C50075].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 02 (1080p) [7CC77279].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 03 (1080p) [18AEE19F].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 04 (1080p) [71EA58A5].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 05 (1080p) [7059D1C9].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 06 (1080p) [5DA67E24].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 07 (1080p) [950CC5E6].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 08 (1080p) [E83A7BF8].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 09 (1080p) [5313C481].mkv", 
    "[SubsPlease] Mayonaka Heart Tune - 10v2 (1080p) [05E798E7].mkv",          
    "[SubsPlease] Mayonaka Heart Tune - 11 (1080p) [C2BCA43A].mkv", 
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 01 (1080p) [345AED26].mkv",  
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 02 (1080p) [83AA643F].mkv",  
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 03 (1080p) [A389E1CE].mkv",  
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 04 (1080p) [FD41721B].mkv",  
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 05 (1080p) [6A5B18CF].mkv",  
    "[SubsPlease] Osananajimi to wa Love Comedy ni Naranai - 06 (1080p) [2702C687].mkv", 
    "[SubsPlease] Seihantai na Kimi to Boku - 01 (1080p) [5F55C10F].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 02 (1080p) [A48F7D34].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 03 (1080p) [E75878F5].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 04 (1080p) [65C845F7].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 05 (1080p) [84EBFB9C].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 06 (1080p) [45367606].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 07 (1080p) [C004A6E2].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 08 (1080p) [77447978].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 09 (1080p) [0ABED203].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 10 (1080p) [ED09924F].mkv",
    "[SubsPlease] Seihantai na Kimi to Boku - 11 (1080p) [27ABEA4D].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 01 (1080p) [AEC4A47C].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 02 (1080p) [0D0BC894].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 03 (1080p) [700338AD].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 04 (1080p) [6CC09867].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 05 (1080p) [B67F04F9].mkv",
    "[SubsPlease] Uruwashi no Yoi no Tsuki - 06 (1080p) [F3039486].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 01 (1080p) [CC3FE38D].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 02 (1080p) [71886F23].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 03 (1080p) [C1EAF12F].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 04 (1080p) [983D5E8C].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 05 (1080p) [1DCEBB2B].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 06 (1080p) [E98B2C56].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 07 (1080p) [7AD1E282].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 08 (1080p) [46B17205].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 09 (1080p) [490F41D9].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 10 (1080p) [502C0B45].mkv",
    "[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 11 (1080p) [A8EAAD73].mkv",
    "Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 19 (1080p) [A8EAAD73].mkv",
]

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

// console.log(`[${tags.System}] Found ${searchResults.length} results.`);
// for (let index = 0; index < searchResults.length; index++) {
//     const element = searchResults[index];
//     console.log(`  [${index + 1}] ${element.title} (ID: ${element.mal_id})`);
// }

// const selectedSearch = await input({
//     message: "[Select MAL Result] >> ", required: true, validate(value) {
//         const index = parseInt(value);
//         if (isNaN(index) || index < 1 || index > searchResults.length) {
//             return "Please enter a valid number corresponding to the search result.";
//         }
//         return true;
//     },
// });

// const selectedSearchIndex = parseInt(selectedSearch) - 1;
const selectedAnimeData = searchResults[0];

if (!selectedAnimeData) {
    console.log(`[${tags.Error}] Invalid selection.`);
    process.exit(1);
}

// console.log(`[${tags.System}] You selected: ${selectedAnimeData.title} (ID: ${selectedAnimeData.mal_id})`);

const animeDetails = await jikan.fetchById(selectedAnimeData.mal_id ?? 0);
const animeEpisodes = await jikan.fetchEpisodesById(selectedAnimeData.mal_id ?? 0);

console.log(`[${tags.System}] Anime Details:`);
console.log(`  Title: ${animeDetails?.title}`);
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