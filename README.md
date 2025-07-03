# Amuse.io Collection Scraper

**If this tool helps you recover your music metadata, consider [buying me a coffee](https://ko-fi.com/sdemi) to support development!**

This Chrome extension scrapes collection data from Amuse.io. I like many others have been burned by amuse, so this lets you yoink all the metadata needed to move your songs to another distributor.

## Features

- **Automated Pagination**: Navigates through all pages of collections
- **Multi-Song Collections**: Handles albums and EPs with multiple tracks
- **Complete Data Extraction**: Captures song names, ISRC codes, contributors, audio files, cover art, and metadata
- **JSON Export**: Exports data in structured JSON format for easy analysis
- **JSON Viewer**: Built-in viewer to display scraped data in a clean, searchable format
- **Cover Art Download**: Automatically downloads high-resolution cover art images

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right corner)
3. Click "Load unpacked"
4. Select the `amuse-scraper-extension` folder
5. The extension should now appear in your extensions list

## How to Use

### Scraping Data
1. Navigate to https://artist.amuse.io/studio/
2. Click the extension icon in your Chrome toolbar
3. Click "Start Scraping" in the popup window
4. The extension will:
   - Click the "Delivered or Live" tab automatically
   - Navigate through all pages of collections
   - Extract links from each page
   - Visit each collection page to gather detailed data
   - Handle both single songs and multi-track collections
   - Download cover art images automatically

### Viewing Data
- **Progress Tracking**: Monitor scraping progress in the popup
- **Export Data**: Click "Export Data" to download a JSON file
- **Load JSON**: Click "Load JSON" to view previously exported data in a new tab
- **Search**: Use the search box in the viewer to filter collections and songs

## Data Structure

The extension exports data in JSON format with the following structure:

```json
{
  "exportDate": "2025-01-03T...",
  "totalCollections": 20,
  "totalSongs": 36,
  "collections": [
    {
      "collectionId": "3854623",
      "upc": "7300341949246",
      "genre": "Hip Hop/Rap",
      "releaseId": "3854623",
      "releaseDate": "as soon as possible",
      "coverArtUrl": "https://cdn.amuse.io/...",
      "pageUrl": "https://artist.amuse.io/studio/collection/3854623",
      "songs": [
        {
          "trackNumber": 1,
          "songName": "Song Title",
          "isrc": "SE6XX2566796",
          "audioFileName": "Song Title.wav",
          "contributors": [
            {
              "name": "Artist Name",
              "role": "Primary artist"
            },
            {
              "name": "Producer Name",
              "role": "Producer",
              "split": "100.00%"
            }
          ]
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues
- **Scraping doesn't start**: Ensure you're on the main studio page (not a collection page)
- **BE PATIENT!**: The scraping take a little while to begin, especially with many collections
- **Missing data**: Check if the page structure has changed and selectors need updating
- **Pagination issues**: Verify the "Delivered or Live" tab is being clicked successfully

### Debugging
1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for logs like:
   - "Amuse Scraper Content Script Loaded"
   - "Found X collection links"
   - "Processing page X of Y"
   - "Extracted collection data: {...}"

### Files and Permissions
- Cover art images are saved to Downloads folder in `amuse-covers/` directory
- Extension requires permissions for: activeTab, storage, downloads, tabs, scripting
- Works on: https://artist.amuse.io/* and https://cdn.amuse.io/*

## Technical Details

- **Manifest Version**: 3
- **Content Script**: Automatically injected on Amuse.io studio pages
- **Background Script**: Manages collection processing and data storage
- **Popup Interface**: Control panel for scraping operations and data management

---

**Found this tool useful? [Support future development with a coffee](https://ko-fi.com/sdemi)!**