export interface FileParseResult {
    originalFilename: string;
    seriesTitle: string | null;
    episodeNumber: number | null;
    fileExtension: string | null;
}

export interface NewAnimeEntry {
    title: string;
    episodeNumber: number | null;
}

export interface CombineResult extends FileParseResult {
    seasonNumber: number | null;
    episodeTitle: string | null;
    finalFilename: string;
}

export interface CombineProp {
    seasonNumber: number;
    localEntries: FileParseResult[];
    jikanEntries: NewAnimeEntry[];
}