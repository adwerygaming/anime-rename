/* eslint-disable no-useless-escape */
import { confirm, input, select, Separator } from '@inquirer/prompts';
import { getAnimeSearch } from '@lightweight-clients/jikan-api-lightweight-client';
import { Anime } from '@lightweight-clients/jikan-api-lightweight-client/dist/raw-types.js';
import fs from "node:fs";
import path from 'node:path';
import { DirectoryDB, DirectoryDBSchema } from "./services/DirectoryDB.js";
import { JikanCacheDB } from './services/JikanCacheDB.js';
import { JikanWrapper } from './services/JikanWrapper.js';
import tags, { afterGradient, beforeGradient, staleGradient } from './utils/Tags.js';

const directory = new DirectoryDB();
const jikanCache = new JikanCacheDB();
const jikanWrapper = new JikanWrapper();

// const pathRegExp = 

async function checkPath(path: string): Promise<boolean> {
    try {
        await fs.accessSync(path);
        return true;
    } catch {
        return false;
    }
}

async function promptAddDirectory(): Promise<DirectoryDBSchema> {
    console.log(`[${tags.Info}] Enter 'exit' to cancel adding new path.`);
    const newPathAnswer = await input({
        message: 'Enter the folder path containing the anime video files',
        required: true
    });

    if (newPathAnswer.toLowerCase() == "exit") {
        throw new Error("User cancelled adding new path.");
    }

    const verifyPath = await checkPath(newPathAnswer);

    if (!verifyPath) {
        console.log(`[${tags.Error}] Can't verify path. Please ensure that path really exists and accessible!`);
        return await promptAddDirectory(); //! recursive?
    }

    const newPath = await directory.add(newPathAnswer);
    return newPath;
}

async function promptDirectory(): Promise<DirectoryDBSchema> {
    console.clear();
    const directories = await directory.getAll();

    if (directories.length != 0) {
        const compiledAnswer = directories.map((x) => {
            return {
                name: x.path,
                value: x.path,
                description: `${x.created_at}`
            };
        });

        const addNewDirectoryAnswer = {
            name: "Add new directory",
            value: "addNewDirectory",
            description: ""
        };

        const existingPathAnswer = await select({
            message: 'Select path',
            choices: [
                ...compiledAnswer,
                new Separator(),
                addNewDirectoryAnswer
            ],
        });

        if (existingPathAnswer == "addNewDirectory") {
            try {
                return await promptAddDirectory();
            } catch {
                return await promptDirectory(); //! recursive?
            }
        }

        const verifyPath = await checkPath(existingPathAnswer);

        if (!verifyPath) {
            console.log(`[${tags.Error}] Can't verify path. Please ensure that path really exists and accessible!`);
            return await promptDirectory(); //! recursive?
        }

        const existingPath = await directory.getByPath(existingPathAnswer);

        if (existingPath) {
            return existingPath;
        }

        throw new Error("Can't resolve path, after entering choice. This should be a bug.");
    }

    // no directory listed
    try {
        return await promptAddDirectory();
    } catch {
        return await promptDirectory(); //! recursive?
    }
}

interface ReadDirResult {
    parentPath: string
    filename: string
}

async function readDir(path: string): Promise<ReadDirResult[]> {
    console.log(`[${tags.Info}] Reading directory. Please wait...`);
    const final: ReadDirResult[] = [];
    const files = fs.readdirSync(path, { withFileTypes: true });

    const allowlist = [".mkv", ".mp4", ".avi", ".flv"];

    for (const file of files) {
        if (file.isDirectory()) {
            // const subFiles = await readDir(`${path}/${file.name}`);
            // final.push(...subFiles);
        } else {
            if (file.name.endsWith(".part")) continue; // skip .part files
            if (!allowlist.includes(file.name.slice(file.name.lastIndexOf(".")))) continue; // skip if not video file

            // console.log(`[${tags.Debug}] ${staleGradient(`Found: ${file.name}`)}`);

            final.push({
                parentPath: path,
                filename: file.name
            });
        }
    }

    return final;
}

interface ParseAnimeFileProp {
    name: string;
    path: string;
}

export interface ParsedAnime {
    seriesName: string;
    season: number;
    episode: number;
    episodeName?: string;
    originalFile: ParseAnimeFileProp
}

