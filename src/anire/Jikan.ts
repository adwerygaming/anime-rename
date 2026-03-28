import { getAnimeById, getAnimeEpisodes, getAnimeSearch } from "@lightweight-clients/jikan-api-lightweight-client";
import { Anime } from "@lightweight-clients/jikan-api-lightweight-client/dist/raw-types.js";

interface FetchEpisodesResult {
    title: string | null;
    title_japanese: string | null;
    title_romanji: string | null;
}

export class Jikan {
    /**
     * Search anime details from a query.
     * @param query String of anime series title
     * @returns Array of Jikan `Anime` object
     */
    async search(query: string): Promise<Anime[]> {
        try {
            const res = await getAnimeSearch({ q: query, limit: 5 });

            return res.data ?? [];
        } catch (e) {
            throw new Error(`Failed to search for anime with query "${query}"`, { cause: e });
        }
    }

    /**
     * Fetches anime details from MAL ID
     * @param id Anime Series MAL ID
     * @returns Jikan `Anime` object.
     */
    async fetchById(id: number): Promise<Anime | null> {
        try {
            const res = await getAnimeById(id);

            return res.data ?? null;
        } catch (e) {
            throw new Error(`Failed to fetch anime with ID "${id}"`, { cause: e });
        }
    }

    /**
     * Fetches episodes details from an anime series
     * @param id Anime Series MAL ID
     * @returns Array of `FetchEpisodesResult` object. Containing `title`, `title_japanese`, `title_romanji`.
     */
    async fetchEpisodesById(id: number): Promise<FetchEpisodesResult[]> {
        try {
            const res = await getAnimeEpisodes(id);

            const episodes = res.data?.map((ep) => {
                return {
                    title: ep?.title ?? null,
                    title_japanese: ep?.title_japanese ?? null,
                    title_romanji: ep?.title_romanji ?? null,
                };
            });

            return episodes ?? [];
        } catch (e) {
            throw new Error(`Failed to fetch episodes for anime with ID "${id}"`, { cause: e });
        }
    }
}