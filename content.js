// Amazon Review Extractor Content Script - Manual Navigation Approach
class AmazonReviewExtractor {
  constructor() {
    this.allReviews = [];
    this.currentPage = 1;
    this.settings = {};
    this.isExtracting = false;
    this.productInfo = null;
    this.extractedPages = new Set();
    
    // Check if we're continuing an extraction
    this.checkForExistingExtraction();
    
    // Check if there's an ongoing extraction from background script
    this.checkForBackgroundExtraction();
  }
  
  // Start extraction - extract current page only
  async startExtraction(settings) {
    if (this.isExtracting) {
      return { success: false, error: 'Extraction already in progress' };
    }
    
    this.isExtracting = true;
    this.settings = settings;
    this.allReviews = [];
    this.currentPage = 1;
    this.extractedPages.clear();
    
    try {
      console.log('Starting Amazon review extraction...');
      
      // Get initial product info
      this.productInfo = this.extractProductInfo();
      const totalReviews = this.extractTotalReviews();
      
      console.log(`Product: ${this.productInfo.title}`);
      console.log(`Total reviews found: ${totalReviews}`);
      
      // Extract current page
      await this.extractCurrentPage();
      
      // Save state
      this.saveExtractionState();
      
      return { 
        success: true, 
        totalReviews: this.allReviews.length,
        productInfo: this.productInfo,
        message: 'Current page extracted. Navigate to next page and click "Extract Page" to continue.'
      };
      
    } catch (error) {
      this.isExtracting = false;
      console.error('Extraction failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Automatic extraction of all reviews from product page
  async extractAllReviews(settings) {
    console.log('Starting automatic extraction from product page...');
    
    // Reset extraction state to ensure clean start
    this.resetExtractionState();
    
    this.isExtracting = true;
    this.settings = settings;
    this.allReviews = [];
    this.extractedPages = new Set();
    
    try {
      // Check if we're on a product page or reviews page
      const isProductPage = window.location.href.includes('/dp/');
      const isReviewsPage = window.location.href.includes('/product-reviews/');
      
      if (isProductPage) {
        // Navigate to reviews page first
        console.log('On product page, navigating to reviews...');
        await this.navigateToReviewsPage();
        await this.waitForPageLoad();
        await this.delay(2000);
      }
      
      // Wait for the reviews page to be fully loaded before starting extraction
      console.log('Waiting for reviews page to be fully loaded...');
      await this.waitForReviewsPageToLoad();
      
      // Additional delay to ensure everything is loaded
      await this.delay(2000);
      
      // Extract product info and total reviews from first page
      this.productInfo = this.extractProductInfo();
      const totalReviews = this.extractTotalReviews();
      const totalPages = Math.ceil(totalReviews / 10);
      
      console.log(`Product: ${this.productInfo.title}`);
      console.log(`Total reviews: ${totalReviews}`);
      console.log(`Total pages to extract: ${totalPages}`);
      console.log(`Current URL: ${window.location.href}`);
      
      if (totalPages === 0) {
        console.log('No reviews found, checking page content...');
        // Try to find any review elements to debug
        const reviewElements = document.querySelectorAll('[data-hook="review"]');
        console.log(`Found ${reviewElements.length} review elements on page`);
        
        // Also check for the total reviews element
        const totalReviewsElement = document.querySelector('[data-hook="cr-filter-info-review-rating-count"]');
        if (totalReviewsElement) {
          console.log('Total reviews element found:', totalReviewsElement.textContent);
        } else {
          console.log('Total reviews element not found');
        }
        
        return { success: false, error: 'No reviews found on this page' };
      }
      
      // Send extraction started message
      chrome.runtime.sendMessage({
        action: 'extractionStarted',
        totalReviews: totalReviews,
        totalPages: totalPages,
        productInfo: this.productInfo,
        settings: this.settings
      });
      
      // Extract current page first
      console.log('Extracting page 1...');
      await this.extractCurrentPage();
      
      // Continue extracting remaining pages
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Automatically navigating to page ${page}...`);
        
        // Navigate to next page using auto-click
        const navigationResult = await this.navigateToNextPage();
        if (!navigationResult.success) {
          console.log('Navigation failed, stopping extraction');
          break;
        }
        
        // Wait for page to load and stabilize
        console.log('Waiting for page to load...');
        await this.waitForPageLoad();
        
        // Additional delay to ensure page is fully loaded
        await this.delay(3000);
        
        // Extract the current page
        console.log(`Extracting page ${page}...`);
        await this.extractCurrentPage();
        
        // Update progress
        const progress = Math.round((page / totalPages) * 100);
        this.updateProgress(progress, `Extracted ${this.allReviews.length} reviews from ${page}/${totalPages} pages`);
        
        // Send progress update to popup
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          progress: progress,
          text: `Extracted ${this.allReviews.length} reviews from ${page}/${totalPages} pages`
        });
        
        // Small delay before next page
        await this.delay(2000);
      }
      
      console.log(`Automatic extraction complete! Extracted ${this.allReviews.length} reviews from ${this.extractedPages.size} pages`);
      
      return {
        success: true,
        totalReviews: this.allReviews.length,
        totalPages: totalPages,
        extractedPages: this.extractedPages.size,
        productInfo: this.productInfo
      };
      
    } catch (error) {
      this.isExtracting = false;
      console.error('Automatic extraction failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Wait for page to load
  async waitForPageLoad() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds max wait
      
      const checkLoaded = () => {
        attempts++;
        
        // Check for reviews
        const reviews = document.querySelectorAll('[data-hook="review"]');
        
        // Check for pagination (to ensure we're on a reviews page)
        const pagination = document.querySelector('nav[data-hook="pagination-bar"]');
        
        if (reviews.length > 0 && pagination) {
          console.log(`Page loaded successfully after ${attempts} attempts. Found ${reviews.length} reviews.`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('Page load timeout, proceeding anyway...');
          resolve();
        } else {
          console.log(`Waiting for page to load... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkLoaded, 500);
        }
      };
      
      checkLoaded();
    });
  }
  
  // Extract current page only
  async extractCurrentPage() {
    console.log(`\n📄 EXTRACTING CURRENT PAGE`);
    console.log(`   Current URL: ${window.location.href}`);
    
    const pageReviews = await this.extractPageReviews();
    
    // Get current page number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPageFromUrl = parseInt(urlParams.get('pageNumber')) || 1;
    
    console.log(`   Page number from URL: ${currentPageFromUrl}`);
    console.log(`   Reviews found on page: ${pageReviews.length}`);
    
    // Filter out duplicates before adding
    const existingIds = new Set(this.allReviews.map(r => r.id));
    const newReviews = pageReviews.filter(review => !existingIds.has(review.id));
    
    console.log(`   Existing reviews: ${this.allReviews.length}`);
    console.log(`   New reviews to add: ${newReviews.length}`);
    
    this.allReviews.push(...newReviews);
    this.extractedPages.add(currentPageFromUrl);
    
    console.log(`   Total reviews after adding: ${this.allReviews.length}`);
    console.log(`   Pages extracted: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
    
    // Update progress
    const progress = Math.round((this.extractedPages.size / Math.max(this.extractedPages.size, 1)) * 100);
    this.updateProgress(progress, `Extracted ${this.allReviews.length} reviews from ${this.extractedPages.size} pages`);
    
    // Save state after each page
    this.saveExtractionState();
    
    return {
      success: true,
      pageNumber: currentPageFromUrl,
      reviewsFound: pageReviews.length,
      newReviews: newReviews.length,
      totalReviews: this.allReviews.length,
      extractedPages: Array.from(this.extractedPages).sort((a,b) => a-b)
    };
  }
  
  // Export all collected reviews
  async exportReviews() {
    if (this.allReviews.length === 0) {
      return { success: false, error: 'No reviews to export' };
    }
    
    console.log(`Exporting ${this.allReviews.length} reviews...`);
    
    // Generate and download CSV
    const csvData = this.generateCSV();
    this.downloadCSV(csvData);
    
    this.isExtracting = false;
    this.clearExtractionState();
    
    return { 
      success: true, 
      totalReviews: this.allReviews.length,
      productInfo: this.productInfo
    };
  }
  
  // Navigate to reviews page from product page
  async navigateToReviewsPage() {
    console.log('Looking for "See more reviews" link...');
    
    // Find the "See more reviews" link
    const reviewsLink = document.querySelector('a[data-hook="see-all-reviews-link-foot"]');
    
    if (!reviewsLink) {
      // Try alternative selectors
      const alternativeSelectors = [
        'a[href*="/product-reviews/"]',
        'a:contains("See more reviews")',
        'a:contains("See all reviews")',
        '.a-link-emphasis[href*="/product-reviews/"]'
      ];
      
      for (const selector of alternativeSelectors) {
        const link = document.querySelector(selector);
        if (link && link.href && link.href.includes('/product-reviews/')) {
          console.log('Found reviews link:', link.href);
          
          // Try clicking the link
          try {
            link.click();
            console.log('Clicked reviews link successfully');
            return { success: true, message: 'Navigating to reviews page' };
          } catch (error) {
            console.warn('Click failed, trying href:', error);
            window.location.href = link.href;
            return { success: true, message: 'Navigating to reviews page' };
          }
        }
      }
      
      return { success: false, error: 'Could not find reviews link' };
    }
    
    console.log('Found "See more reviews" link:', reviewsLink.href);
    
    // Try clicking the link
    try {
      reviewsLink.click();
      console.log('Clicked "See more reviews" link successfully');
      return { success: true, message: 'Navigating to reviews page' };
    } catch (error) {
      console.warn('Click failed, trying href:', error);
      window.location.href = reviewsLink.href;
      return { success: true, message: 'Navigating to reviews page' };
    }
  }
  
  // Navigate to next page
  async navigateToNextPage() {
    console.log('Looking for next page link...');
    
    // Get current page number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('pageNumber')) || 1;
    console.log('Current page:', currentPage);
    
    // Find the next page link - specifically look for the "Next page" link
    const nextPageLink = document.querySelector('nav[data-hook="pagination-bar"] li:last-child a[href*="pageNumber"]');
    
    if (!nextPageLink) {
      // Try alternative selectors
      const nextPageSelectors = [
        'nav[data-hook="pagination-bar"] li:last-child a',
        '.a-pagination li:last-child a',
        'a[href*="pageNumber"]'
      ];
      
      for (const selector of nextPageSelectors) {
        const link = document.querySelector(selector);
        if (link && link.href && link.href.includes('pageNumber')) {
          // Check if this is actually a "Next page" link
          const linkText = link.textContent.trim().toLowerCase();
          if (linkText.includes('next page') || linkText.includes('→')) {
            console.log('Found next page link:', link.href);
            
            // Extract the target page number from the URL
            const targetUrl = new URL(link.href);
            const targetPage = parseInt(targetUrl.searchParams.get('pageNumber')) || 0;
            console.log('Target page:', targetPage);
            
            // Amazon's pagination is inconsistent - just click the "Next page" link regardless of page number
            console.log('Amazon pagination detected - clicking Next page link regardless of page number');
            
            // Try multiple click methods to bypass Amazon's security
            try {
              // Method 1: Direct click
              link.click();
              console.log('Direct click successful');
              return { success: true, message: 'Navigating to next page' };
            } catch (error) {
              console.warn('Direct click failed, trying dispatchEvent:', error);
              
              try {
                // Method 2: Dispatch click event
                const clickEvent = new MouseEvent('click', {
                  view: window,
                  bubbles: true,
                  cancelable: true
                });
                link.dispatchEvent(clickEvent);
                console.log('Dispatch click successful');
                return { success: true, message: 'Navigating to next page' };
              } catch (error2) {
                console.warn('Dispatch click failed, trying href:', error2);
                
                // Method 3: Direct href navigation
                window.location.href = link.href;
                return { success: true, message: 'Navigating to next page' };
              }
            }
          }
        }
      }
      
      return { success: false, error: 'No next page found' };
    }
    
    console.log('Found next page link:', nextPageLink.href);
    console.log('Link text:', nextPageLink.textContent.trim());
    
    // Extract the target page number from the URL
    const targetUrl = new URL(nextPageLink.href);
    const targetPage = parseInt(targetUrl.searchParams.get('pageNumber')) || 0;
    console.log('Target page:', targetPage);
    
    // Verify this is actually a "Next page" link
    const linkText = nextPageLink.textContent.trim().toLowerCase();
    if (linkText.includes('next page') || linkText.includes('→')) {
      console.log('✅ Confirmed: This is a "Next page" link');
    } else {
      console.log('❌ Warning: This might not be a "Next page" link');
    }
    
    // Amazon's pagination is inconsistent - just click the "Next page" link regardless of page number
    console.log('Amazon pagination detected - clicking Next page link regardless of page number');
    
    // Try multiple click methods to bypass Amazon's security
    try {
      // Method 1: Direct click
      nextPageLink.click();
      console.log('Direct click successful');
      return { success: true, message: 'Navigating to next page' };
    } catch (error) {
      console.warn('Direct click failed, trying dispatchEvent:', error);
      
      try {
        // Method 2: Dispatch click event
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        nextPageLink.dispatchEvent(clickEvent);
        console.log('Dispatch click successful');
        return { success: true, message: 'Navigating to next page' };
      } catch (error2) {
        console.warn('Dispatch click failed, trying href:', error2);
        
        // Method 3: Direct href navigation
        window.location.href = nextPageLink.href;
        return { success: true, message: 'Navigating to next page' };
      }
    }
  }
  

  

  
  // Simple delay function
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Check for existing extraction in storage
  checkForExistingExtraction() {
    chrome.storage.local.get(['extractionState'], (result) => {
      if (result.extractionState && result.extractionState.isExtracting) {
        console.log('Found existing extraction, continuing...');
        this.continueExtraction(result.extractionState);
      }
    });
  }
  
  // Check if there's an ongoing extraction from background script
  async checkForBackgroundExtraction() {
    try {
      // First check storage for background state
      const storageResult = await new Promise((resolve) => {
        chrome.storage.local.get(['backgroundExtractionState'], resolve);
      });
      
      if (storageResult.backgroundExtractionState && storageResult.backgroundExtractionState.isExtracting) {
        console.log('Found ongoing extraction in storage, resuming...');
        console.log('Background state:', storageResult.backgroundExtractionState);
        
        // Resume the extraction with the settings from background
        if (storageResult.backgroundExtractionState.settings) {
          this.settings = storageResult.backgroundExtractionState.settings;
          this.isExtracting = true;
          
          // Get current page number from URL
          const urlParams = new URLSearchParams(window.location.search);
          const currentPageFromUrl = parseInt(urlParams.get('pageNumber')) || 1;
          console.log(`Resuming extraction on page ${currentPageFromUrl}`);
          
          // Start the extraction process
          setTimeout(async () => {
            try {
              await this.resumeExtractionFromPage(currentPageFromUrl, storageResult.backgroundExtractionState.settings);
            } catch (error) {
              console.error('Failed to resume extraction:', error);
            }
          }, 2000); // Wait a bit for page to be ready
        }
        return;
      }
      
      // Also check for regular extraction state
      const extractionResult = await new Promise((resolve) => {
        chrome.storage.local.get(['extractionState'], resolve);
      });
      
      if (extractionResult.extractionState && extractionResult.extractionState.isExtracting) {
        console.log('Found ongoing extraction in regular storage, resuming...');
        console.log('Extraction state:', extractionResult.extractionState);
        
        // Resume the extraction with the settings from storage
        if (extractionResult.extractionState.settings) {
          this.settings = extractionResult.extractionState.settings;
          this.isExtracting = true;
          
          // Get current page number from URL
          const urlParams = new URLSearchParams(window.location.search);
          const currentPageFromUrl = parseInt(urlParams.get('pageNumber')) || 1;
          console.log(`Resuming extraction on page ${currentPageFromUrl}`);
          
          // Start the extraction process
          setTimeout(async () => {
            try {
              await this.resumeExtractionFromPage(currentPageFromUrl, extractionResult.extractionState.settings);
            } catch (error) {
              console.error('Failed to resume extraction:', error);
            }
          }, 2000); // Wait a bit for page to be ready
        }
        return;
      }
      
      // Fallback: check background script directly
      const response = await chrome.runtime.sendMessage({action: 'getExtractionState'});
      if (response && response.isExtracting) {
        console.log('Found ongoing extraction in background script, resuming...');
        console.log('Background state:', response);
        
        // Resume the extraction with the settings from background
        if (response.settings) {
          this.settings = response.settings;
          this.isExtracting = true;
          
          // Get current page number from URL
          const urlParams = new URLSearchParams(window.location.search);
          const currentPageFromUrl = parseInt(urlParams.get('pageNumber')) || 1;
          console.log(`Resuming extraction on page ${currentPageFromUrl}`);
          
          // Start the extraction process
          setTimeout(async () => {
            try {
              await this.resumeExtractionFromPage(currentPageFromUrl, response.settings);
            } catch (error) {
              console.error('Failed to resume extraction:', error);
            }
          }, 2000); // Wait a bit for page to be ready
        }
      }
    } catch (error) {
      console.log('No background extraction state or error checking:', error);
    }
  }
  
  // Check if we're on the last page
  isOnLastPage() {
    const currentPage = this.getCurrentPageNumber();
    
    // Get total reviews from the first page extraction or current page
    const totalReviews = this.getTotalReviews();
    
    if (totalReviews > 0) {
      // Calculate total pages (10 reviews per page)
      const totalPages = Math.ceil(totalReviews / 10);
      console.log(`Total reviews: ${totalReviews}, Total pages: ${totalPages}, Current page: ${currentPage}`);
      
      return currentPage >= totalPages;
    }
    
    // Fallback: Look for next page link
    const nextPageLink = document.querySelector('nav[data-hook="pagination-bar"] a[href*="pageNumber"]');
    
    if (!nextPageLink) {
      return true; // No pagination, likely last page
    }
    
    // Check if the next page link points to a higher page number
    const targetUrl = new URL(nextPageLink.href);
    const targetPage = parseInt(targetUrl.searchParams.get('pageNumber')) || 0;
    
    return targetPage <= currentPage;
  }
  
  // Get current page number from URL
  getCurrentPageNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageNumber = parseInt(urlParams.get('pageNumber')) || 1;
    
    // Amazon's URL shows the actual current page number
    // If pageNumber=1, we're on page 1
    // If pageNumber=2, we're on page 2
    return pageNumber;
  }
  
  // Get total pages based on total reviews
  getTotalPages() {
    const totalReviews = this.getTotalReviews();
    if (totalReviews > 0) {
      return Math.ceil(totalReviews / 10);
    }
    return 0;
  }
  
  // Get total number of reviews
  getTotalReviews() {
    // First try to get from stored product info
    if (this.productInfo && this.productInfo.totalReviews) {
      return this.productInfo.totalReviews;
    }
    
    // Try to extract from current page using existing method
    const totalReviews = this.extractTotalReviews();
    
    // Store in product info for future use
    if (this.productInfo && totalReviews > 0) {
      this.productInfo.totalReviews = totalReviews;
    }
    
    return totalReviews;
  }
  
  // Continue existing extraction
  async continueExtraction(state) {
    this.allReviews = state.reviews || [];
    this.currentPage = state.currentPage || 1;
    this.settings = state.settings || {};
    this.isExtracting = true;
    this.productInfo = state.productInfo || null;
    this.extractedPages = new Set(state.extractedPages || []);
    
    console.log(`Continuing extraction...`);
    console.log(`Already have ${this.allReviews.length} reviews`);
    console.log(`Pages extracted: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
    
    // Get current page number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPageFromUrl = parseInt(urlParams.get('pageNumber')) || 1;
    
    console.log(`Current page from URL: ${currentPageFromUrl}`);
    
    // Check if this page was already extracted
    if (this.extractedPages.has(currentPageFromUrl)) {
      console.log(`Page ${currentPageFromUrl} already extracted`);
      return {
        success: true,
        message: `Page ${currentPageFromUrl} already extracted. Navigate to a new page and click "Extract Page".`
      };
    }
    
    // Extract current page
    return await this.extractCurrentPage();
  }
  
  // Save extraction state
  saveExtractionState() {
    const state = {
      isExtracting: this.isExtracting,
      reviews: this.allReviews,
      currentPage: this.currentPage,
      settings: this.settings,
      productInfo: this.productInfo,
      extractedPages: Array.from(this.extractedPages)
    };
    
    chrome.storage.local.set({ extractionState: state });
  }
  
  // Clear extraction state
  clearExtractionState() {
    chrome.storage.local.remove(['extractionState']);
  }
  
  // Reset extraction state for new extraction
  resetExtractionState() {
    console.log('Resetting extraction state...');
    this.isExtracting = false;
    this.allReviews = [];
    this.extractedPages.clear();
    this.currentPage = 1;
    this.productInfo = null;
    
    // Clear storage state
    chrome.storage.local.remove(['extractionState']);
    console.log('Extraction state reset complete');
  }
  

  
  // Extract product information
  extractProductInfo() {
    // Try multiple selectors for product title
    const titleSelectors = [
      'h1[data-automation-id="title"]',
      '.a-size-large.product-title-word-break',
      'h1.a-size-large',
      '[data-hook="product-title"]',
      '.a-size-large.a-spacing-none.a-color-base',
      'h1'
    ];
    
    let title = 'Unknown Product';
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        break;
      }
    }
    
    const asin = this.extractASIN();
    const totalReviews = this.extractTotalReviews();
    
    return {
      title: title,
      asin: asin,
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      totalReviews: totalReviews
    };
  }
  
  // Extract ASIN from URL or page
  extractASIN() {
    const urlMatch = window.location.href.match(/\/product-reviews\/([A-Z0-9]{10})/);
    if (urlMatch) return urlMatch[1];
    
    // Fallback: look for ASIN in page elements
    const asinElement = document.querySelector('[data-asin]');
    return asinElement?.getAttribute('data-asin') || 'Unknown';
  }
  
  // Extract total number of reviews
  extractTotalReviews() {
    const selectors = [
      '[data-hook="cr-filter-info-review-rating-count"]',
      '.a-size-base[data-hook="cr-filter-info-review-rating-count"]',
      '.a-row.a-spacing-base.a-size-base',
      '[data-hook="cr-filter-info-review-rating-count"] .a-size-base',
      '.a-row.a-spacing-base.a-size-base:contains("customer reviews")',
      '.a-size-base:contains("customer reviews")'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        
        // Try different patterns
        const patterns = [
          /(\d+)\s+customer\s+reviews?/i,
          /(\d+)\s+reviews?/i,
          /(\d+)\s+total\s+reviews?/i
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const count = parseInt(match[1]);
            return count;
          }
        }
      }
    }
    return 0;
  }
  
  // Extract reviews from current page
  async extractPageReviews() {
    console.log('Starting to extract reviews from current page...');
    
    // First, scroll to load all reviews
    await this.scrollToLoadReviews();
    
    // Try multiple selectors for review elements
    const selectors = [
      '[data-hook="review"]',
      '.review',
      '[data-component-type="review"]',
      '.a-section.review'
    ];
    
    let reviewElements = [];
          for (const selector of selectors) {
      reviewElements = document.querySelectorAll(selector);
      if (reviewElements.length > 0) {
        break;
      }
    }
    
    const reviews = [];
    
    reviewElements.forEach((element, index) => {
      try {
        const review = this.extractSingleReview(element);
        if (review && review.reviewerName && review.text) {
          reviews.push(review);
        }
      } catch (error) {
        console.error(`Error extracting review ${index}:`, error);
      }
    });
    
    console.log(`Extracted ${reviews.length} reviews from current page`);
    return reviews;
  }
  
  // Scroll to load all reviews (Amazon uses lazy loading)
  async scrollToLoadReviews() {
    console.log('Scrolling to load all reviews...');
    
    let scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentScroll = 0;
    let lastScrollHeight = 0;
    let noChangeCount = 0;
    let maxScrolls = 10; // Prevent infinite scrolling
    let scrollCount = 0;
    
    // Scroll down gradually to trigger lazy loading
    while (currentScroll < scrollHeight && noChangeCount < 3 && scrollCount < maxScrolls) {
      currentScroll += viewportHeight * 0.8; // Scroll 80% of viewport height
      window.scrollTo(0, currentScroll);
      scrollCount++;
      
      console.log(`Scroll ${scrollCount}: Position ${currentScroll}/${scrollHeight}`);
      
      // Wait for content to load
      await this.delay(1500);
      
      // Check if page height changed (new content loaded)
      const newScrollHeight = document.documentElement.scrollHeight;
      if (newScrollHeight === lastScrollHeight) {
        noChangeCount++;
        console.log(`No height change (${noChangeCount}/3)`);
      } else {
        noChangeCount = 0;
        lastScrollHeight = newScrollHeight;
        console.log(`Height changed: ${scrollHeight} -> ${newScrollHeight}`);
      }
      
      // Update scroll height for next iteration
      scrollHeight = newScrollHeight;
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    await this.delay(500);
    
    console.log(`Finished scrolling after ${scrollCount} scrolls, all reviews should be loaded`);
    
    // Wait a bit more for any final lazy loading
    await this.delay(1000);
    
    // Wait for reviews to appear
    await this.waitForReviewsToLoad();
  }
  
  // Wait for reviews to load after scrolling
  async waitForReviewsToLoad() {
    console.log('Waiting for reviews to load...');
    
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max wait
    
    while (attempts < maxAttempts) {
      const reviews = document.querySelectorAll('[data-hook="review"]');
      if (reviews.length > 0) {
        console.log(`Found ${reviews.length} reviews after waiting ${attempts * 0.5} seconds`);
        return;
      }
      
      attempts++;
      await this.delay(500);
    }
    
    console.warn('No reviews found after waiting, proceeding anyway...');
  }
  
  // Wait for the initial reviews page to be fully loaded
  async waitForReviewsPageToLoad() {
    console.log('Waiting for reviews page to be fully loaded...');
    
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      // Check for key elements that indicate the page is loaded
      const reviews = document.querySelectorAll('[data-hook="review"]');
      const totalReviewsElement = document.querySelector('[data-hook="cr-filter-info-review-rating-count"]');
      const pagination = document.querySelector('nav[data-hook="pagination-bar"]');
      
      console.log(`Attempt ${attempts + 1}: Found ${reviews.length} reviews, total element: ${!!totalReviewsElement}, pagination: ${!!pagination}`);
      
      // Page is considered loaded if we have reviews OR the total reviews element
      if (reviews.length > 0 || totalReviewsElement) {
        console.log(`Reviews page loaded successfully after ${attempts + 1} attempts`);
        console.log(`Reviews found: ${reviews.length}`);
        if (totalReviewsElement) {
          console.log(`Total reviews element: "${totalReviewsElement.textContent.trim()}"`);
        }
        return;
      }
      
      attempts++;
      await this.delay(500);
    }
    
    console.warn('Reviews page load timeout, proceeding anyway...');
  }
  
  // Resume extraction from a specific page
  async resumeExtractionFromPage(currentPage, settings) {
    console.log(`=== RESUME EXTRACTION FROM PAGE ${currentPage} ===`);
    console.log(`Current URL: ${window.location.href}`);
    console.log(`Settings:`, settings);
    
    // Restore extraction state from storage instead of resetting
    this.isExtracting = true;
    this.settings = settings;
    
    // Try to restore previous extraction state
    const storageResult = await new Promise((resolve) => {
      chrome.storage.local.get(['extractionState'], resolve);
    });
    
    console.log('Storage result:', storageResult);
    
    if (storageResult.extractionState && storageResult.extractionState.reviews) {
      this.allReviews = storageResult.extractionState.reviews;
      this.extractedPages = new Set(storageResult.extractionState.extractedPages || []);
      console.log(`✅ Restored ${this.allReviews.length} reviews from storage`);
      console.log(`✅ Restored extracted pages: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
    } else {
      this.allReviews = [];
      this.extractedPages = new Set();
      console.log('❌ No previous extraction state found, starting fresh');
    }
    
    try {
      // Wait for the page to be fully loaded
      await this.waitForReviewsPageToLoad();
      await this.delay(2000);
      
      // Extract product info and total reviews from current page
      this.productInfo = this.extractProductInfo();
      const totalReviews = this.extractTotalReviews();
      const totalPages = Math.ceil(totalReviews / 10);
      
      console.log(`📊 EXTRACTION SUMMARY:`);
      console.log(`   Product: ${this.productInfo.title}`);
      console.log(`   Total reviews: ${totalReviews}`);
      console.log(`   Total pages: ${totalPages}`);
      console.log(`   Current page: ${currentPage}`);
      console.log(`   Reviews so far: ${this.allReviews.length}`);
      console.log(`   Pages extracted: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
      
      if (totalPages === 0) {
        console.log('No reviews found, checking page content...');
        const reviewElements = document.querySelectorAll('[data-hook="review"]');
        console.log(`Found ${reviewElements.length} review elements on page`);
        
        const totalReviewsElement = document.querySelector('[data-hook="cr-filter-info-review-rating-count"]');
        if (totalReviewsElement) {
          console.log('Total reviews element found:', totalReviewsElement.textContent);
        } else {
          console.log('Total reviews element not found');
        }
        
        return { success: false, error: 'No reviews found on this page' };
      }
      
      // Send extraction started message
      chrome.runtime.sendMessage({
        action: 'extractionStarted',
        totalReviews: totalReviews,
        totalPages: totalPages,
        productInfo: this.productInfo,
        settings: this.settings
      });
      
      // Extract current page first (if not already extracted)
      if (!this.extractedPages.has(currentPage)) {
        console.log(`Extracting current page ${currentPage}...`);
        await this.extractCurrentPage();
      } else {
        console.log(`Page ${currentPage} already extracted, skipping...`);
      }
      
      // Continue extracting remaining pages
      console.log(`🔄 STARTING LOOP: currentPage=${currentPage}, totalPages=${totalPages}`);
      console.log(`   Will extract pages: ${Array.from({length: totalPages - currentPage}, (_, i) => currentPage + 1 + i).join(', ')}`);
      
      for (let page = currentPage + 1; page <= totalPages; page++) {
        console.log(`\n=== 🚀 STARTING EXTRACTION FOR PAGE ${page}/${totalPages} ===`);
        console.log(`   Loop iteration: page=${page}, currentPage=${currentPage}, totalPages=${totalPages}`);
        console.log(`   Reviews before navigation: ${this.allReviews.length}`);
        
        // Navigate to next page using auto-click
        const navigationResult = await this.navigateToNextPage();
        console.log(`   Navigation result for page ${page}:`, navigationResult);
        
        if (!navigationResult.success) {
          console.log(`❌ Navigation failed for page ${page}, stopping extraction`);
          console.log(`   Current URL: ${window.location.href}`);
          console.log(`   Current page from URL: ${new URLSearchParams(window.location.search).get('pageNumber')}`);
          break;
        }
        
        // Wait for page to load and stabilize
        console.log(`   Waiting for page ${page} to load...`);
        await this.waitForPageLoad();
        
        // Additional delay to ensure page is fully loaded
        await this.delay(3000);
        
        // Extract the current page
        console.log(`   Extracting page ${page}...`);
        await this.extractCurrentPage();
        
        console.log(`   Reviews after extraction: ${this.allReviews.length}`);
        console.log(`   Pages extracted now: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
        
        // Update progress
        const progress = Math.round((page / totalPages) * 100);
        this.updateProgress(progress, `Extracted ${this.allReviews.length} reviews from ${page}/${totalPages} pages`);
        
        // Send progress update to popup
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          progress: progress,
          text: `Extracted ${this.allReviews.length} reviews from ${page}/${totalPages} pages`
        });
        
        // Small delay before next page
        await this.delay(2000);
        
        console.log(`✅ === COMPLETED EXTRACTION FOR PAGE ${page}/${totalPages} ===`);
      }
      
      console.log(`\n🎉 RESUMED EXTRACTION COMPLETE!`);
      console.log(`   Final review count: ${this.allReviews.length}`);
      console.log(`   Final pages extracted: ${this.extractedPages.size}`);
      console.log(`   Pages extracted: ${Array.from(this.extractedPages).sort((a,b) => a-b).join(', ')}`);
      console.log(`   Expected total pages: ${totalPages}`);
      
      // Send completion message
      chrome.runtime.sendMessage({
        action: 'extractionComplete',
        totalReviews: this.allReviews.length,
        totalPages: totalPages,
        extractedPages: this.extractedPages.size,
        productInfo: this.productInfo
      });
      
      return {
        success: true,
        totalReviews: this.allReviews.length,
        totalPages: totalPages,
        extractedPages: this.extractedPages.size,
        productInfo: this.productInfo
      };
      
    } catch (error) {
      this.isExtracting = false;
      console.error('Resumed extraction failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Extract data from a single review element
  extractSingleReview(reviewElement) {
    let review = {};
    
    // Review ID - make it more unique
    const reviewId = reviewElement.getAttribute('id') || 
                    reviewElement.querySelector('[data-hook="review-id"]')?.textContent?.trim();
    
    if (reviewId) {
      review.id = reviewId;
    } else {
      // Generate unique ID based on reviewer name, date, and rating
      const reviewer = reviewElement.querySelector('.a-profile-name')?.textContent?.trim() || 'unknown';
      const date = reviewElement.querySelector('[data-hook="review-date"]')?.textContent?.trim() || 'unknown';
      const rating = reviewElement.querySelector('.a-icon-alt')?.textContent?.trim() || 'unknown';
      review.id = `review_${reviewer.replace(/[^a-zA-Z0-9]/g, '')}_${date.replace(/[^a-zA-Z0-9]/g, '')}_${rating.replace(/[^a-zA-Z0-9]/g, '')}`;
    }
    
    // Reviewer name
    review.reviewerName = reviewElement.querySelector('.a-profile-name')?.textContent?.trim() ||
                         reviewElement.querySelector('[data-hook="reviewer"]')?.textContent?.trim() ||
                         'Anonymous';
    
    // Rating - extract just the number
    const ratingElement = reviewElement.querySelector('[data-hook="review-star-rating"] .a-icon-alt') ||
                         reviewElement.querySelector('.a-icon-alt');
    if (ratingElement) {
      const ratingText = ratingElement.textContent;
      const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s+out of\s+5/);
      review.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    }
    
    // Review title - clean up the star rating text
    let title = reviewElement.querySelector('[data-hook="review-title"]')?.textContent?.trim() ||
                reviewElement.querySelector('.a-size-base.review-title')?.textContent?.trim() ||
                '';
    
    // Remove star rating text from title (e.g., "5.0 out of 5 stars")
    title = title.replace(/\d+\.?\d*\s+out\s+of\s+5\s+stars?\s*/gi, '').trim();
    review.title = title;
    
    // Review date - extract and format properly
    const dateText = reviewElement.querySelector('[data-hook="review-date"]')?.textContent?.trim() ||
                    reviewElement.querySelector('.review-date')?.textContent?.trim() ||
                    '';
    
    // Parse date and extract country
    const dateInfo = this.parseReviewDate(dateText);
    review.date = dateInfo.date;
    review.country = dateInfo.country;
    
    // Review text - clean up extra whitespace and newlines
    let text = reviewElement.querySelector('[data-hook="review-body"]')?.textContent?.trim() ||
               reviewElement.querySelector('.review-text')?.textContent?.trim() ||
               '';
    
    // Clean up text: remove extra whitespace, normalize newlines
    text = text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    review.text = text;
    
    // Verified purchase
    if (this.settings.includeVerified) {
      const verifiedElement = reviewElement.querySelector('[data-hook="avp-badge"]') ||
                            reviewElement.querySelector('.a-color-state');
      review.verifiedPurchase = verifiedElement ? 'Yes' : 'No';
    }
    
    // Helpful votes
    if (this.settings.includeHelpful) {
      const helpfulElement = reviewElement.querySelector('[data-hook="helpful-vote-statement"]') ||
                           reviewElement.querySelector('.cr-vote-text');
      if (helpfulElement) {
        const helpfulText = helpfulElement.textContent;
        const helpfulMatch = helpfulText.match(/(\d+)/);
        review.helpfulVotes = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;
      } else {
        review.helpfulVotes = 0;
      }
    }
    
    // Review images
    if (this.settings.includeImages) {
      const imageElements = reviewElement.querySelectorAll('[data-hook="review-image"] img, .review-image img');
      review.images = Array.from(imageElements).map(img => img.src).join('; ');
    }
    
    // Review location (if available)
    review.location = reviewElement.querySelector('.a-profile-location')?.textContent?.trim() || '';
    
    // Review size/color (if available)
    const variantElement = reviewElement.querySelector('.a-size-mini.a-color-secondary');
    review.variant = variantElement?.textContent?.trim() || '';
    
    // Validate and clean data
    review = this.validateReviewData(review);
    
    return review;
  }
  
  // Parse review date and extract country
  parseReviewDate(dateText) {
    // Pattern: "Reviewed in the United States on February 25, 2025"
    const countryMatch = dateText.match(/Reviewed\s+in\s+(.+?)\s+on\s+(.+)/i);
    
    if (countryMatch) {
      let country = countryMatch[1].trim();
      const dateString = countryMatch[2].trim();
      
      // Remove "the" from country names
      if (country.toLowerCase().startsWith('the ')) {
        country = country.substring(4);
      }
      
      // Parse the date
      const parsedDate = this.parseDateString(dateString);
      
      return {
        date: parsedDate,
        country: country
      };
    }
    
    // Fallback if pattern doesn't match
    return {
      date: dateText,
      country: 'Unknown'
    };
  }
  
  // Parse date string to ISO format
  parseDateString(dateString) {
    try {
      // Try parsing common formats first
      const monthNames = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
      };
      
      // Pattern: "February 25, 2025" or "July 26, 2019"
      const dateMatch = dateString.match(/(\w+)\s+(\d+),\s+(\d{4})/i);
      if (dateMatch) {
        const monthName = dateMatch[1].toLowerCase();
        const month = monthNames[monthName];
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        if (month !== undefined) {
          const parsedDate = new Date(year, month, day);
          const isoDate = parsedDate.toISOString().split('T')[0];
          return isoDate;
        }
      }
      
      // Try native Date parsing as fallback
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const isoDate = date.toISOString().split('T')[0];
        return isoDate;
      }
      
      // If all parsing fails, return original string
      return dateString;
    } catch (error) {
      return dateString;
    }
  }
  
  // Validate and clean review data
  validateReviewData(review) {
    // Ensure required fields have values
    if (!review.reviewerName || review.reviewerName === 'Anonymous') {
      review.reviewerName = 'Anonymous';
    }
    
    // Ensure rating is a valid number
    if (review.rating && (isNaN(review.rating) || review.rating < 1 || review.rating > 5)) {
      review.rating = null;
    }
    
    // Clean up title
    if (review.title) {
      review.title = review.title.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace
      if (review.title.length === 0) {
        review.title = 'No Title';
      }
    }
    
    // Clean up text
    if (review.text) {
      review.text = review.text.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace
      if (review.text.length === 0) {
        review.text = 'No Review Text';
      }
    }
    
    // Clean up country
    if (review.country) {
      review.country = review.country.replace(/^\s+|\s+$/g, '');
    }
    
    // Ensure helpful votes is a number
    if (review.helpfulVotes && isNaN(review.helpfulVotes)) {
      review.helpfulVotes = 0;
    }
    
    return review;
  }
  
  // Generate CSV data with proper escaping
  generateCSV() {
    const headers = [
      'Review ID',
      'Reviewer Name',
      'Rating',
      'Title',
      'Date',
      'Country',
      'Text',
      'Verified Purchase',
      'Helpful Votes',
      'Images',
      'Location',
      'Variant'
    ];
    
    // Helper function to properly escape CSV fields
    const escapeCSVField = (field) => {
      if (field === null || field === undefined) return '';
      
      // Convert to string
      let str = String(field);
      
      // If the field contains quotes, commas, or newlines, it needs to be escaped
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        // Escape quotes by doubling them
        str = str.replace(/"/g, '""');
        // Wrap in quotes
        str = `"${str}"`;
      }
      
      return str;
    };
    
    const rows = this.allReviews.map(review => [
      escapeCSVField(review.id),
      escapeCSVField(review.reviewerName),
      escapeCSVField(review.rating),
      escapeCSVField(review.title),
      escapeCSVField(review.date),
      escapeCSVField(review.country || ''),
      escapeCSVField(review.text),
      escapeCSVField(review.verifiedPurchase || ''),
      escapeCSVField(review.helpfulVotes || ''),
      escapeCSVField(review.images || ''),
      escapeCSVField(review.location || ''),
      escapeCSVField(review.variant || '')
    ]);
    
    // Add product info as metadata
    const metadata = [
      ['Product Title', escapeCSVField(this.productInfo.title)],
      ['ASIN', escapeCSVField(this.productInfo.asin)],
      ['URL', escapeCSVField(this.productInfo.url)],
      ['Extracted At', escapeCSVField(this.productInfo.extractedAt)],
      ['Total Reviews', escapeCSVField(this.allReviews.length.toString())],
      ['Pages Extracted', escapeCSVField(this.extractedPages.size.toString())],
      ['', ''], // Empty row for separation
      headers.map(h => escapeCSVField(h)).join(','),
      ...rows.map(row => row.join(','))
    ];
    
    return metadata.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
  }
  
  // Download CSV file
  downloadCSV(csvData) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `amazon_reviews_${this.productInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  // Update progress
  updateProgress(percentage, text) {
    chrome.runtime.sendMessage({
      action: 'updateProgress',
      progress: percentage,
      text: text
    });
  }
}

// Initialize extractor
const extractor = new AmazonReviewExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'startExtraction') {
    console.log('Starting review extraction with settings:', message.settings);
    
    // Send immediate response to prevent message channel timeout
    sendResponse({success: true, message: 'Extraction started'});
    
    // Start extraction in background
    setTimeout(async () => {
      try {
        const result = await extractor.startExtraction(message.settings);
        console.log('Extraction started:', result);
        
        // Send result to popup
        chrome.runtime.sendMessage({
          action: 'extractionStarted',
          ...result
        });
      } catch (error) {
        console.error('Extraction failed:', error);
        
        chrome.runtime.sendMessage({
          action: 'extractionError',
          error: error.message
        });
      }
    }, 100);
    
    return false;
  }
  
  if (message.action === 'extractAllReviews') {
    console.log('Starting automatic extraction with settings:', message.settings);
    
    // Send immediate response to prevent message channel timeout
    sendResponse({success: true, message: 'Automatic extraction started'});
    
    // Start automatic extraction in background
    setTimeout(async () => {
      try {
        // Send extraction started message
        chrome.runtime.sendMessage({
          action: 'extractionStarted',
          totalReviews: 0,
          totalPages: 0,
          productInfo: null,
          settings: message.settings
        });
        
        const result = await extractor.extractAllReviews(message.settings);
        console.log('Automatic extraction completed:', result);
        
        // Send completion result to popup
        chrome.runtime.sendMessage({
          action: 'extractionComplete',
          ...result
        });
      } catch (error) {
        console.error('Automatic extraction failed:', error);
        
        chrome.runtime.sendMessage({
          action: 'extractionError',
          error: error.message
        });
      }
    }, 100);
    
    return false;
  }
  
  if (message.action === 'extractPage') {
    console.log('Extracting current page...');
    
    // Send immediate response
    sendResponse({success: true, message: 'Extracting page...'});
    
    // Extract page in background
    setTimeout(async () => {
      try {
        const result = await extractor.extractCurrentPage();
        console.log('Page extracted:', result);
        
        chrome.runtime.sendMessage({
          action: 'pageExtracted',
          ...result
        });
      } catch (error) {
        console.error('Page extraction failed:', error);
        
        chrome.runtime.sendMessage({
          action: 'extractionError',
          error: error.message
        });
      }
    }, 100);
    
    return false;
  }
  
  if (message.action === 'exportReviews') {
    console.log('Exporting reviews...');
    
    // Send immediate response
    sendResponse({success: true, message: 'Exporting...'});
    
    // Export in background
    setTimeout(async () => {
      try {
        const result = await extractor.exportReviews();
        console.log('Export completed:', result);
        
        chrome.runtime.sendMessage({
          action: 'exportComplete',
          ...result
        });
      } catch (error) {
        console.error('Export failed:', error);
        
        chrome.runtime.sendMessage({
          action: 'extractionError',
          error: error.message
        });
      }
    }, 100);
    
    return false;
  }
  
  if (message.action === 'navigateToNextPage') {
    console.log('Navigating to next page...');
    
    // Send immediate response
    sendResponse({success: true, message: 'Navigating...'});
    
    // Navigate in background
    setTimeout(async () => {
      try {
        const result = await extractor.navigateToNextPage();
        console.log('Navigation completed:', result);
        
        chrome.runtime.sendMessage({
          action: 'navigationComplete',
          ...result
        });
      } catch (error) {
        console.error('Navigation failed:', error);
        
        chrome.runtime.sendMessage({
          action: 'extractionError',
          error: error.message
        });
      }
    }, 100);
    
    return false;
  }
  
  if (message.action === 'checkLastPage') {
    console.log('Checking if on last page...');
    
    const isLastPage = extractor.isOnLastPage();
    const totalReviews = extractor.getTotalReviews();
    const totalPages = totalReviews > 0 ? Math.ceil(totalReviews / 10) : 0;
    
    sendResponse({
      success: true, 
      isLastPage: isLastPage,
      totalPages: totalPages,
      totalReviews: totalReviews
    });
    
    return false;
  }
  
  if (message.action === 'resetState') {
    console.log('Resetting extraction state...');
    
    extractor.resetExtractionState();
    sendResponse({success: true, message: 'State reset successfully'});
    
    return false;
  }
});

// Log when content script loads
console.log('Amazon Review Extractor content script loaded (Simple Sequential Mode)');
