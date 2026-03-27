<div align="center">
 <h1>Anime Renamer</h1>
 <p>A simple CLI to batch rename anime files into Jellyfin format</p>
</div>

# Features
- Rename into Jellyfin format: `{Anime Title} - SXXEXX - {Episode Title}.{Ext}`
- Pull episode titles per file straight from Jikan
- Guided CLI: pick the folder, review, confirm, done

# Example
Before:
```
- [SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 01 (1080p).mkv
- [SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 02 (1080p).mkv
- [SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 03 (1080p).mkv
```

After:
```
- Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - S01E01 - I Tried Confessing.mkv
- Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - S01E02 - I Tried Going on a Date.mkv
- Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - S01E03 - I Tried Giving Love Advice.mkv
```

# Prerequisites
- Node.js (version 21 or higher)

# Installation
1. Clone the repository:
```bash
git clone https://github.com/adwerygaming/anime-rename.git
```

2. Navigate to the project directory:
```bash
cd anime-rename
```

3. Install the required dependencies:
```bash
npm install
```

# Usage
1. Run the script:
```bash
npm start
```

2. Point it at the folder with your anime files when asked.
3. Pick the detected series from the list.
4. Enter the season number (for naming only, currently doesn't auto-detect).
5. When prompted, type "y" to rename or "n" to abort.

> [!IMPORTANT]
> **Expected input:** `[GroupName] {Anime Title} - SXXEXX - {Episode Title}.{ext}`. Files outside this shape are skipped with a warning.
> <br>
> Examples:
> - `[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 01 (1080p) [CC3FE38D].mkv`
> - `[SubsPlease] Seihantai na Kimi to Boku - 01 (1080p) [5F55C10F].mkv`
> - `[Erai-raws] Yuru Yuri - 01 [1080p][Multiple Subtitle][CD192B75].mkv`

> [!IMPORTANT]
> **Expected structure:** All files that are in the pointed folder should only contain 1 season per series.
> <br>
> <br>
> **What works:** 1 series with season 1 only in the same folder, combined, mixed without any folder separation.
> <br>
> **What won’t work:** 1 series with season 1 & 2 in the same folder, combined, mixed without any folder separation.