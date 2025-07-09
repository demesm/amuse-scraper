// Content script for Amuse Studio Scraper

console.log('Amuse Scraper Content Script Loaded');

// Check if we're on the main studio page
if (window.location.href.includes('artist.amuse.io/studio')) {
  if (window.location.href.includes('/studio/collection/')) {
    console.log('On collection detail page:', window.location.href);
    extractCollectionData();
  } else if (window.location.href.includes('/studio')) {
    console.log('On studio main page');
    crawlStudioPage();
  }
}

function crawlStudioPage() {
  console.log('Starting to crawl studio page for collection links...');
  
  // First, try to click the collection tab
  const clickCollectionTab = () => {
    // Try different selectors for the collection tab
    const tabSelectors = [
      'span[data-path="releases_list_tab_live_title"]',
      'span:contains("Delivered or Live")',
      '[data-path="releases_list_tab_live_title"]',
      'span[count]'
    ];
    
    let tabClicked = false;
    
    for (const selector of tabSelectors) {
      try {
        let tabElement;
        
        if (selector.includes(':contains')) {
          // Handle jQuery-style selector manually
          const spans = document.querySelectorAll('span');
          tabElement = Array.from(spans).find(span => 
            span.textContent.includes('Delivered or Live')
          );
        } else {
          tabElement = document.querySelector(selector);
        }
        
        if (tabElement) {
          console.log(`Found collection tab with selector: ${selector}`);
          // Click the tab or its parent if it's not directly clickable
          const clickTarget = tabElement.closest('button, a, div[role="tab"], li') || tabElement;
          clickTarget.click();
          console.log('Clicked collection tab');
          tabClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with selector ${selector}:`, e);
      }
    }
    
    if (!tabClicked) {
      console.log('Could not find collection tab to click');
    }
    
    return tabClicked;
  };
  
  // Function to get pagination info
  const getPaginationInfo = () => {
    const paginationElement = document.querySelector('span[data-path="pagination_lbl"]');
    if (paginationElement) {
      const first = parseInt(paginationElement.getAttribute('first') || '0');
      const last = parseInt(paginationElement.getAttribute('last') || '0');
      const total = parseInt(paginationElement.getAttribute('total') || '0');
      const pageSize = last - first + 1;
      const totalPages = Math.ceil(total / pageSize);
      
      console.log(`Pagination info: Showing ${first}-${last} of ${total} (${totalPages} pages)`);
      return { first, last, total, pageSize, totalPages };
    }
    return null;
  };
  
  // Function to navigate to next page
  const goToNextPage = () => {
    console.log('Looking for pagination next button...');
    
    // Find the pagination label first
    const paginationLabel = document.querySelector('span[data-path="pagination_lbl"]');
    if (!paginationLabel) {
      console.log('Could not find pagination label');
      return false;
    }
    
    console.log('Found pagination label:', paginationLabel.textContent);
    
    // Get the pagination container (parent of the label)
    const paginationContainer = paginationLabel.closest('div').parentElement;
    if (!paginationContainer) {
      console.log('Could not find pagination container');
      return false;
    }
    
    // Find all chevron buttons in the pagination area
    const chevronButtons = paginationContainer.querySelectorAll('button svg path[d*="M5.29016"]');
    console.log(`Found ${chevronButtons.length} chevron buttons in pagination area`);
    
    if (chevronButtons.length >= 2) {
      // Get the second chevron (index 1) - this should be the "next" button
      const nextChevron = chevronButtons[1];
      const nextButton = nextChevron.closest('button');
      
      if (nextButton && !nextButton.disabled && !nextButton.hasAttribute('disabled')) {
        console.log('Found next button (2nd chevron from pagination label)');
        console.log('Button element:', nextButton);
        nextButton.click();
        return true;
      } else {
        console.log('Next button is disabled or not found');
      }
    } else {
      console.log('Not enough chevron buttons found for pagination');
    }
    
    // Fallback: look for the last chevron button in pagination area (might be the only "next" button)
    if (chevronButtons.length > 0) {
      const lastChevron = chevronButtons[chevronButtons.length - 1];
      const lastButton = lastChevron.closest('button');
      
      if (lastButton && !lastButton.disabled && !lastButton.hasAttribute('disabled')) {
        console.log('Using last chevron button as fallback');
        console.log('Button element:', lastButton);
        lastButton.click();
        return true;
      }
    }
    
    console.log('Could not find pagination next button');
    return false;
  };
  
  // Collect all links across pages
  let allCollectionLinks = new Set();
  let currentPage = 1;
  
  const collectLinksFromCurrentPage = () => {
    console.log(`Collecting links from page ${currentPage}...`);
    
    // Target the specific collection row structure
    const collectionRows = document.querySelectorAll('a[data-testid="data_table_row"][href*="/studio/collection/"]');
    console.log(`Found ${collectionRows.length} collection rows on current page`);
    
    collectionRows.forEach(row => {
      const href = row.href || row.getAttribute('href');
      if (href && href.includes('/studio/collection/')) {
        // Only collect the URL - all other data will come from the individual collection page
        allCollectionLinks.add(href);
        
        // Log track count for debugging
        const trackCountElement = row.querySelector('span[data-path="releases_list_track_count"]');
        const trackCount = trackCountElement ? parseInt(trackCountElement.getAttribute('count') || '1') : 1;
        console.log(`Collection ${href} has ${trackCount} track(s)`);
      }
    });
    
    return collectionRows.length;
  };
  
  const processAllPages = async () => {
    const paginationInfo = getPaginationInfo();
    const totalPages = paginationInfo?.totalPages || 1;
    
    console.log(`Processing ${totalPages} pages of collections...`);
    
    for (currentPage = 1; currentPage <= totalPages; currentPage++) {
      console.log(`Processing page ${currentPage} of ${totalPages}`);
      
      // Wait for page content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Collect links from current page
      const linksFound = collectLinksFromCurrentPage();
      
      if (linksFound === 0 && currentPage === 1) {
        console.log('No links found on first page, retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        collectLinksFromCurrentPage();
      }
      
      // Navigate to next page if not on last page
      if (currentPage < totalPages) {
        const navigated = goToNextPage();
        if (!navigated) {
          console.log('Failed to navigate to next page, stopping pagination');
          break;
        }
        
        // Wait for next page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Convert Set to Array and verify uniqueness
    const linksArray = Array.from(allCollectionLinks);
    console.log(`Total unique collection links found across all pages: ${linksArray.length}`);
    
    // Double-check for any duplicate URLs (shouldn't happen with Set, but just in case)
    const uniqueLinks = [...new Set(linksArray)];
    if (uniqueLinks.length !== linksArray.length) {
      console.warn(`Found ${linksArray.length - uniqueLinks.length} duplicate links, using ${uniqueLinks.length} unique links`);
    }
    
    // Send unique links to background script
    chrome.runtime.sendMessage({
      action: 'collectionLinks',
      links: uniqueLinks
    }, response => {
      console.log('All collection links sent to background script');
    });
  };
  
  // Start by clicking the collection tab after initial delay
  setTimeout(() => {
    const tabClicked = clickCollectionTab();
    
    // Wait for content to load after clicking tab
    setTimeout(() => {
      processAllPages();
    }, tabClicked ? 3000 : 1000);
  }, 2000);
}

function extractCollectionData() {
  console.log('Extracting collection data...');
  
  // Try multiple times to extract data as page loads
  let extractAttempts = 0;
  const maxExtractAttempts = 3;
  
  const tryExtractData = () => {
    extractAttempts++;
    console.log(`Data extraction attempt ${extractAttempts}...`);
    
    // Wait for any popups to be dismissed or become inactive
    const dismissPopups = () => {
      // Try to close cookie consent popup
      const cookieCloseBtn = document.querySelector('#close-pc-btn-handler, .onetrust-close-btn-handler');
      if (cookieCloseBtn) {
        console.log('Attempting to close cookie popup');
        cookieCloseBtn.click();
      }
      
      // Hide popup overlays
      const popupOverlays = document.querySelectorAll('#onetrust-consent-sdk, .onetrust-pc-dark-filter');
      popupOverlays.forEach(overlay => {
        if (overlay) {
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
        }
      });
    };
    
    dismissPopups();
    
    const collectionData = {};
    
    // Extract collection ID from URL
    const urlMatch = window.location.href.match(/collection\/(\d+)/);
    collectionData.collectionId = urlMatch ? urlMatch[1] : null;
    
    // Extract collection-level metadata
    const allText = document.body.innerText;
    
    // Extract UPC (collection-level)
    const upcMatch = allText.match(/UPC[:\s]+(\d{12,13})/i);
    collectionData.upc = upcMatch ? upcMatch[1] : null;
    
    // Extract Genre (collection-level)
    const genreMatch = allText.match(/Genre[:\s]+([^\n]+)/i);
    collectionData.genre = genreMatch ? genreMatch[1].trim() : null;
    
    // Extract Release ID (collection-level)
    const releaseIdMatch = allText.match(/Release ID[:\s]+(\w+)/i);
    collectionData.releaseId = releaseIdMatch ? releaseIdMatch[1] : null;
    
    // Extract release date (collection-level) from the date attribute
    const releaseDateElement = document.querySelector('span[data-path="release_timeline_info_received"]');
    if (releaseDateElement && releaseDateElement.getAttribute('date')) {
      collectionData.releaseDate = releaseDateElement.getAttribute('date');
    } else {
      // Fallback to text matching if element not found
      const releaseDateMatch = allText.match(/Release Date[:\s]+([^\n]+)/i);
      collectionData.releaseDate = releaseDateMatch ? releaseDateMatch[1].trim() : null;
    }
    
    // Extract cover art (collection-level)
    const coverArtSelectors = [
      'img.img-cover-art-img',
      'img[alt*="cover"]',
      'img[alt*="artwork"]',
      '.cover-art img',
      'img[src*="cdn.amuse.io"]'
    ];
    
    for (const selector of coverArtSelectors) {
      const coverArtImg = document.querySelector(selector);
      if (coverArtImg && coverArtImg.src && coverArtImg.src.includes('amuse')) {
        // Remove size parameters from the URL to get the original image
        collectionData.coverArtUrl = coverArtImg.src.replace(/\.\d+x\d+/, '');
        collectionData.coverArtThumbnail = coverArtImg.src;
        break;
      }
    }
    
    // Add the current page URL
    collectionData.pageUrl = window.location.href;
    
    // Extract songs (there can be multiple)
    collectionData.songs = [];
    
    // Look for song containers - be very specific and exclude popup areas
    const mainContentArea = document.querySelector('#__nuxt') || document.querySelector('#app') || document.body;
    
    // Only search within main content, exclude popups and overlays
    let songContainers = mainContentArea.querySelectorAll('.bg-surface-3.mb-6');
    
    console.log(`Found ${songContainers.length} potential song containers with .bg-surface-3.mb-6`);
    
    // Filter out any containers that are inside popup/overlay areas
    songContainers = Array.from(songContainers).filter(container => {
      const excludeAreas = [
        '#onetrust-consent-sdk',
        '.onetrust-pc-dark-filter', 
        '#intercom-frame',
        '.intercom-lightweight-app',
        '#toasts'
      ];
      
      return !excludeAreas.some(excludeSelector => {
        const excludeParent = container.closest(excludeSelector);
        return excludeParent !== null;
      });
    });
    
    console.log(`After excluding popup areas: ${songContainers.length} containers`);
    
    // If no containers found, try broader search but still exclude popups
    if (songContainers.length === 0) {
      songContainers = Array.from(mainContentArea.querySelectorAll('.p-6.bg-surface-3, .bg-surface-3')).filter(container => {
        const excludeAreas = [
          '#onetrust-consent-sdk',
          '.onetrust-pc-dark-filter', 
          '#intercom-frame',
          '.intercom-lightweight-app',
          '#toasts'
        ];
        
        return !excludeAreas.some(excludeSelector => {
          const excludeParent = container.closest(excludeSelector);
          return excludeParent !== null;
        });
      });
      console.log(`Trying broader search, found ${songContainers.length} containers`);
    }
    
    // Filter to only containers that actually contain song data
    const validSongContainers = songContainers.filter(container => {
      const hasISRC = container.querySelector('span[data-path="core_lbl_isrc_text"]');
      const hasAudioFile = container.querySelector('span[data-path="core_lbl_audio_file"]');
      const hasContributors = container.querySelector('span[data-path="core_lbl_contributors"]');
      
      // Must have actual song-specific data attributes
      return hasISRC || hasAudioFile || hasContributors;
    });
    
    console.log(`Found ${validSongContainers.length} valid song containers`);
    
    if (validSongContainers.length === 0) {
      // No song containers found, extract as single song from the entire page
      console.log('No song containers found, extracting as single song from page');
      const songData = extractSingleSong();
      if (songData && (songData.songName || songData.isrc || songData.audioFileName)) {
        collectionData.songs.push(songData);
      } else {
        console.warn('Failed to extract any song data from page');
      }
    } else {
      // Extract data for each valid song container, avoiding duplicates
      const extractedSongs = new Set();
      
      validSongContainers.forEach((container, index) => {
        const songData = extractSongFromContainer(container, index + 1);
        if (songData && (songData.songName || songData.isrc || songData.audioFileName)) {
          // Create a unique key for this song to detect duplicates
          const songKey = `${songData.songName || 'unknown'}_${songData.isrc || 'no-isrc'}_${index}`;
          
          if (!extractedSongs.has(songKey)) {
            extractedSongs.add(songKey);
            collectionData.songs.push(songData);
            console.log(`Added song: ${songData.songName || 'Unknown'} (ISRC: ${songData.isrc || 'None'})`);
          } else {
            console.log(`Duplicate song detected: ${songData.songName}, skipping...`);
          }
        } else {
          console.warn(`Failed to extract meaningful data from container ${index + 1}`);
        }
      });
    }
    
    // Log what we found
    console.log('Extracted collection data:', collectionData);
    
    // Check if we have minimum required data
    const hasMinimumData = collectionData.collectionId && 
      (collectionData.songs.length > 0 || collectionData.upc);
    
    if (hasMinimumData || extractAttempts >= maxExtractAttempts) {
      // Send data to background script
      chrome.runtime.sendMessage({
        action: 'collectionData',
        data: collectionData
      }, response => {
        console.log('Data sent to background script');
      });
    } else {
      // Try again after a delay
      console.log('Insufficient data extracted, retrying...');
      setTimeout(tryExtractData, 2000);
    }
  };
  
  // Function to extract single song (fallback)
  const extractSingleSong = () => {
    const songData = { trackNumber: 1 };
    
    console.log('Attempting single song extraction...');
    
    // First, exclude popup and overlay content
    const excludeSelectors = [
      '#onetrust-consent-sdk',
      '.onetrust-pc-dark-filter',
      '#intercom-frame',
      '.intercom-lightweight-app',
      '#toasts',
      'header a', // Exclude header navigation
      'script',
      'style'
    ];
    
    // Try multiple selectors for song name - be very specific to avoid popups
    const nameSelectors = [
      'header .text-title-large', // Specific header title class from HTML
      'h4.text-title-large',
      '.name', // Only if not in excluded areas
      'h4:not(#onetrust-pc-title)', // Exclude cookie popup titles
    ];
    
    for (const selector of nameSelectors) {
      const nameElements = document.querySelectorAll(selector);
      
      for (const nameElement of nameElements) {
        // Skip if element is inside excluded areas
        if (excludeSelectors.some(excludeSelector => {
          const excludeParent = nameElement.closest(excludeSelector);
          return excludeParent !== null;
        })) {
          continue;
        }
        
        // Skip if element is hidden or has no actual content
        if (!nameElement.offsetParent || !nameElement.textContent.trim()) {
          continue;
        }
        
        let songName = nameElement.textContent.trim();
        
        // Skip obviously non-song names
        const invalidNames = [
          'Strictly Necessary Cookies',
          'Functional Cookies', 
          'Performance Cookies',
          'Targeting Cookies',
          'Privacy Preference Center',
          'Cookie List',
          'Artist Toolbox',
          'Store Sync',
          'Buy',
          'Allow all',
          'Confirm My Choices'
        ];
        
        if (invalidNames.some(invalid => songName.includes(invalid))) {
          continue;
        }
        
        // Clean up track number prefix if present (handles "01", "02", "01 ", "02 ", etc.)
        const trackMatch = songName.match(/^(\d{1,2})\s*(.+)$/);
        if (trackMatch) {
          songName = trackMatch[2];
          console.log(`Removed track number "${trackMatch[1]}" from song name`);
        }
        
        songData.songName = songName;
        console.log(`Found song name: ${songName} (selector: ${selector})`);
        break;
      }
      
      if (songData.songName) break;
    }
    
    // Extract ISRC
    const isrcElement = document.querySelector('span[data-path="core_lbl_isrc_text"]');
    if (isrcElement) {
      const isrcValueElement = isrcElement.parentElement.querySelector('span.font-light') || 
                              isrcElement.nextElementSibling;
      if (isrcValueElement) {
        songData.isrc = isrcValueElement.textContent.trim();
        console.log(`Found ISRC: ${songData.isrc}`);
      }
    }
    
    // If no ISRC found, try text search as fallback
    if (!songData.isrc) {
      const allText = document.body.innerText;
      const isrcMatch = allText.match(/ISRC[:\s]+([A-Z]{2}[A-Z0-9]{3}\d{2}\d{5})/i);
      if (isrcMatch) {
        songData.isrc = isrcMatch[1];
        console.log(`Found ISRC via text search: ${songData.isrc}`);
      }
    }
    
    // Extract contributors
    songData.contributors = [];
    extractContributors(document, songData.contributors);
    console.log(`Found ${songData.contributors.length} contributors`);
    
    // Extract audio file
    extractAudioFile(document, songData);
    if (songData.audioFileName) {
      console.log(`Found audio file: ${songData.audioFileName}`);
    }
    
    console.log('Single song extraction result:', songData);
    return Object.keys(songData).length > 1 ? songData : null; // More than just trackNumber
  };
  
  // Function to extract song data from a container
  const extractSongFromContainer = (container, trackNumber) => {
    const songData = {
      trackNumber: trackNumber
    };
    
    // Extract song name from container - look for track number and name pattern
    const nameElement = container.querySelector('.name, h4 span.name, h4');
    if (nameElement) {
      let songName = nameElement.textContent.trim();
      
      // Remove track number prefix if present (handles "01", "02", "01 ", "02 ", etc.)
      const trackNumberMatch = songName.match(/^(\d{1,2})\s*(.+)$/);
      if (trackNumberMatch) {
        songName = trackNumberMatch[2];
        console.log(`Removed track number "${trackNumberMatch[1]}" from song: ${songName}`);
      }
      
      songData.songName = songName;
    }
    
    // Extract ISRC from container
    const isrcElement = container.querySelector('span[data-path="core_lbl_isrc_text"]');
    if (isrcElement) {
      // Look for ISRC value in next sibling or parent structure
      const isrcValueElement = isrcElement.parentElement.querySelector('span.font-light') || 
                              isrcElement.nextElementSibling ||
                              isrcElement.parentElement.querySelector('span:not([data-path])');
      if (isrcValueElement) {
        songData.isrc = isrcValueElement.textContent.trim();
      }
    }
    
    // Extract contributors from this container
    songData.contributors = [];
    extractContributors(container, songData.contributors);
    
    // Extract audio file from this container
    extractAudioFile(container, songData);
    
    console.log(`Extracted song ${trackNumber}:`, songData);
    
    return Object.keys(songData).length > 1 ? songData : null; // More than just trackNumber
  };
  
  // Helper function to extract contributors
  const extractContributors = (container, contributorsArray) => {
    // Look for contributors section
    const contributorsSection = container.querySelector('span[data-path="core_lbl_contributors"]');
    if (contributorsSection) {
      const contributorsList = contributorsSection.closest('div').parentElement.querySelectorAll('ul li');
      contributorsList.forEach(li => {
        const nameElement = li.querySelector('span.font-bold');
        const roleElement = li.querySelector('span.artist-roles');
        if (nameElement && roleElement) {
          const name = nameElement.textContent.trim();
          const role = roleElement.textContent.trim();
          contributorsArray.push({
            name: name,
            role: role
          });
        }
      });
    }
    
    // Also check for splits section
    const splitsSection = container.querySelector('span[data-path="core_lbl_splits"]');
    if (splitsSection) {
      const splitsList = splitsSection.closest('div').parentElement.querySelectorAll('ul li');
      splitsList.forEach(li => {
        const nameElement = li.querySelector('span.font-bold');
        const percentElement = li.querySelector('span.mr-2');
        if (nameElement && percentElement && percentElement.textContent.includes('%')) {
          const name = nameElement.textContent.trim();
          const percent = percentElement.textContent.trim();
          // Find existing contributor or add new one
          const existingContributor = contributorsArray.find(c => c.name === name);
          if (existingContributor) {
            existingContributor.split = percent;
          } else {
            contributorsArray.push({
              name: name,
              role: 'Rights holder',
              split: percent
            });
          }
        }
      });
    }
  };
  
  // Helper function to extract audio file
  const extractAudioFile = (container, songData) => {
    const audioFileSpan = container.querySelector('span[data-path="core_lbl_audio_file"]');
    if (audioFileSpan) {
      const audioFileNameElement = audioFileSpan.parentElement.querySelector('span.font-light');
      if (audioFileNameElement) {
        songData.audioFileName = audioFileNameElement.textContent.trim();
      }
    }
  };
  
  // Start extraction after initial delay
  setTimeout(tryExtractData, 2000);
}