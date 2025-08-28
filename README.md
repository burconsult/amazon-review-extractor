# Amazon Review Extractor

A Chrome extension that automatically extracts Amazon product reviews and exports them to CSV format with full multi-page support.

## Features

- **Automatic Multi-Page Extraction**: Automatically navigates through all review pages (up to 99 reviews)
- **Comprehensive Data**: Extracts review ID, reviewer name, rating, title, date, country, text, verified purchase status, helpful votes, images, location, and product variants
- **Smart Navigation**: Handles Amazon's pagination system and security measures
- **CSV Export**: Properly formatted CSV with quote escaping and UTF-8 support
- **Date Parsing**: Converts review dates to ISO format (YYYY-MM-DD) with country extraction
- **Lazy Loading Support**: Scrolls to load all reviews on each page
- **Progress Tracking**: Real-time progress updates during extraction
- **Error Recovery**: Robust error handling and state management

## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Amazon Review Extractor icon should appear in your toolbar

### Usage

1. **Navigate to Amazon**: Go to any Amazon product page or reviews page
2. **Click the Extension Icon**: Open the Amazon Review Extractor popup
3. **Configure Options** (optional):
   - Include review images
   - Include helpful votes
   - Include verified purchase status
4. **Start Extraction**: Click "Extract All Reviews"
5. **Wait for Completion**: The extension will automatically:
   - Navigate to the reviews page (if on product page)
   - Count total reviews and calculate pages needed
   - Extract reviews from each page automatically
   - Show progress updates
6. **Export**: Click "Export Reviews" when extraction is complete
7. **Download CSV**: Your reviews will be downloaded as a CSV file

## Supported Amazon URLs

- Product pages: `https://www.amazon.com/dp/PRODUCT_ID`
- Product pages: `https://www.amazon.com/product-name/dp/PRODUCT_ID`
- Review pages: `https://www.amazon.com/product-reviews/PRODUCT_ID`

## CSV Output Format

The exported CSV includes the following columns:

| Column | Description |
|--------|-------------|
| Review ID | Unique identifier for each review |
| Reviewer Name | Name of the reviewer |
| Rating | Star rating (1-5) |
| Title | Review title |
| Date | Review date in ISO format (YYYY-MM-DD) |
| Country | Country where review was posted |
| Text | Full review text |
| Verified Purchase | Whether purchase was verified |
| Helpful Votes | Number of helpful votes |
| Images | URLs of review images |
| Location | Reviewer location (if available) |
| Variant | Product variant info (size, color, etc.) |

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension API
- **Content Scripts**: Handles DOM interaction and data extraction
- **Background Script**: Manages state and popup communication
- **Popup Interface**: User-friendly control panel

### Key Features

- **State Persistence**: Maintains extraction progress across page reloads
- **Smart Pagination**: Handles Amazon's inconsistent pagination system
- **Lazy Loading**: Automatically scrolls to load dynamically loaded content
- **Data Validation**: Cleans and validates extracted data
- **CSV Escaping**: Properly escapes quotes, commas, and special characters
- **Error Recovery**: Graceful error handling and retry mechanisms

### Browser Permissions

- `activeTab`: Access current Amazon tab
- `scripting`: Inject content scripts
- `downloads`: Download CSV files
- `storage`: Persist extraction state

## Troubleshooting

### Common Issues

**Extension not working on Amazon page**
- Ensure you're on amazon.com (not other Amazon domains)
- Try refreshing the page and clicking the extension icon again

**Extraction stops midway**
- The extension automatically resumes if interrupted
- Check browser console for any error messages
- Try refreshing and starting extraction again

**No reviews found**
- Ensure the product has reviews
- Try navigating directly to the reviews page
- Check if reviews are blocked by region restrictions

**CSV file not downloading**
- Check your browser's download permissions
- Ensure pop-up blocker isn't blocking downloads
- Try clicking "Export Reviews" again

### Debug Mode

To enable debug mode:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for "Amazon Review Extractor" messages
4. Report any errors with the console output

## Limitations

- **Review Limit**: Extracts up to 99 reviews per Amazon's current pagination limitations
- Works only on amazon.com (US version)
- Requires JavaScript to be enabled
- Subject to Amazon's rate limiting and anti-bot measures
- Maximum extraction speed limited by page load times
- Some reviews may be region-restricted
- No advanced filtering options (coming in future versions)

## Privacy

- **No Data Collection**: Extension doesn't collect or transmit any data
- **Local Processing**: All extraction happens locally in your browser
- **No External Servers**: Data never leaves your computer
- **No Tracking**: No analytics or user tracking

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup

1. Clone the repository
2. Load the extension in Chrome (Developer mode)
3. Make changes to the source files
4. Reload the extension in Chrome
5. Test on various Amazon pages

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0 (2025-08-28)

- Initial release
- Multi-page automatic extraction (up to 99 reviews per Amazon's pagination limit)
- CSV export with proper formatting
- Date and country parsing
- Progress tracking
- Error recovery
- Support for all review data fields

### Planned Features (Future Versions)

- Advanced filtering options (rating, date range, verified only, etc.)
- Support for other Amazon domains (.co.uk, .de, .ca, etc.)
- Bulk extraction from multiple products
- Review sentiment analysis
- Enhanced CSV customization options

## Support

For issues, feature requests, or questions:

1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Include browser version, error messages, and steps to reproduce

---

**Disclaimer**: This extension is not affiliated with Amazon. Use responsibly and in accordance with Amazon's Terms of Service.
