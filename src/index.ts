/* eslint-disable no-useless-escape */
import { confirm, input, select, Separator } from '@inquirer/prompts';

import { z } from 'zod';
import { ParsedAnime, readSeries } from './services/Anime.js';
import { applyRenames } from './services/Changes.js';
import { DirectorySchema, DirectoryService } from './services/database/Directory.js';
import { JikanCacheService } from './services/database/JikanCache.js';
import { checkPath } from './services/Directory.js';
import { RenamingService } from './services/Renaming.js';
import tags, { afterGradient, beforeGradient } from './utils/Tags.js';

const directory = new DirectoryService();
const jikanCache = new JikanCacheService();

export type RenamingMethod = "jikan" | "ai" | "manual" | "exit";

export interface SelectSeriesResult {
    name: string;
    episodes: ParsedAnime[];
}

// if you update this result schema
// make sure to also update the system prompt in src/assets/systemPrompt.txt accordingly
export interface ProposedRenameResult {
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

const ProposedRenameResultSchema = z.object({
  old: z.object({
    path: z.string(),
    name: z.string(),
  }),
  new: z.object({
    path: z.string(),
    name: z.string(),
  }),
});

export const RenameResponseSchema = z.object({
  results: z.array(ProposedRenameResultSchema).describe("The array containing the mappings of old filenames to new filenames."),
});

export interface ApplyRenamesResult {
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

async function promptAddDirectory(): Promise<DirectorySchema> {
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

async function promptDirectory(): Promise<DirectorySchema> {
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

async function promptSelectSeries(directory: DirectorySchema): Promise<SelectSeriesResult> {
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

async function promptConfirmChanges(results: ProposedRenameResult[]): Promise<ApplyRenamesResult | false> {
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


// ===================================================================

let activeDirectory = await promptDirectory();

while (true) {
    try {
        // console.clear();
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

        const confirmResult = await promptConfirmChanges(proposedRenameResult);
        if (confirmResult) {
            console.log(`[${tags.Job}] Renaming completed successfully.`);
            console.log(`[${tags.Job}] Success: ${confirmResult.success}, Failed: ${confirmResult.failed}, Total: ${confirmResult.total}, Elapsed Time: ${confirmResult.elapsed.seconds} seconds.`);
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