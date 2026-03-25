<div>
 <h1>Anime Renamer</h1>
 <p>A small script that automates local anime files to Jellyfin format</p>
</div>

# Features
- Automatically renames anime files to the format: `{Anime Title} - SXXEXX - {Episode Title}.{Ext}`
- Automatically fetches anime episode titles from the Jikan API
- Supports various video file formats (e.g., .mkv, .mp4, .avi)
- Provides a user-friendly CLI for selecting the anime directory and confirming renaming actions

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

2. Enter the path to the directory containing your anime files when prompted.
3. On Series Selection, The script will display the detected anime title and episode information. Confirm the selection.
4. Before renaming, the script will ask for confirmation. Type "y" to proceed with renaming or "n" to go back to the series selection.

> [!IMPORTANT]
> The script expects the anime files to be named in `[GroupName] Anime Title - SXXEXX - Episode Title.ext` format by default. If your files are not in this format, the script will skip them and display a warning message.
> Examples:
> - `[SubsPlease] Yuusha Party ni Kawaii Ko ga Ita node, Kokuhaku shitemita. - 01 (1080p) [CC3FE38D].mkv`
> - `[SubsPlease] Seihantai na Kimi to Boku - 01 (1080p) [5F55C10F].mkv`
> - `[Erai-raws] Yuru Yuri - 01 [1080p][Multiple Subtitle][CD192B75].mkv`