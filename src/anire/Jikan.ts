import { getAnimeById, getAnimeEpisodes, getAnimeSearch } from "@lightweight-clients/jikan-api-lightweight-client";
import { Anime } from "@lightweight-clients/jikan-api-lightweight-client/dist/raw-types.js";

interface FetchEpisodesResult {
    title: string | undefined | null;
    title_japanese: string | undefined | null;
    title_romanji: string | undefined | null;
}

export class Jikan {
    async search(query: string): Promise<Anime[]> {
        try {
            const res = await getAnimeSearch({ q: query, limit: 5 });

            return res.data ?? [];
        } catch (e) {
            throw new Error(`Failed to search for anime with query "${query}"`, { cause: e });
        }
    }

    async fetchById(id: number): Promise<Anime | null> {
        try {
            const res = await getAnimeById(id);

            return res.data ?? null;
        } catch (e) {
            throw new Error(`Failed to fetch anime with ID "${id}"`, { cause: e });
        }
    }

    async fetchEpisodesById(id: number): Promise<FetchEpisodesResult[]> {
        try {
            const res = await getAnimeEpisodes(id);

            const episodes = res.data?.map((ep) => {
                return {
                    title: ep.title,
                    title_japanese: ep.title_japanese,
                    title_romanji: ep.title_romanji
                };
            });

            return episodes ?? [];
        } catch (e) {
            throw new Error(`Failed to fetch episodes for anime with ID "${id}"`, { cause: e });
        }

    }
}