async function parseAnimeFile({ name, path }: ParseAnimeFileProp): Promise<ParsedAnime | null> {
    let str = name.replace(/\.[a-z0-9]{2,4}$/i, '');

    // delete release group
    str = str.replace(/^\[.*?\]\s*/, '');

    // delete trailing metadata blocks like [1080p], (Web), [AV1], [Hash]
    str = str.replace(/(\s*[\[(][^\])]+[\])])+$/, '');

    // fix the dot/underscore trap without breaking ellipses
    const cleanText = (text: string): string => {
        // If the string uses spaces, just fix underscores.
        // If it lacks spaces entirely, assume dots are being used as spaces.
        if (text.includes(' ')) {
            return text.replace(/_/g, ' ').trim();
        }
        return text.replace(/[._]/g, ' ').trim();
    };

    // matches: "Title - S01E02 - EpName" or "Title_S01E02_EpName"
    const sxeRegex = /^(.*?)(?:\s*-\s*|[\s_.]+)S(\d+)E(\d+)(?:(?:\s*-\s*|[\s_.]+)(.*))?$/i;
    const sxeMatch = str.match(sxeRegex);

    if (sxeMatch) {
        return {
            seriesName: cleanText(sxeMatch[1]),
            season: parseInt(sxeMatch[2], 10),
            episode: parseInt(sxeMatch[3], 10),
            episodeName: sxeMatch[4] ? cleanText(sxeMatch[4]) : undefined,
            originalFile: {
                name: name,
                path: path
            }
        };
    }

    // look for a hyphen before the number. 
    // prevents matching anime with numbers in the title (like "86 - 02")
    const absRegex = /^(.*?)\s*-\s*(\d{1,4})(?:(?:\s*-\s*|[\s_.]+)(.*))?$/i;
    const absMatch = str.match(absRegex);

    if (absMatch) {
        return {
            seriesName: cleanText(absMatch[1]),
            season: 1, // Default fallback
            episode: parseInt(absMatch[2], 10),
            episodeName: absMatch[3] ? cleanText(absMatch[3]) : undefined,
            originalFile: {
                name: name,
                path: path
            }
        };
    }

    // other format
    return null;
}

// resulting in complete grouping of series.
async function readSeries(directory: DirectoryDBSchema): Promise<Map<string, ParsedAnime[]>> {
    const results = new Map<string, ParsedAnime[]>(); 

    const startTime = Date.now();
    const files = await readDir(directory.path);
    const endTime = Date.now();

    console.log(`[${tags.Info}] Found ${files.length} file(s) in ${(endTime - startTime) / 1000} seconds.`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await parseAnimeFile({ path: file.parentPath, name: file.filename });
        if (parsed) {
            if (!results.has(parsed.seriesName)) {
                results.set(parsed.seriesName, []);
            }

            results.get(parsed.seriesName)?.push(parsed);
        } else {
            console.log(`[${tags.Warning}] Unrecognized file format: ${file.filename}`);
        }
    }

    return results;
}

interface SelectSeriesResult {
    name: string;
    episodes: ParsedAnime[];
}

async function promptSelectSeries(directory: DirectoryDBSchema): Promise<SelectSeriesResult> {
    const seriesMap = await readSeries(directory);

    if (seriesMap.size == 0) {
        console.log(`[${tags.Warning}] No anime video files found in the selected directory.`);
        throw new Error("No anime video files found in the selected directory.");
    }

    const series = Array.from(seriesMap.keys());

    const seriesChoices = series.map((seriesName) => {
        return {
            name: seriesName,
            value: seriesName,
            description: `${seriesMap.get(seriesName)?.length} episode(s)`
        };
    });

    console.log();
    const selectedSeriesName = await select({
        message: 'Select series to rename',
        choices: [
            ...seriesChoices,
            new Separator(),
            {
                    name: "Clear existing cache",
                    value: "clear_cache"
            },
            {
                name: "Back to directory selection",
                value: "exit"
            }
        ]
    });

    if (selectedSeriesName == "clear_cache") {
        await jikanCache.clear();
        return await promptSelectSeries(directory); //! recursive?
    }

    const selectedSeries = seriesMap.get(selectedSeriesName);

    if (selectedSeriesName == "exit") {
        throw new Error("User cancelled series selection.");
    }

    if (!selectedSeries) {
        throw new Error("Failed to retrieve selected series data. This should be a bug.");
    }

    return {
        name: selectedSeriesName,
        episodes: selectedSeries
    };
}

type RenamingMethod = "jikan" | "ai" | "manual" | "exit";

