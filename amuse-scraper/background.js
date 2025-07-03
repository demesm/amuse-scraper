// Background script for Amuse Studio Scraper

console.log('Background script loaded');

let collectionLinks = [];
let collectionData = [];
let currentLinkIndex = 0;
let isProcessing = false;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  if (request.action === 'reset') {
    // Reset all state
    collectionLinks = [];
    collectionData = [];
    currentLinkIndex = 0;
    isProcessing = false;
    console.log('Background script state reset');
    sendResponse({ status: 'reset complete' });
    return true;
  } else if (request.action === 'collectionLinks') {
    collectionLinks = request.links;
    currentLinkIndex = 0;
    console.log(`Received ${collectionLinks.length} collection links`);
    
    // Store links in chrome storage
    chrome.storage.local.set({ 
      collectionLinks: collectionLinks,
      scrapingComplete: false 
    }, () => {
      console.log('Collection links saved to storage');
      sendResponse({ status: 'links received' });
    });
    
    // Start processing collections if we have links
    if (collectionLinks.length > 0 && !isProcessing) {
      isProcessing = true;
      setTimeout(() => processNextCollection(), 1000);
    }
    
    return true; // Keep message channel open for async response
    
  } else if (request.action === 'collectionData') {
    const data = request.data;
    
    // Check for duplicate collection ID
    const existingIndex = collectionData.findIndex(item => item.collectionId === data.collectionId);
    if (existingIndex !== -1) {
      console.log(`Duplicate collection found: ${data.collectionId}, skipping...`);
      sendResponse({ status: 'duplicate skipped' });
      return true;
    }
    
    collectionData.push(data);
    console.log(`Collected data for collection: ${data.collectionId} (${data.songs?.length || 0} songs)`);
    
    // Download cover art image
    if (data.coverArtUrl) {
      downloadImage(data.coverArtUrl, data.collectionId);
    }
    
    // Save data to storage
    chrome.storage.local.set({ collectionData: collectionData }, () => {
      console.log('Collection data saved to storage');
      sendResponse({ status: 'data received' });
    });
    
    // Close the sender tab
    if (sender.tab && sender.tab.id) {
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id, () => {
          if (chrome.runtime.lastError) {
            console.log('Tab already closed');
          }
        });
      }, 500);
    }
    
    // Process next collection
    setTimeout(() => {
      processNextCollection();
    }, 2000);
    
    return true; // Keep message channel open for async response
  }
});

function processNextCollection() {
  console.log(`Processing collection ${currentLinkIndex + 1} of ${collectionLinks.length}`);
  
  if (currentLinkIndex < collectionLinks.length) {
    const link = collectionLinks[currentLinkIndex];
    currentLinkIndex++;
    
    console.log(`Opening collection page: ${link}`);
    
    // Open the collection page in a new tab
    chrome.tabs.create({ url: link, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create tab:', chrome.runtime.lastError);
        processNextCollection();
        return;
      }
      
      // Inject content script into the new tab
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject script:', chrome.runtime.lastError);
            chrome.tabs.remove(tab.id);
            processNextCollection();
          }
        });
      }, 1000);
      
      // Fallback: Close the tab after timeout if data wasn't extracted
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            console.log('Tab already closed');
          }
        });
      }, 15000);
    });
  } else {
    console.log('All collections processed');
    isProcessing = false;
    // Notify that scraping is complete
    chrome.storage.local.set({ scrapingComplete: true });
  }
}

function downloadImage(imageUrl, collectionId) {
  // Extract filename from URL
  const urlParts = imageUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  
  console.log(`Downloading image: ${filename}`);
  
  // Download the image
  chrome.downloads.download({
    url: imageUrl,
    filename: `amuse-covers/${collectionId}_${filename}`,
    conflictAction: 'uniquify'
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
    } else {
      console.log(`Image downloaded with ID: ${downloadId}`);
    }
  });
}

// Listen for popup script requests
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener((msg) => {
      if (msg.action === 'startScraping') {
        console.log('Start scraping requested from popup');
      }
    });
  }
});