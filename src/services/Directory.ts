import fs from 'node:fs';
import tags from '../utils/Tags.js';

interface ReadDirResult {
    parentPath: string
    filename: string
}

export async function checkPath(path: string): Promise<boolean> {
    try {
        await fs.accessSync(path);
        return true;
    } catch {
        return false;
    }
}

export async function readDir(path: string): Promise<ReadDirResult[]> {
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