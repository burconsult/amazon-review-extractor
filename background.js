// Background service worker for Amazon Review Extractor - Automatic Mode
let extractionState = {
  isExtracting: false,
  totalReviews: 0,
  totalPages: 0,
  currentPage: 0,
  productTitle: '',
  settings: null
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Review Extractor installed (Automatic Mode)');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Forward progress updates to popup
  if (message.action === 'updateProgress') {
    chrome.runtime.sendMessage(message);
  }
  
  // Handle extraction started
  if (message.action === 'extractionStarted') {
    extractionState = {
      isExtracting: true,
      totalReviews: message.totalReviews || 0,
      totalPages: message.totalPages || 0,
      currentPage: 1,
      productTitle: message.productInfo?.title || '',
      settings: message.settings
    };
    
    // Store state in chrome.storage for persistence
    chrome.storage.local.set({ backgroundExtractionState: extractionState });
    
    chrome.runtime.sendMessage(message);
  }
  
  // Handle extraction complete
  if (message.action === 'extractionComplete') {
    extractionState.isExtracting = false;
    chrome.storage.local.remove(['backgroundExtractionState']);
    chrome.runtime.sendMessage(message);
  }
  
  // Handle export completion
  if (message.action === 'exportComplete') {
    extractionState = {
      isExtracting: false,
      totalReviews: 0,
      totalPages: 0,
      currentPage: 0,
      productTitle: '',
      settings: null
    };
    chrome.storage.local.remove(['backgroundExtractionState']);
    chrome.runtime.sendMessage(message);
  }
  
  // Handle extraction errors
  if (message.action === 'extractionError') {
    extractionState.isExtracting = false;
    chrome.storage.local.remove(['backgroundExtractionState']);
    chrome.runtime.sendMessage(message);
  }
  
  // Handle extraction state request
  if (message.action === 'getExtractionState') {
    sendResponse(extractionState);
    return;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});

// Listen for tab updates to reopen popup when navigating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', { tabId, status: changeInfo.status, url: tab.url });
  
  if (changeInfo.status === 'complete' && 
      tab.url && 
      (tab.url.includes('amazon.com/product-reviews') || tab.url.includes('amazon.com/dp/')) &&
      extractionState.isExtracting) {
    
    console.log('Amazon page loaded during extraction, reopening popup');
    
    // Wait for the page to fully load and content script to initialize
    setTimeout(async () => {
      console.log('Attempting to reopen popup...');
      
      try {
        // Try to inject content script if needed
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        console.log('Content script injected after page load');
      } catch (error) {
        console.log('Content script already loaded or injection failed:', error);
      }
      
      // Wait a bit more for the script to initialize
      setTimeout(() => {
        try {
          chrome.action.openPopup();
        } catch (popupError) {
          console.log('Failed to open popup, continuing extraction:', popupError);
        }
      }, 1000);
    }, 3000);
  }
});
