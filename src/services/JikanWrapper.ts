import { GetAnimeEpisodesOkResponse } from "@lightweight-clients/jikan-api-lightweight-client";
import axios from "axios";

export class JikanWrapper {
    private baseUrl = "https://api.jikan.moe/v4";

    async getAnimeEpisodes(id: number): Promise<GetAnimeEpisodesOkResponse> {
        try {
            const response = await axios.get(`${this.baseUrl}/anime/${id}/episodes`);
            const data = response.data;

            return data;
        } catch (e) {
            throw new Error(`Failed to fetch episodes for anime with ID "${id}"`, { cause: e });
        }
    }
}