async function promptSelectMethod(): Promise<RenamingMethod> {
    const methodAnswer: RenamingMethod = await select({
        message: 'Select renaming method',
        choices: [
            {
                name: "Fetch from Jikan API",
                value: "jikan"
            }, 
            {
                name: "Use AI",
                value: "ai"
            },
            {
                name: "Manual input",
                value: "manual"
            },
            new Separator(),
            {
                name: "Back to series selection",
                value: "exit"
            }
        ]
    });

    return methodAnswer;
}

interface ProposedRenameResult {
    series: SelectSeriesResult;
    old: {
        path: string;
        name: string;
    };
    new: {
        path: string;
        name: string;
    };
}

interface ApplyRenamesResult {
    success: number;
    failed: number;
    total: number;
    elapsed: {
        start: number;
        end: number;
        ms: number;
        seconds: string;
        minutes: string;
    }
}

async function applyRenames(renames: ProposedRenameResult[]): Promise<ApplyRenamesResult> {
    const total = renames.length;
    let success = 0, failed = 0;

    const startTime = Date.now();
    for (const renameItem of renames) {
        try {
            // await sleep(500);
            await fs.renameSync(renameItem.old.path, renameItem.new.path);
            console.log(`[${tags.Job}] ${renameItem.old.name} -> ${renameItem.new.name}`);
            success++;
        } catch (e) {
            console.log(`[${tags.Error}] ${renameItem.old.name} -> ${renameItem.new.name}`);
            console.error(e);
            failed++;
        }
    }
    const endTime = Date.now();
    const elapsed = endTime - startTime;

    return {
        success,
        failed,
        total,
        elapsed: {
            start: startTime,
            end: endTime,
            ms: elapsed,
            seconds: (elapsed / 1000).toFixed(2),
            minutes: (elapsed / 60000).toFixed(2)
        }
    };
}

async function confirmChanges(results: ProposedRenameResult[]): Promise<ApplyRenamesResult | false> {
    console.log();
    console.log(`[${tags.Job}] Please review the proposed renaming changes:`);

    results.forEach((rename) => {
        console.log(`${beforeGradient(`[-] ${rename.old.name}`)}`);
        console.log(`${afterGradient(`[+] ${rename.new.name}`)}`);
    });

    const confirmAnswer = await confirm({
        message: 'Do you want to proceed with the renaming?',
        default: false
    });

    if (!confirmAnswer) {
        console.log(`[${tags.Info}] Renaming cancelled by user. Returning to method selection.`);
        return false;
    }

    const renameResults = await applyRenames(results);
    return renameResults;
}

class RenamingService {
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

            console.log(`[${tags.Jikan}] [E?] ${beforeGradient(`No Jikan data matched`)} -> ${fileEp.originalFile.name}`);

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

// ===================================================================

let activeDirectory = await promptDirectory();

while (true) {
    try {
        console.clear();
        console.log(`[${tags.Info}] Directory: ${activeDirectory.path}`);

        const selectedSeries = await promptSelectSeries(activeDirectory);
        const method: RenamingMethod = await promptSelectMethod();

        if (method == "exit") {
            continue;
        }

        const renamingService = new RenamingService(selectedSeries);
        let proposedRenameResult: ProposedRenameResult[] | null = null;

        if (method == "jikan") {
            proposedRenameResult = await renamingService.useJikan();
        } else if (method == "ai") {
            proposedRenameResult = await renamingService.useAI();
        } else if (method == "manual") {
            proposedRenameResult = await renamingService.useManual();
        } else {
            console.log(`[${tags.Error}] Unrecognized method selected. This should be a bug.`);
        }

        if (!proposedRenameResult) {
            console.log(`[${tags.Warning}] No proposed renames to apply.`);
            continue;
        }

        const confirmResult = await confirmChanges(proposedRenameResult);
        if (confirmResult) {
            console.log(`[${tags.Job}] Renaming completed successfully.`);
            console.log(`[${tags.Job}] Success: ${confirmResult.success}, Failed: ${confirmResult.failed}, Total: ${confirmResult.total}, Elapsed Time: ${confirmResult.elapsed.seconds} seconds.`);
        } else {
            console.log(`[${tags.Job}] Renaming cancelled. Returning to series selection.`);
        }
        
        await confirm({
            message: "Press any key to continue"
        });
    } catch (e) {
        console.error(e);
        await confirm({
            message: "Press any key to continue."
        });

        activeDirectory = await promptDirectory();
    }
}