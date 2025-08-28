document.addEventListener('DOMContentLoaded', function() {
  const extractAllBtn = document.getElementById('extractAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const status = document.getElementById('status');
  const progress = document.getElementById('progress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const stats = document.getElementById('stats');
  const totalReviews = document.getElementById('totalReviews');
  const pagesExtracted = document.getElementById('pagesExtracted');
  const currentPage = document.getElementById('currentPage');
  const productTitle = document.getElementById('productTitle');
  
  // Check if we're on an Amazon page and restore state if needed
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (!currentTab.url.includes('amazon.com')) {
      showStatus('Please navigate to an Amazon product page first.', 'error');
      extractAllBtn.disabled = true;
    } else {
      // Check if extraction is in progress
      checkExtractionState();
    }
  });
  
  // Extract All Reviews Button
  extractAllBtn.addEventListener('click', async function() {
    const includeImages = document.getElementById('includeImages').checked;
    const includeHelpful = document.getElementById('includeHelpful').checked;
    const includeVerified = document.getElementById('includeVerified').checked;
    
    const settings = {
      includeImages,
      includeHelpful,
      includeVerified
    };
    
                    try {
                  extractAllBtn.disabled = true;
                  showStatus('Starting automatic extraction...', 'info');
                  showProgress();
                  
                  // Get the current tab
                  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                  
                  // Check if we're on an Amazon page
                  if (!tab.url.includes('amazon.com')) {
                    showStatus('Please navigate to an Amazon product or reviews page first.', 'error');
                    return;
                  }
      
      // Try to inject content script if not already loaded
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Content script injected');
      } catch (injectError) {
        console.log('Content script already loaded or injection failed:', injectError);
      }
      
      // Wait a moment for the script to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send message to content script to start automatic extraction
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractAllReviews',
        settings: settings
      });
      
      if (response.success) {
        showStatus('Automatic extraction started!', 'success');
      } else {
        showStatus(`Error: ${response.error}`, 'error');
        hideProgress();
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
      hideProgress();
    } finally {
      extractAllBtn.disabled = false;
    }
  });
  
  // Export Reviews Button
  exportBtn.addEventListener('click', async function() {
    try {
      exportBtn.disabled = true;
      showStatus('Exporting reviews...', 'info');
      
      // Send message to content script to export reviews
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'exportReviews'
      });
      
      if (response.success) {
        showStatus('Exporting...', 'info');
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      exportBtn.disabled = false;
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
      updateProgress(message.progress, message.text);
    } else if (message.action === 'extractionStarted') {
      showStatus('Extraction started! Loading reviews page...', 'success');
      extractAllBtn.style.display = 'none';
      updateStats(message.totalReviews, 1, message.productInfo?.title, 1);
    } else if (message.action === 'extractionComplete') {
      showStatus(`Extraction complete! ${message.totalReviews} reviews extracted from ${message.totalPages} pages.`, 'success');
      hideProgress();
      extractAllBtn.style.display = 'none';
      exportBtn.style.display = 'block';
      updateStats(message.totalReviews, message.totalPages, message.productInfo?.title, message.totalPages);
    } else if (message.action === 'exportComplete') {
      showStatus(`Export complete! ${message.totalReviews} reviews exported to CSV.`, 'success');
      hideProgress();
      extractAllBtn.style.display = 'block';
      exportBtn.style.display = 'none';
      stats.style.display = 'none';
    } else if (message.action === 'extractionError') {
      showStatus(`Error: ${message.error}`, 'error');
      hideProgress();
      extractAllBtn.style.display = 'block';
    }
  });
  
  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
  }
  
  function showProgress() {
    progress.style.display = 'block';
  }
  
  function hideProgress() {
    progress.style.display = 'none';
  }
  
  function updateProgress(percentage, text) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text || `${percentage}%`;
  }
  
  function updateStats(reviews, pages, title, currentPageNum) {
    totalReviews.textContent = reviews || 0;
    pagesExtracted.textContent = pages || 0;
    currentPage.textContent = currentPageNum || '-';
    productTitle.textContent = title || 'Unknown Product';
    stats.style.display = 'block';
  }
  
  function checkExtractionState() {
    chrome.runtime.sendMessage({action: 'getExtractionState'}, (response) => {
      if (response && response.isExtracting) {
        console.log('Extraction in progress, restoring state:', response);
        
        // Restore UI state
        extractAllBtn.style.display = 'none';
        exportBtn.style.display = 'block';
        stats.style.display = 'block';
        
        // Update stats
        updateStats(response.totalReviews, response.totalPages, response.productTitle, response.currentPage);
        
        // Show status
        showStatus('Extraction in progress...', 'info');
        showProgress();
      }
    });
  }
});
