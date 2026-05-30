import fs from 'node:fs';
import { ApplyRenamesResult, ProposedRenameResult } from '../index.js';
import tags from "../utils/Tags.js";

export async function applyRenames(renames: ProposedRenameResult[]): Promise<ApplyRenamesResult> {
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
