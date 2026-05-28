import db from "../../database/Client.js";
import tags from "../../utils/Tags.js";

export interface DirectorySchema {
    created_at: Date
    last_access_at: Date | null
    path: string
}

export class DirectoryService {
    private readonly prefix = "directories";

    async getAll(): Promise<DirectorySchema[]> {
        const directories: DirectorySchema[] = await db.get(this.prefix) || [];
        return directories;
    }

    async getByPath(path: string): Promise<DirectorySchema | null> {
        const directories = await this.getAll();

        const found = directories.find((x) => x.path == path) ?? null;
        return found;
    }

    async add(path: string): Promise<DirectorySchema> {
        try {
            const directory = await this.getByPath(path);
            if (directory) {
                return directory;
            }
            
            console.log(`[${tags.Database}] Path "${path}" is not on db. Adding.`);

            const entry: DirectorySchema = {
                created_at: new Date(),
                last_access_at: null,
                path
            };

            await db.push(this.prefix, entry);

            return entry;
        } catch (e) {
            throw new Error("Failed to add path", e as Error);
        }
    }

    async remove(path: string): Promise<DirectorySchema | null> {
        try {
            const directory = await this.getByPath(path);
            if (!directory) {
                return null;
            }

            const currentDirectories = await this.getAll();
            const newDirectories = currentDirectories.filter((x) => x.path != path);

            await db.set(this.prefix, newDirectories);

            return directory;
        } catch (e) {
            throw new Error("Failed to delete path", e as Error);
        }
    }
}