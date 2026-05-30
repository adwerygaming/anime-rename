import db from "../../database/Client.js";

export interface LastAccessSchema {
    series_name: string;
    accessed_at: Date;
}

export class LastAction {
    private readonly prefix = "last_access";

    async setLastSeriesAccess(series_name: string): Promise<void> {
        await db.set(`${this.prefix}.series`, {
            series_name,
            accessed_at: new Date()
        });
    }

    async getLastSeriesAccess(series_name: string): Promise<LastAccessSchema | null> {
        const entry = await db.get(`${this.prefix}.series`) as LastAccessSchema | null;
        if (entry && entry.series_name.toLowerCase() === series_name.toLowerCase()) {
            return entry;
        }
        return null;
    }
}