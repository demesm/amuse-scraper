// Popup script for Amuse.io Scraper

document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('statusText');
  const progress = document.getElementById('progress');
  const linkCount = document.getElementById('linkCount');
  const dataCount = document.getElementById('dataCount');
  const startBtn = document.getElementById('startBtn');
  const exportBtn = document.getElementById('exportBtn');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const dataPreview = document.getElementById('dataPreview');
  const fileInput = document.getElementById('fileInput');
  
  // Check current status
  updateStatus();
  
  // Start button click handler
  startBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      if (!currentTab.url || !currentTab.url.includes('artist.amuse.io/studio')) {
        statusText.textContent = 'Please navigate to https://artist.amuse.io/studio/';
        return;
      }
      
      // Clear previous data and reset state
      chrome.storage.local.clear(() => {
        statusText.textContent = 'Starting scrape...';
        startBtn.disabled = true;
        
        // Reset background script state by sending a message
        chrome.runtime.sendMessage({ action: 'reset' }, () => {
          console.log('Reset message sent');
        });
        
        // Inject content script and start scraping
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js']
        }, (injectionResults) => {
          if (chrome.runtime.lastError) {
            console.error('Script injection failed:', chrome.runtime.lastError);
            statusText.textContent = 'Failed to start scraping. Please reload the page and try again.';
            startBtn.disabled = false;
          } else {
            console.log('Content script injected successfully');
            statusText.textContent = 'Searching for collection links...';
          }
        });
      });
    });
  });
  
  // Export button click handler
  exportBtn.addEventListener('click', function() {
    chrome.storage.local.get(['collectionData'], function(result) {
      const data = result.collectionData || [];
      
      if (data.length === 0) {
        statusText.textContent = 'No data to export';
        return;
      }
      
      // Convert to JSON
      const jsonData = {
        exportDate: new Date().toISOString(),
        totalCollections: data.length,
        totalSongs: data.reduce((sum, collection) => sum + (collection.songs?.length || 0), 0),
        collections: data
      };
      
      const json = JSON.stringify(jsonData, null, 2);
      
      // Download JSON file
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amuse_collections_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      statusText.textContent = 'Data exported successfully';
    });
  });
  
  // Load button click handler
  loadBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  // File input change handler
  fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      statusText.textContent = 'Please select a JSON file';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Validate that it's our expected format
        if (!jsonData.collections || !Array.isArray(jsonData.collections)) {
          statusText.textContent = 'Invalid JSON format - expected collections array';
          return;
        }
        
        // Create and open viewer tab
        createViewerTab(jsonData, file.name);
        statusText.textContent = `Loaded ${file.name} successfully`;
        
      } catch (error) {
        statusText.textContent = 'Error parsing JSON file';
        console.error('JSON parse error:', error);
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    fileInput.value = '';
  });
  
  // Function to create viewer tab
  function createViewerTab(data, filename) {
    // Create viewer HTML content
    const viewerHTML = generateViewerHTML(data, filename);
    
    // Create a blob URL for the HTML content
    const blob = new Blob([viewerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new tab
    chrome.tabs.create({ url: url });
  }
  
  // Function to generate viewer HTML
  function generateViewerHTML(data, filename) {
    const totalCollections = data.collections.length;
    const totalSongs = data.collections.reduce((sum, collection) => sum + (collection.songs?.length || 0), 0);
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Amuse Data Viewer - ${filename}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: #4CAF50;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin: 10px 0;
        }
        .stat {
            background: rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 5px;
        }
        .collection {
            background: white;
            margin: 15px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .collection-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .cover-art {
            width: 80px;
            height: 80px;
            border-radius: 5px;
            margin-right: 15px;
            object-fit: cover;
        }
        .collection-info h2 {
            margin: 0 0 5px 0;
            color: #333;
        }
        .collection-meta {
            color: #666;
            font-size: 14px;
        }
        .songs {
            margin-top: 15px;
        }
        .song {
            background: #f9f9f9;
            margin: 8px 0;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #4CAF50;
        }
        .song-header {
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
        }
        .song-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 14px;
            color: #666;
        }
        .contributors {
            margin-top: 10px;
        }
        .contributor {
            background: #e8f5e8;
            display: inline-block;
            padding: 4px 8px;
            margin: 2px;
            border-radius: 3px;
            font-size: 12px;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Amuse Data Viewer</h1>
        <div class="stats">
            <div class="stat">
                <strong>File:</strong> ${filename}
            </div>
            <div class="stat">
                <strong>Exported:</strong> ${new Date(data.exportDate).toLocaleString()}
            </div>
            <div class="stat">
                <strong>Collections:</strong> ${totalCollections}
            </div>
            <div class="stat">
                <strong>Songs:</strong> ${totalSongs}
            </div>
        </div>
    </div>
    
    <div id="collections">
`;

    data.collections.forEach(collection => {
      const songCount = collection.songs?.length || 0;
      const coverArt = collection.coverArtThumbnail || collection.coverArtUrl || '';
      
      html += `
        <div class="collection">
            <div class="collection-header">
                ${coverArt ? `<img src="${coverArt}" alt="Cover Art" class="cover-art">` : '<div class="cover-art" style="background:#ddd;"></div>'}
                <div class="collection-info">
                    <h2>Collection ${collection.collectionId}</h2>
                    <div class="collection-meta">
                        <strong>Genre:</strong> ${collection.genre || 'Unknown'} | 
                        <strong>UPC:</strong> ${collection.upc || 'N/A'} | 
                        <strong>Release ID:</strong> ${collection.releaseId || 'N/A'} | 
                        <strong>Release Date:</strong> ${collection.releaseDate || 'N/A'} | 
                        <strong>Songs:</strong> ${songCount}
                    </div>
                </div>
            </div>
            
            <div class="songs">
`;

      if (collection.songs && collection.songs.length > 0) {
        collection.songs.forEach(song => {
          html += `
                <div class="song">
                    <div class="song-header">
                        Track ${song.trackNumber || '?'}: ${song.songName || 'Unknown'}
                    </div>
                    <div class="song-details">
                        <div><strong>ISRC:</strong> ${song.isrc || 'N/A'}</div>
                        <div><strong>Audio File:</strong> ${song.audioFileName || 'N/A'}</div>
                    </div>
                    ${song.contributors && song.contributors.length > 0 ? `
                    <div class="contributors">
                        <strong>Contributors:</strong><br>
                        ${song.contributors.map(contributor => 
                          `<span class="contributor">${contributor.name} (${contributor.role}${contributor.split ? ', ' + contributor.split : ''})</span>`
                        ).join('')}
                    </div>
                    ` : ''}
                </div>
`;
        });
      } else {
        html += '<div class="song">No songs found in this collection</div>';
      }

      html += `
            </div>
        </div>
`;
    });

    html += `
    </div>
    
    <script>
        // Viewer functionality
    </script>
</body>
</html>
`;

    return html;
  }
  
  // Clear button click handler
  clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all data?')) {
      chrome.storage.local.clear(() => {
        statusText.textContent = 'Data cleared';
        updateStatus();
      });
    }
  });
  
  // Update status periodically
  setInterval(updateStatus, 1000);
  
  function updateStatus() {
    chrome.storage.local.get(['collectionLinks', 'collectionData', 'scrapingComplete'], function(result) {
      const links = result.collectionLinks || [];
      const data = result.collectionData || [];
      
      linkCount.textContent = `Collection links found: ${links.length}`;
      dataCount.textContent = `Collections scraped: ${data.length}`;
      
      if (links.length > 0 && data.length < links.length) {
        statusText.textContent = 'Scraping in progress...';
        progress.textContent = `Progress: ${data.length}/${links.length}`;
        startBtn.disabled = true;
        exportBtn.disabled = true;
      } else if (result.scrapingComplete) {
        statusText.textContent = 'Scraping complete!';
        progress.textContent = '';
        startBtn.disabled = false;
        exportBtn.disabled = data.length === 0;
      } else {
        startBtn.disabled = false;
        exportBtn.disabled = data.length === 0;
      }
      
      // Show data preview
      if (data.length > 0) {
        dataPreview.style.display = 'block';
        const totalSongs = data.reduce((sum, collection) => sum + (collection.songs?.length || 0), 0);
        const previewItems = data.slice(0, 3).map(collection => {
          const songCount = collection.songs?.length || 0;
          const firstSong = collection.songs?.[0];
          const songName = firstSong?.songName || 'Unknown';
          return `Collection ${collection.collectionId}: ${songName}${songCount > 1 ? ` (+${songCount-1} more)` : ''}`;
        });
        
        dataPreview.innerHTML = '<strong>Data Preview:</strong><br>' + 
          `Total: ${data.length} collections, ${totalSongs} songs<br>` +
          previewItems.join('<br>') + 
          (data.length > 3 ? '<br>...' : '');
      } else {
        dataPreview.style.display = 'none';
      }
    });
  }
  
});