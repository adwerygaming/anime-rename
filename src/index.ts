import { confirm, input, select } from '@inquirer/prompts';
import fs from 'fs';
import { rename } from 'fs/promises';

import path from 'path';
import { Jikan } from './anire/Jikan.js';
import { FileParseResult, NewAnimeEntry } from './types/AniRe.types.js';
import { combine, formatEpisode, formatSeason } from './utils/Helper.js';
import tags, { afterGradient, beforeGradient } from "./utils/Tags.js";

const jikan = new Jikan();

const allowedExtensions = [".mkv", ".mp4", ".avi"];

console.log(`[${tags.System}] Please enter the folder path containing your anime files. Supported formats: ${allowedExtensions.join(", ")}`);
const folderPath = await input({
    message: "[Enter Folder Path] >> ", required: true
});

if (!fs.existsSync(folderPath)) {
    console.log(`[${tags.Error}] Folder path does not exist: ${folderPath}`);
    process.exit(1);
}

async function start(): Promise<void> {
    while (true) {
        console.clear();

        console.log(`[${tags.System}] Folder Path: ${folderPath}`);
        console.log(`[${tags.System}] Reading files...`);
        const files = fs.readdirSync(folderPath, { withFileTypes: true }) ?? [];

        console.log(`[${tags.System}] Found ${files.length} files.`);
        console.log();

        // Files loading
        const parsed: FileParseResult[] = [];
        for (const file of files) {
            // ignore directories
            if (file.isDirectory()) {
                continue;
            }

            // ignore unacceptable file extensions
            if (!allowedExtensions.some(ext => file.name.endsWith(ext))) {
                console.log(`[${tags.Warning}] Skipped "${file.name}" has an unsupported extension.`);
                continue;
            }

            /**
             * ### Filename pattern matching
             * 
             * Expected pattern: `[GroupName] AnimeTitle - 01.mkv`
             * 
             * What works so far:
             * - [SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 01 (1080p) [CC3FE38D].mkv
             * - [Erai-raws] Yuru Yuri - 01 [1080p][Multiple Subtitle][CD192B75].mkv
            **/

            const match = file.name.match(/^\[[^\]]+]\s+(.*?)\s+-\s+(\d+(?:v\d+)?)(?=\s|\.)/);
            if (!match) {
                console.log(`[${tags.Warning}] Skipped "${file.name}" does not match the expected naming pattern. Already formatted?`);
                continue;
            }

            // parse file extension
            const ext = file.name.match(/\.(mkv|mp4|avi)$/i)?.[1]?.toLowerCase();
            if (!ext || !allowedExtensions.includes(`.${ext}`)) {
                console.log(`[${tags.Warning}] Skipped "${file.name}" has an invalid file extension.`);
                continue;
            }

            const [, anime, episodeNumber] = match;
            parsed.push({
                originalFilename: file.name,
                seriesTitle: anime.trim(),
                episodeNumber: parseInt(episodeNumber ?? 0),
                fileExtension: ext
            });
        }

        const aniMap = new Map<string, FileParseResult[]>();

        // dedupe
        for (const { episodeNumber, fileExtension, originalFilename, seriesTitle } of parsed) {
            if (!seriesTitle) {
                console.log(`[${tags.Error}] Failed to resolve "${originalFilename}"`);
                continue;
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
            continue;
        }

        console.log();
        console.log(`[${tags.System}] Found ${aniEntries.length} anime titles.`);

        // input 1 - select series
        const seriesChoices = aniEntries.map((entry, index) => {
            return {
                name: `${entry.anime}`,
                description: `${entry.episodes.length} unformatted episode(s)`,
                value: (index + 1).toString()
            };
        });

        const seriesSelectionInput = await select({
            choices: seriesChoices,
            message: "Select Series", default: "1"
        });
        const selectedSeries = aniEntries[parseInt(seriesSelectionInput) - 1];

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

        try {
            // Fetching anime details from Jikan
            console.log(`[${tags.System}] Searching for ${selectedSeries.anime} on Jikan...`);
            const searchResults = await jikan.search(selectedSeries.anime);
            if (searchResults.length === 0) {
                console.log(`[${tags.Error}] No results found for ${selectedSeries.anime} on Jikan.`);
                continue;
            }

            const selectedAnimeData = searchResults[0];
            if (!selectedAnimeData) {
                console.log(`[${tags.Error}] Invalid selection.`);
                continue;
            }

            const malId = selectedAnimeData?.mal_id;
            if (!malId) {
                console.log(`[${tags.Error}] Selected anime does not have a valid MAL ID.`);
                continue;
            }

            // anime details
            const animeDetails = await jikan.fetchById(malId);
            const animeEpisodes = await jikan.fetchEpisodesById(malId);

            console.clear();

            console.log(`[${tags.Jikan}] [Anime Details]`);
            console.log("");
            console.log(`[${tags.Jikan}] ${animeDetails?.title}`);
            animeDetails?.synopsis?.split("\n").filter((x): x is string => x.length > 0).map((x) => console.log(`[${tags.Jikan}] ${x}`));
            console.log("");
            console.log(`[${tags.Jikan}] MAL ID         : ${animeDetails?.mal_id}`);
            console.log(`[${tags.Jikan}] Episodes       : ${animeDetails?.episodes} Eps`);
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

            const jikanEntries: NewAnimeEntry[] = animeEpisodes?.map((ep, index) => {
                return {
                    title: ep.title ?? ep.title_japanese ?? ep.title_romanji ?? `Episode ${index + 1}`,
                    episodeNumber: index + 1
                };
            }) ?? [];

            console.log(`\n[${tags.Jikan}] Fetched Episode Names:`);
            for (let i = 0; i < jikanEntries.length; i++) {
                const eps = jikanEntries[i];

                const seasonStr = formatSeason(selectedSeason);
                const episodeStr = formatEpisode(eps.episodeNumber);

                console.log(`[${tags.Jikan}] -> [${seasonStr}${episodeStr}] ${eps.title}`);
            }

            const data = combine({
                seasonNumber: selectedSeason,
                localEntries: selectedSeries.episodes,
                jikanEntries
            });

            console.log();
            console.log(`[${tags.System}] Renaming preview:`);
            for (const item of data) {
                console.log(`[${tags.System}] ${beforeGradient(`[-] ${item.originalFilename}`)}`);
                console.log(`[${tags.System}] ${afterGradient(`[+] ${item.finalFilename}`)}`);
            }

            const renameConfirm = await confirm({ message: "Do you want to proceed with renaming?", default: false });

            if (renameConfirm) {
                console.log(`[${tags.System}] Proceeding with renaming...`);
                console.log();

                let successCount = 0;
                let failedCount = 0;

                for (const item of data) {
                    const oldPath = path.join(folderPath, item.originalFilename);
                    const newPath = path.join(folderPath, item.finalFilename);

                    try {
                        console.log(`[${tags.Job}] Renaming`);
                        console.log(`[${tags.Job}]  -> ${beforeGradient(item.originalFilename)}`);
                        console.log(`[${tags.Job}]  -> ${afterGradient(item.finalFilename)}`);

                        await rename(oldPath, newPath);

                        successCount++;
                    } catch (error) {
                        console.log(`[${tags.Error}] Failed to rename ${item.originalFilename}: ${(error as Error).message}`);
                        failedCount++;
                    }
                }

                console.log();
                console.log(`[${tags.System}] Renaming process completed. | Total: ${data.length} | Success: ${successCount} | Failed: ${failedCount}`);

                await input({
                    message: "Enter anything to go back to main menu."
                });

                continue;
            } else {
                console.log(`[${tags.System}] Rename cancelled.`);

                await input({
                    message: "Enter anything to go back to main menu."
                });

                continue;
            }
        } catch (e) {
            console.error(`[${tags.Error}] An error occurred.`);
            console.error(e);

            if (e instanceof Error) {
                if (e.name.includes("ExitPromptError")) return;
            }

            await input({
                message: "Enter anything to go back to main menu."
            });

            continue;
        }
    }
}

await start();

process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    // nothing...
    return;
  } else {
    // Rethrow unknown errors
    throw error;
  }
});