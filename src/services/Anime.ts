/* eslint-disable no-useless-escape */
import tags from "../utils/Tags.js";
import { DirectorySchema } from "./database/Directory.js";
import { readDir } from "./Directory.js";

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

export async function parseAnimeFile({ name, path }: ParseAnimeFileProp): Promise<ParsedAnime | null> {
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
export async function readSeries(directory: DirectorySchema): Promise<Map<string, ParsedAnime[]>> {
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