import { select, Separator } from "@inquirer/prompts";
import { getAnimeSearch } from "@lightweight-clients/jikan-api-lightweight-client";
import { Anime } from "@lightweight-clients/jikan-api-lightweight-client/dist/raw-types.js";
import path from "node:path";

import { ProposedRenameResult, SelectSeriesResult } from "../index.js";
import tags, { afterGradient, staleGradient } from "../utils/Tags.js";
import { JikanCacheService } from "./database/JikanCache.js";
import { JikanWrapper } from "./JikanWrapper.js";

const jikanCache = new JikanCacheService();
const jikanWrapper = new JikanWrapper();

export class RenamingService {
    private readonly series: SelectSeriesResult;

    constructor(series: SelectSeriesResult) {
        this.series = series;
    }

    private async promptSearchSeries(): Promise<Anime | null> {
        const searchResults = await getAnimeSearch({ q: this.series.name, limit: 15 });
        const data = searchResults.data ?? [];

        if (data.length == 0) {
            console.log(`[${tags.Warning}] No search results found for "${this.series.name}".`);
            return null;
        }

        const choices = data.map((anime) => {
            return {
                name: `${anime.title} (${anime.title_japanese ? `${anime.title_japanese}` : ""} ${anime.title_english ? `${anime.title_english}` : ""})`,
                value: anime.mal_id ?? "none",
                description: `${anime.status} | Year: ${anime.year ?? "N/A"} | Type: ${anime.type ?? "N/A"} | Episodes: ${anime.episodes ?? "N/A"} | ${anime.url}`
            };
        });

        const selectedAnimeId = await select({
            message: 'Select anime series',
            choices: [
                ...choices,
                new Separator(),
                {
                    name: "Back to method selection",
                    value: "exit"
                }
            ],
            loop: false,
        });
        const selectedAnime = data.find((anime) => anime.mal_id == selectedAnimeId);

        if (!selectedAnime) {
            return null;
        }

        return selectedAnime;
    }

    async useJikan(): Promise<ProposedRenameResult[] | null> {
        console.log(`[${tags.Jikan}] Searching for anime series "${this.series.name}" on Jikan API...`);

        let selectedAnime = null;

        const cacheCheck = await jikanCache.getBySeriesName(this.series.name);
        if (cacheCheck) {
            console.log(`[${tags.Jikan}] Found cached data for "${this.series.name}". Using cached data.`);
            selectedAnime = cacheCheck.data;
        }

        if (!selectedAnime) {
            selectedAnime = await this.promptSearchSeries();
            if (!selectedAnime) {
                console.log(`[${tags.Warning}] No anime series selected. Returning to method selection.`);
                return null;
            }

            await jikanCache.add(selectedAnime);
        }

        const malId = selectedAnime.mal_id;
        if (!malId) {
            console.log(`[${tags.Error}] Selected anime doesn't have MAL ID. This should be a bug.`);
            return null;
        }

        const episodeResults = await jikanWrapper.getAnimeEpisodes(malId);
        const episodes = episodeResults.data ?? [];

        const processedFiles = new Set<string>();
        const proposedRenames: ProposedRenameResult[] = [];

        console.log();
        console.log(`[${tags.Jikan}] ${selectedAnime.title} (${selectedAnime.title_japanese ? `${selectedAnime.title_japanese}` : ""} ${selectedAnime.title_english ? `${selectedAnime.title_english}` : ""}) | MAL ID: ${selectedAnime.mal_id} | Status: ${selectedAnime.status} | Year: ${selectedAnime.year ?? "N/A"} | Type: ${selectedAnime.type ?? "N/A"}`);
        console.log(`[${tags.Jikan}] Read More: ${selectedAnime.url}`);
        console.log(`[${tags.Jikan}] Fetched ${episodes.length} episode(s) from Jikan API.`);
        console.log();

        episodes.forEach((jikanEp, index) => {
            const jikanEpNumber = index + 1;

            const matchedLocalFile = this.series.episodes.find(fileEp => {
                // console.log(`[${tags.Debug}] comp ${fileEp.episode} === ${jikanEpNumber} || ${jikanEp.title} === ${fileEp.episodeName}`);
                if (fileEp.episode === jikanEpNumber) return true;
                if (jikanEp.title && fileEp.episodeName) {
                    return jikanEp.title.toLowerCase() === fileEp.episodeName.toLowerCase();
                }
                return false;
            });

            if (!matchedLocalFile) {
                console.log(`[${tags.Jikan}] ${staleGradient(`[E${jikanEpNumber}] ${jikanEp.title} -> No file matched`)}`);
                return;
            }

            processedFiles.add(matchedLocalFile.originalFile.name);

            console.log(`[${tags.Jikan}] [E${jikanEpNumber}] ${afterGradient(`${jikanEp.title} -> ${matchedLocalFile.originalFile.name}`)}`);

            const episodeFormatted = matchedLocalFile.episode.toString().padStart(2, '0');
            const seasonFormatted = matchedLocalFile.season.toString().padStart(2, '0');
            const ext = path.extname(matchedLocalFile.originalFile.name);

            const newFilename = `${selectedAnime.title} - S${seasonFormatted}E${episodeFormatted} - ${jikanEp.title}${ext}`;

            proposedRenames.push({
                series: this.series,
                old: {
                    path: path.join(matchedLocalFile.originalFile.path, matchedLocalFile.originalFile.name),
                    name: matchedLocalFile.originalFile.name
                },
                new: {
                    path: path.join(matchedLocalFile.originalFile.path, newFilename),
                    name: newFilename
                },
            });
        });

        this.series.episodes.forEach(fileEp => {
            if (processedFiles.has(fileEp.originalFile.name)) return;

            console.log(`[${tags.Jikan}] [E?] ${staleGradient(`No Jikan data matched`)} -> ${fileEp.originalFile.name}`);

            const episodeFormatted = fileEp.episode.toString().padStart(2, '0');
            const seasonFormatted = fileEp.season.toString().padStart(2, '0');
            const ext = path.extname(fileEp.originalFile.name);

            const newFilename = `${selectedAnime.title} - S${seasonFormatted}E${episodeFormatted} - Episode ${episodeFormatted}${ext}`;

            proposedRenames.push({
                series: this.series,
                old: {
                    path: path.join(fileEp.originalFile.path, fileEp.originalFile.name),
                    name: fileEp.originalFile.name
                },
                new: {
                    path: path.join(fileEp.originalFile.path, newFilename),
                    name: newFilename
                },
            });
        });

        return proposedRenames;
    }

    async useAI(): Promise<ProposedRenameResult[] | null> {
        console.clear();
        console.log("AI method selected. This is currently not implemented.");
        return null;
    }

    async useManual(): Promise<ProposedRenameResult[] | null> {
        console.clear();
        console.log("Manual method selected. This is currently not implemented.");
        return null;
    }
}