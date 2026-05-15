const API_KEY = '325b1e06f0fafb2a71d8ca9bc584a4f8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

async function fetchTMDB(endpoint) {
    const url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=en-US`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error("Failed to fetch:", error);
        return null;
    }
}

async function initWatchPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'movie';

    if (!id) {
        document.getElementById('watch-title').textContent = "Movie not found";
        return;
    }

    // Fetch movie details
    const item = await fetchTMDB(`/${type}/${id}`);
    if (!item) return;
    
    item.media_type = type;

    populateWatchPage(item);
    startWatchTimer();
    addToContinueWatching(item);

    // Fetch Up Next
    const similar = await fetchTMDB(`/${type}/${id}/similar`);
    if (similar && similar.length > 0) {
        populateUpNext(similar.slice(0, 8), type);
    }

    // Fetch Videos (Trailer)
    const videos = await fetchTMDB(`/${type}/${id}/videos`);
    let trailerKey = null;
    if (videos && videos.length > 0) {
        const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos.find(v => v.site === 'YouTube');
        if (trailer) trailerKey = trailer.key;
    }

    // Hook up play button
    const playBtn = document.getElementById('watch-play-btn');
    if (playBtn && trailerKey) {
        playBtn.addEventListener('click', () => {
            playTrailer(trailerKey);
        });
    } else if (playBtn) {
        // Fallback if no trailer
        playBtn.addEventListener('click', () => {
            alert('Sorry, no trailer available for this title.');
        });
    }
}

function playTrailer(trailerKey) {
    const container = document.getElementById('watch-video-container');
    if (!container) return;
    
    // Clear the container's visual elements and inject YouTube iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
    iframe.title = 'Trailer';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    
    // Style to cover the container
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.zIndex = '15'; // Above overlays
    
    container.appendChild(iframe);
}

function populateWatchPage(item) {
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    
    const genres = (item.genres || []).map(g => g.name).slice(0, 3).join(' • ');

    // Backdrop
    const backdropEl = document.getElementById('watch-backdrop');
    if (item.backdrop_path) {
        backdropEl.src = `${IMG_BASE}/w1280${item.backdrop_path}`;
    } else if (item.poster_path) {
        backdropEl.src = `${IMG_BASE}/w780${item.poster_path}`;
    }
    backdropEl.alt = title;

    // Meta
    document.getElementById('watch-genre').textContent = genres || 'Drama';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
    const ratingBadge = rating >= 7 ? 'U/A 13+' : rating >= 5 ? 'U/A 16+' : 'A';
    document.getElementById('watch-rating-badge').textContent = ratingBadge;

    document.getElementById('watch-title').textContent = title;
    document.getElementById('watch-meta').textContent = `${year}${genres ? ' • ' + genres : ''}${rating ? ' • ★ ' + rating : ''}`;
    document.getElementById('watch-overview').textContent = item.overview || 'No description available.';
}

function populateUpNext(movies, mediaType) {
    const list = document.getElementById('watch-upnext-list');
    if (!list) return;
    list.innerHTML = '';

    movies.forEach((movie, i) => {
        const title = movie.title || movie.name || 'Untitled';
        const thumb = movie.backdrop_path
            ? `${IMG_BASE}/w300${movie.backdrop_path}`
            : (movie.poster_path ? `${IMG_BASE}/w185${movie.poster_path}` : '');
        const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
        const runtime = Math.floor(Math.random() * 15 + 18) + 'm';
        const epNum = 'E' + (220 + movies.length - i);

        const item = document.createElement('div');
        item.className = 'upnext-item' + (i === 0 ? ' active' : '');
        item.innerHTML = `
            <div class="upnext-thumb">
                ${thumb ? `<img src="${thumb}" alt="${title}" loading="lazy">` : ''}
            </div>
            <div class="upnext-info">
                <div class="upnext-title">${year ? year.slice(2) + ' May 2026 : ' : ''}${title}</div>
                <div class="upnext-episode-meta">
                    <span class="upnext-ep">${epNum}</span>
                    <span class="upnext-duration">${runtime}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            window.location.href = `watch.html?id=${movie.id}&type=${movie.media_type || mediaType}`;
        });

        list.appendChild(item);
    });
}

function addToContinueWatching(item) {
    let continueWatchingList = JSON.parse(localStorage.getItem('zee5_continue_watching') || '[]');
    continueWatchingList = continueWatchingList.filter(m => m.id !== item.id);
    
    // Save minimal data to avoid quota issues
    const minimalItem = {
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        media_type: item.media_type,
        _progress: Math.floor(Math.random() * 40 + 10),
        _percentage: Math.random() * 80 + 10
    };
    
    continueWatchingList.unshift(minimalItem);
    if (continueWatchingList.length > 10) continueWatchingList.pop();
    
    localStorage.setItem('zee5_continue_watching', JSON.stringify(continueWatchingList));
}

let watchTimerInterval = null;
function startWatchTimer() {
    clearInterval(watchTimerInterval);
    let seconds = 471;
    const timerEl = document.getElementById('watch-timer');

    function updateTimer() {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${m}:${s}`;
        if (seconds <= 0) {
            clearInterval(watchTimerInterval);
            return;
        }
        seconds--;
    }

    updateTimer();
    watchTimerInterval = setInterval(updateTimer, 1000);
}

document.addEventListener('DOMContentLoaded', initWatchPage);
