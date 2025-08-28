# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-28

### Added
- **Automatic Multi-Page Extraction**: Automatically navigates through all review pages (up to 99 reviews per Amazon's pagination limitations)
- **Smart Navigation**: Handles Amazon's pagination system and security measures
- **Comprehensive Data Extraction**: Extracts all review fields including:
  - Review ID, reviewer name, rating, title, date, country
  - Review text, verified purchase status, helpful votes
  - Review images, reviewer location, product variants
- **CSV Export**: Properly formatted CSV with UTF-8 support and quote escaping
- **Date Parsing**: Converts review dates to ISO format (YYYY-MM-DD)
- **Country Extraction**: Extracts country from review date text
- **Lazy Loading Support**: Automatically scrolls to load dynamically loaded reviews
- **Progress Tracking**: Real-time progress updates during extraction
- **Error Recovery**: Robust error handling and state management
- **State Persistence**: Maintains extraction progress across page reloads
- **Configurable Options**: Toggle inclusion of images, helpful votes, and verified status

### Technical Features
- **Manifest V3**: Uses latest Chrome extension API
- **Content Scripts**: Handles DOM interaction and data extraction
- **Background Service Worker**: Manages state and popup communication
- **Chrome Storage API**: Persists extraction state
- **Smart Pagination Detection**: Handles Amazon's inconsistent pagination
- **CSV Data Validation**: Cleans and validates extracted data

### Browser Support
- Chrome 88+
- Chromium-based browsers

### Permissions
- `activeTab`: Access current Amazon tab
- `scripting`: Inject content scripts
- `downloads`: Download CSV files
- `storage`: Persist extraction state

### Supported URLs
- Product pages: `https://www.amazon.com/dp/PRODUCT_ID`
- Product pages: `https://www.amazon.com/product-name/dp/PRODUCT_ID`
- Review pages: `https://www.amazon.com/product-reviews/PRODUCT_ID`

### Limitations
- Review extraction limited to 99 reviews per Amazon's current pagination system
- Future versions will include advanced filtering and multi-domain support
