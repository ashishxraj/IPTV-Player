# 📺 Advanced IPTV Player

A modern, robust, and feature-rich IPTV player built with HTML, JavaScript, and HLS.js. Load and stream M3U playlists with a sleek interface and advanced functionality.

## ✨ Features

### Core Functionality
- Multiple playlist sources: Load from URL or local file (.m3u, .m3u8)
- HLS support: Native HLS.js integration with fallback for Apple devices
- Channel management: Browse, search, and organize channels
- Responsive design: Works on desktop, tablet, and mobile devices

### Robustness & Stability
- **Auto-retry mechanism**: Automatically retries failed streams (3 attempts)
- **Error handling**: Comprehensive error handling with user-friendly messages
- **Connection monitoring**: Visual status indicators and connection health checks
- **Buffer optimization**: Configurable buffer settings for smooth playback
- **Timeout protection**: 15-second timeout for playlist loading

### 🎮 User Experience
- **Keyboard shortcuts**:
  - Up/Down arrow keys: Switch channels
  - Space: Play/Pause
  - F: Toggle fullscreen
  - /: Focus search
- Search & filter: Real-time channel filtering
- Sorting options: Sort channels A–Z
- Shuffle play: Random channel selection
- Recent playlists: Local storage remembers recent URLs
- State persistence: Remembers volume, mute state, and playback position

### Visual Features
- Modern dark theme: Easy on the eyes with proper contrast
- Loading animations: Smooth transitions and loading indicators
- Channel indicators: Live indicator and active channel highlighting
- Toast notifications: Non-intrusive status messages
- Player stats: Resolution and buffer information display

## 🚀 Quick Start

1. Clone or download the repository:
   ```bash
   git clone https://github.com/ashishxraj/IPTV-Player
   cd IPTV-Player
   ```
2. Open `index.html` in a modern browser
3. Load a Playlist:
   - Paste an M3U URL and click "Load URL"
   - Or click "Load File" to select a local .m3u file
4. Start Watching: Click any channel to begin playback

## 📋 Usage Instructions

### Loading Playlists
- **From URL**: Paste the direct link to your M3U playlist
- **From File**: Select a local M3U/M3U8 file from your device
- **Recent Playlists**: Click "Recent" to access recently loaded URLs

### Player Controls
- **Basic Controls**: Standard video player controls (play, pause, volume, etc.)
- **Channel Navigation**: Click channels in the sidebar or use arrow keys
- **Fullscreen**: Click the fullscreen icon or press `F`
- **Search**: Type in the search bar to filter channels in real-time

### Advanced Features
- **Auto-Play**: First channel automatically plays on playlist load
- **Error Recovery**: Player attempts to recover from stream errors
- **Mobile Support**: Sidebar collapses on smaller screens
- **Shareable Links**: Copy URL with hash to share specific channel

## 🔧 Technical Details

### Dependencies
- **HLS.js**: For HLS stream playback (loaded from CDN)
- **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **Local Storage**: For saving preferences and recent playlists

### Browser Support
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ⚠️ Requires HLS support or Apple HLS native support

### M3U Format Support
- Standard M3U format with EXTINF tags
- Channel names extracted from EXTINF lines
- Supports both HTTP and HTTPS URLs
- Basic logo support (if included in M3U)

## 🛠️ Development

### Project Structure
```
IPTV-Player/
├── index.html
├── style.css
└── script.js
```

### Key Functions
- `parseM3U()`: Parses M3U playlist format
- `playChannel()`: Handles HLS stream playback
- `loadPlaylistFromUrl()`: Fetches and processes remote playlists
- `handleStreamError()`: Error recovery and retry logic

### Extending the Player
To add new features:

1. **Add EPG Support**: Parse XMLTV data alongside M3U
2. **Favorites System**: Add star icons and local storage for favorites
3. **Quality Switching**: Implement manual quality/bitrate selection
4. **Parental Controls**: Add PIN protection for certain channels
5. **Multi-view**: Picture-in-picture or split-screen viewing

## ⚠️ Important Notes

### Legal Considerations
- This player is a tool for playing IPTV streams
- You must have proper rights to access and view the content
- The developer is not responsible for how this tool is used
- Always comply with local laws and copyright regulations

### Limitations
- CORS restrictions may prevent loading some playlists
- DRM-protected streams are not supported
- Requires internet connection for URL-based playlists
- Large playlists (>1000 channels) may impact performance

### Performance Tips
- Use local files for large playlists
- Close other bandwidth-intensive applications
- Ensure stable internet connection for streaming
- Use wired connection for best results

## 🐛 Troubleshooting

### Common Issues

**Playlist Won't Load**
- Check URL validity and CORS permissions
- Verify M3U file format is correct
- Try loading from file instead of URL

**Stream Won't Play**
- Check internet connection
- Verify stream URL is accessible
- Try a different browser
- Check browser console for errors

**Poor Playback Quality**
- Ensure sufficient bandwidth
- Reduce buffer settings for slower connections
- Close other streaming applications

### Debug Mode
Open browser Developer Tools (F12) to:
- View network requests
- Check JavaScript errors
- Monitor console logs
- Debug HLS.js events

## 📞 Support

For issues, questions, or feature requests:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure your playlist format is valid
4. Verify stream URLs are accessible

## 📄 License

This project is provided for educational and personal use. Users are responsible for ensuring they have the right to access any content played through this application.

## 🙏 Credits

- **HLS.js**: For excellent HLS streaming library
- **Modern Web APIs**: For native video and storage support
- **IPTV Community**: For testing and feedback

---

**Enjoy your IPTV experience!** 🎬📡