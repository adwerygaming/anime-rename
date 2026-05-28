import { Anime } from "@lightweight-clients/jikan-api-lightweight-client/dist/raw-types.js";
import db from "../database/Client.js";

export interface JikanCacheDBSchema {
    created_at: Date
    last_access_at: Date | null
    data: Anime
}

export class JikanCacheDB {
    private readonly prefix = "jikan_cache";

    async getBySeriesName(name: string): Promise<JikanCacheDBSchema | null> {
        const entries = await this.getAll();

        const found = Object.values(entries || {}).find((x) => x.data.title?.toLowerCase() == name.toLowerCase()) ?? null;
        return found ?? null;
    }

    async getAll(): Promise<Record<string, JikanCacheDBSchema> | null> {
        const entries: Record<string, JikanCacheDBSchema> | null = await db.get(this.prefix);
        return entries;
    }

    async clear(): Promise<void> {
        await db.delete(this.prefix);
    }

    async getById(id: number): Promise<JikanCacheDBSchema | null> {
        return await db.get(`${this.prefix}.${id}`);
    }

    async add(data: Anime): Promise<JikanCacheDBSchema> {
        try {
            const entry: JikanCacheDBSchema = {
                created_at: new Date(),
                last_access_at: null,
                data
            };

            await db.set(`${this.prefix}.${data.mal_id}`, entry);

            return entry;
        } catch (e) {
            throw new Error("Failed to add data to cache", e as Error);
        }
    }

    async remove(id: number): Promise<JikanCacheDBSchema | null> {
        try {
            const entry = await this.getById(id);
            if (!entry) {
                return null;
            }

            await db.delete(`${this.prefix}.${id}`);

            return entry;
        } catch (e) {
            throw new Error("Failed to remove data from cache", e as Error);
        }
    }
}