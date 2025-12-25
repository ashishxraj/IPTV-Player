const video = document.getElementById('video');
        const channelList = document.getElementById('channel-list');
        const PLAYER_STORAGE_KEY = 'iptv_player_data';
        const RECENT_PLAYLISTS_KEY = 'iptv_recent_playlists';
        
        let channels = [];
        let filteredChannels = [];
        let currentChannelIndex = -1;
        let hls = null;
        let retryCount = 0;
        const maxRetries = 3;
        let playerStats = {
            bufferingTime: 0,
            errors: 0,
            switches: 0
        };
        let playlistUrl = '';

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            updateStatus('Ready', 'success');
            loadRecentPlaylists();
            setupEventListeners();
            restorePlayerState();
            
            // Auto-load from URL if present in hash
            const hash = window.location.hash.substring(1);
            if (hash && hash.startsWith('http')) {
                document.getElementById('playlist-url').value = decodeURIComponent(hash);
                loadPlaylistFromUrl();
            }
        });

        function setupEventListeners() {
            const fileInput = document.getElementById('playlist-file');
            fileInput.addEventListener('change', loadPlaylistFromFile);
            
            document.getElementById('playlist-url').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') loadPlaylistFromUrl();
            });

            video.addEventListener('error', handleVideoError);
            video.addEventListener('waiting', () => showLoading(true));
            video.addEventListener('playing', () => showLoading(false));
            video.addEventListener('loadeddata', () => updatePlayerStats());
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT') return;
                
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        playPreviousChannel();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        playNextChannel();
                        break;
                    case ' ':
                        e.preventDefault();
                        video.paused ? video.play() : video.pause();
                        break;
                    case 'f':
                        toggleFullscreen();
                        break;
                    case '/':
                        e.preventDefault();
                        document.getElementById('search').focus();
                        break;
                }
            });
        }

        function parseM3U(text) {
            const lines = text.split('\n');
            const parsed = [];
            let currentEntry = {};
            
            for (let line of lines) {
                line = line.trim();
                
                if (line.startsWith('#EXTINF:')) {
                    currentEntry = {};
                    const match = line.match(/#EXTINF:-?\d+\s*(?:.*logo="([^"]+)")?.*,(.*)/);
                    if (match) {
                        currentEntry.name = match[2]?.trim() || 'Unknown Channel';
                        currentEntry.logo = match[1] || null;
                    } else {
                        const nameStart = line.indexOf(',');
                        currentEntry.name = nameStart !== -1 ? line.substring(nameStart + 1).trim() : 'Unknown Channel';
                    }
                } else if (line && !line.startsWith('#') && line.startsWith('http')) {
                    currentEntry.url = line;
                    if (currentEntry.name) {
                        parsed.push({...currentEntry});
                    }
                } else if (line.startsWith('#EXTM3U')) {
                    // M3U header, do nothing
                }
            }
            
            return parsed;
        }

        function renderChannels() {
            channelList.innerHTML = '';
            
            if (filteredChannels.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'channel';
                emptyMsg.textContent = 'No channels found';
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.opacity = '0.5';
                channelList.appendChild(emptyMsg);
                return;
            }
            
            filteredChannels.forEach((ch, index) => {
                const channelElement = document.createElement('div');
                channelElement.className = 'channel';
                channelElement.dataset.index = channels.findIndex(c => c.url === ch.url);
                
                const numberSpan = document.createElement('span');
                numberSpan.className = 'channel-number';
                numberSpan.textContent = (index + 1).toString().padStart(2, '0');
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'channel-name';
                nameSpan.textContent = ch.name;
                
                const liveIndicator = document.createElement('span');
                liveIndicator.className = 'channel-live';
                
                channelElement.appendChild(numberSpan);
                channelElement.appendChild(nameSpan);
                if (index === 0) channelElement.appendChild(liveIndicator);
                
                channelElement.onclick = () => playChannelByIndex(parseInt(channelElement.dataset.index));
                
                channelList.appendChild(channelElement);
            });
            
            updateActiveChannel();
        }

        function filterChannels() {
            const query = document.getElementById('search').value.toLowerCase();
            filteredChannels = channels.filter(ch => 
                ch.name.toLowerCase().includes(query)
            );
            renderChannels();
        }

        function playChannelByIndex(index) {
            if (index < 0 || index >= channels.length) return;
            
            playerStats.switches++;
            currentChannelIndex = index;
            const channel = channels[index];
            
            updateStatus(`Playing: ${channel.name}`, 'success');
            updateCurrentChannelDisplay(channel.name);
            
            // Update URL hash for sharing
            if (playlistUrl) {
                window.location.hash = `#${playlistUrl}|${index}`;
            }
            
            playChannel(channel.url);
            updateActiveChannel();
            savePlayerState();
        }

        function playChannel(url) {
            showLoading(true);
            
            if (hls) {
                hls.destroy();
                hls = null;
            }

            video.classList.add('video-loading');
            
            if (Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    maxBufferSize: 60 * 1000 * 1000,
                    maxBufferHole: 0.5,
                    maxFragLookUpTolerance: 0.2,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 20000,
                    levelLoadingTimeOut: 20000,
                });
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    showLoading(false);
                    retryCount = 0;
                    updatePlayerStats();
                });
                
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                handleStreamError('Network error', data);
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                handleStreamError('Media error', data);
                                break;
                            default:
                                handleStreamError('Unknown error', data);
                                break;
                        }
                    }
                });
                
                hls.loadSource(url);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.load();
                retryCount = 0;
            } else {
                showError('HLS not supported in your browser');
            }
        }

        function handleVideoError() {
            if (retryCount < maxRetries) {
                retryCount++;
                showToast(`Retrying... (${retryCount}/${maxRetries})`, 'warning');
                setTimeout(() => playChannel(channels[currentChannelIndex].url), 1000 * retryCount);
            } else {
                showError('Failed to load stream after multiple attempts');
            }
        }

        function handleStreamError(message, data) {
            playerStats.errors++;
            console.error('HLS Error:', message, data);
            
            if (data?.details === 'manifestLoadError' && retryCount < maxRetries) {
                retryCount++;
                showToast(`Retrying stream... (${retryCount}/${maxRetries})`, 'warning');
                setTimeout(() => hls.loadSource(video.src), 1000 * retryCount);
            } else {
                showError(`Stream error: ${message}`);
            }
        }

        function showLoading(show) {
            const overlay = document.getElementById('error-overlay');
            const spinner = document.getElementById('loading-spinner');
            const message = document.getElementById('error-message');
            
            if (show) {
                overlay.classList.add('active');
                spinner.style.display = 'block';
                message.textContent = 'Loading stream...';
                video.classList.add('video-loading');
            } else {
                overlay.classList.remove('active');
                video.classList.remove('video-loading');
            }
        }

        function showError(message) {
            const overlay = document.getElementById('error-overlay');
            const spinner = document.getElementById('loading-spinner');
            const errorMessage = document.getElementById('error-message');
            
            overlay.classList.add('active');
            spinner.style.display = 'none';
            errorMessage.textContent = message;
            updateStatus(`Error: ${message}`, 'error');
        }

        function retryCurrentChannel() {
            if (currentChannelIndex >= 0) {
                playChannelByIndex(currentChannelIndex);
            }
        }

        function playNextChannel() {
            if (channels.length === 0) return;
            const nextIndex = (currentChannelIndex + 1) % channels.length;
            playChannelByIndex(nextIndex);
        }

        function playPreviousChannel() {
            if (channels.length === 0) return;
            const prevIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
            playChannelByIndex(prevIndex);
        }

        function shufflePlay() {
            if (channels.length === 0) return;
            const randomIndex = Math.floor(Math.random() * channels.length);
            playChannelByIndex(randomIndex);
        }

        function sortChannels(criteria) {
            if (criteria === 'name') {
                channels.sort((a, b) => a.name.localeCompare(b.name));
            }
            filterChannels();
            showToast('Channels sorted', 'success');
        }

        async function loadPlaylistFromUrl() {
            const urlInput = document.getElementById('playlist-url');
            const url = urlInput.value.trim();
            
            if (!url) {
                showToast('Please enter a valid URL', 'error');
                return;
            }
            
            playlistUrl = url;
            updateStatus('Loading playlist...', 'info');
            showLoading(true);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/x-mpegurl, text/plain'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const text = await response.text();
                channels = parseM3U(text);
                
                if (channels.length === 0) {
                    throw new Error('No valid channels found in playlist');
                }
                
                filteredChannels = [...channels];
                renderChannels();
                
                updateStatus(`Loaded ${channels.length} channels`, 'success');
                showToast(`Successfully loaded ${channels.length} channels`, 'success');
                
                // Save to recent playlists
                saveToRecentPlaylists(url);
                
                // Auto-play first channel
                if (channels.length > 0) {
                    setTimeout(() => playChannelByIndex(0), 500);
                }
                
            } catch (error) {
                console.error('Failed to load playlist:', error);
                showToast(`Failed to load playlist: ${error.message}`, 'error');
                updateStatus('Load failed', 'error');
            } finally {
                showLoading(false);
            }
        }

        function loadPlaylistFromFile() {
            const fileInput = document.getElementById('playlist-file');
            if (fileInput.files.length === 0) return;
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    channels = parseM3U(e.target.result);
                    filteredChannels = [...channels];
                    renderChannels();
                    
                    updateStatus(`Loaded ${channels.length} channels from file`, 'success');
                    showToast(`Loaded ${channels.length} channels from ${file.name}`, 'success');
                    
                    if (channels.length > 0) {
                        playChannelByIndex(0);
                    }
                } catch (error) {
                    showToast('Failed to parse playlist file', 'error');
                }
            };
            
            reader.onerror = () => {
                showToast('Failed to read file', 'error');
            };
            
            reader.readAsText(file);
        }

        function updateStatus(message, type = 'info') {
            const statusDot = document.getElementById('connection-status');
            const statusText = document.getElementById('status-text');
            const channelCount = document.getElementById('channel-count');
            
            statusText.textContent = message;
            channelCount.textContent = channels.length > 0 ? `${channels.length} channels loaded` : 'No channels';
            
            statusDot.className = 'status-dot';
            if (type === 'success') {
                statusDot.classList.add('active');
            }
        }

        function updateCurrentChannelDisplay(name) {
            document.getElementById('current-channel').textContent = name || 'No channel selected';
        }

        function updateActiveChannel() {
            document.querySelectorAll('.channel').forEach(el => {
                el.classList.remove('active');
                if (parseInt(el.dataset.index) === currentChannelIndex) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        function updatePlayerStats() {
            const statsElement = document.getElementById('player-stats');
            if (video.readyState > 0) {
                const resolution = `${video.videoWidth}x${video.videoHeight}`;
                const bitrate = video.buffered.length > 0 ? 
                    `Buffered: ${Math.round(video.buffered.end(0) - video.buffered.start(0))}s` : 
                    'Buffering...';
                statsElement.textContent = `${resolution} | ${bitrate}`;
            }
        }

        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(console.error);
            } else {
                document.exitFullscreen();
            }
        }

        function saveToRecentPlaylists(url) {
            const recent = JSON.parse(localStorage.getItem(RECENT_PLAYLISTS_KEY) || '[]');
            const existingIndex = recent.indexOf(url);
            
            if (existingIndex !== -1) {
                recent.splice(existingIndex, 1);
            }
            
            recent.unshift(url);
            if (recent.length > 10) recent.pop();
            
            localStorage.setItem(RECENT_PLAYLISTS_KEY, JSON.stringify(recent));
        }

        function loadRecentPlaylists() {
            const recent = JSON.parse(localStorage.getItem(RECENT_PLAYLISTS_KEY) || '[]');
            // Could display these in a dropdown menu
            console.log('Recent playlists:', recent);
        }

        function showRecentPlaylists() {
            const recent = JSON.parse(localStorage.getItem(RECENT_PLAYLISTS_KEY) || '[]');
            if (recent.length === 0) {
                showToast('No recent playlists', 'info');
                return;
            }
            
            const urlInput = document.getElementById('playlist-url');
            urlInput.value = recent[0];
            showToast('Loaded most recent playlist', 'info');
        }

        function savePlayerState() {
            const state = {
                currentChannelIndex,
                playlistUrl,
                volume: video.volume,
                muted: video.muted,
                playbackRate: video.playbackRate
            };
            localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(state));
        }

        function restorePlayerState() {
            try {
                const saved = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY));
                if (saved) {
                    if (saved.volume !== undefined) video.volume = saved.volume;
                    if (saved.muted !== undefined) video.muted = saved.muted;
                    if (saved.playbackRate !== undefined) video.playbackRate = saved.playbackRate;
                }
            } catch (e) {
                console.error('Failed to restore player state:', e);
            }
        }

        // Save state on page unload
        window.addEventListener('beforeunload', savePlayerState);
        
        // Auto-save state periodically
        setInterval(savePlayerState, 30000);