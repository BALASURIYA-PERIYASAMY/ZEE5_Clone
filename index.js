const TMDB_API_KEY = '325b1e06f0fafb2a71d8ca9bc584a4f8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const BACKDROP_SIZE = '/w1280';
const POSTER_SIZE = '/w342';

let genreMap = {};

async function fetchGenres() {
    try {
        const [movieRes, tvRes] = await Promise.all([
            fetch(`${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`),
            fetch(`${TMDB_BASE}/genre/tv/list?api_key=${TMDB_API_KEY}&language=en-US`)
        ]);
        const movieData = await movieRes.json();
        const tvData = await tvRes.json();
        (movieData.genres || []).forEach(g => genreMap[g.id] = g.name);
        (tvData.genres || []).forEach(g => genreMap[g.id] = g.name);
    } catch (err) {
        console.error('Genre fetch error:', err);
    }
}

async function fetchTMDB(endpoint) {
    try {
        const url = endpoint.includes('?')
            ? `${TMDB_BASE}${endpoint}&api_key=${TMDB_API_KEY}&language=en-US`
            : `${TMDB_BASE}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error('TMDB fetch error:', err);
        return [];
    }
}
function createMovieCard(item, index, showRank = false) {
    const title = item.title || item.name || 'Untitled';
    const poster = item.poster_path
        ? `${IMG_BASE}${POSTER_SIZE}${item.poster_path}`
        : 'https://via.placeholder.com/342x513/1a1a2e/666?text=No+Image';
    const isNew = item.vote_count && item.vote_count > 500;

    const genres = (item.genre_ids || [])

        .slice(0, 3)
        .map(id => genreMap[id])
        .filter(Boolean)
        .join(' • ');

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.id = `card-${item.id}`;

    card.innerHTML = `
        ${showRank ? `<div class="rank-badge">${index + 1}</div>` : ''}
        <div class="card-poster">
            <img src="${poster}" alt="${title}" loading="lazy">
            ${isNew ? `<span class="card-badge">NEW</span>` : ''}
        </div>
        <div class="card-hover-info">
            <div class="card-hover-title">${title}</div>
            ${genres ? `<div class="card-hover-meta">${genres}</div>` : ''}
            <div class="card-hover-actions">
                <button class="btn card-btn-watch"><i class="bi bi-play-fill"></i> Watch</button>
                <button class="btn card-btn-share"><i class="bi bi-share"></i> Share</button>
            </div>
        </div>
    `;

    const watchBtn = card.querySelector('.card-btn-watch');
    if (watchBtn) {
        watchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openWatchModal(item);
        });
    }

    return card;
}


// ====================================================
//        CENTER-PEEK CAROUSEL (Zee5 Style)
// ====================================================
let carouselSlides = [];
let currentSlide = 0;
let carouselAutoplay = null;

function buildCarousel(movies) {
    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!track) return;

    carouselSlides = movies.slice(0, 8).filter(m => m.backdrop_path);
    if (carouselSlides.length === 0) return;

    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    carouselSlides.forEach((movie, i) => {
        const backdrop = `${IMG_BASE}${BACKDROP_SIZE}${movie.backdrop_path}`;
        const title = movie.title || movie.name || 'Untitled';

        const slide = document.createElement('div');
        slide.className = 'zee5-slide';
        slide.setAttribute('data-index', i);

        slide.innerHTML = `
            <div class="zee5-slide-img-wrap">
                <img src="${backdrop}" alt="${title}" loading="lazy">
                <div class="zee5-slide-gradient"></div>
                <div class="zee5-slide-overlay">
                    <h4 class="zee5-slide-title">${title}</h4>
                    <div class="zee5-slide-actions">
                        <button class="btn zee5-btn-watch-slide"><i class="bi bi-play-fill"></i> Watch</button>
                        <button class="btn zee5-btn-buyplan-slide"><i class="bi bi-gem"></i> BUY PLAN</button>
                    </div>
                </div>
            </div>
        `;

        const watchBtn = slide.querySelector('.zee5-btn-watch-slide');
        if (watchBtn) {
            watchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openWatchModal(movie);
            });
        }
        
        const buyBtn = slide.querySelector('.zee5-btn-buyplan-slide');
        if (buyBtn) {
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = 'buyplan.html';
            });
        }

        track.appendChild(slide);

        // Create dot indicator
        if (dotsContainer) {
            const dot = document.createElement('button');
            dot.className = 'zee5-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Slide ' + (i + 1));
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetAutoplay();
            });
            dotsContainer.appendChild(dot);
        }
    });

    // Set initial state
    currentSlide = 0;
    updateCarousel();
    startAutoplay();

    // Arrow events
    document.getElementById('carousel-prev').addEventListener('click', () => {
        goToSlide(currentSlide - 1);
        resetAutoplay();
    });
    document.getElementById('carousel-next').addEventListener('click', () => {
        goToSlide(currentSlide + 1);
        resetAutoplay();
    });
}

function goToSlide(index) {
    if (carouselSlides.length === 0) return;
    // Wrap around
    if (index < 0) index = carouselSlides.length - 1;
    if (index >= carouselSlides.length) index = 0;
    currentSlide = index;
    updateCarousel();
}

function updateCarousel() {
    const slides = document.querySelectorAll('.zee5-slide');
    const dots = document.querySelectorAll('.zee5-dot');
    const total = slides.length;
    if (total === 0) return;

    slides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev', 'next', 'far-prev', 'far-next', 'hidden-slide');

        const diff = i - currentSlide;

        if (diff === 0) {
            slide.classList.add('active');
        } else if (diff === -1 || (currentSlide === 0 && i === total - 1)) {
            slide.classList.add('prev');
        } else if (diff === 1 || (currentSlide === total - 1 && i === 0)) {
            slide.classList.add('next');
        } else {
            slide.classList.add('hidden-slide');
        }
    });

    // Update dot indicators
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function startAutoplay() {
    carouselAutoplay = setInterval(() => {
        goToSlide(currentSlide + 1);
    }, 5000);
}

function resetAutoplay() {
    clearInterval(carouselAutoplay);
    startAutoplay();
}


// ===== Section Population =====
function populateRow(containerId, movies, showRank = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    movies.forEach((movie, i) => {
        container.appendChild(createMovieCard(movie, i, showRank));
    });
}

// ===== Skeleton Loader =====
function showSkeletons(containerId, count = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skel = document.createElement('div');
        skel.className = 'movie-card skeleton-card';
        skel.innerHTML = '<div class="skeleton-shimmer"></div>';
        container.appendChild(skel);
    }
}

// ===== Initialize App =====
async function initApp() {
    // Show loading skeletons
    const sections = ['spotlight-row', 'curated-row', 'entertainment-row', 'top10-row', 'webseries-row', 'upcoming-row', 'toprated-row'];
    sections.forEach(id => showSkeletons(id));

    // Fetch genre names first
    await fetchGenres();

    // Fetch all data in parallel
    const [trending, popular, nowPlaying, topRated, upcoming, tvPopular, tvTopRated] = await Promise.all([
        fetchTMDB('/trending/movie/week'),
        fetchTMDB('/movie/popular'),
        fetchTMDB('/movie/now_playing'),
        fetchTMDB('/movie/top_rated'),
        fetchTMDB('/movie/upcoming'),
        fetchTMDB('/tv/popular'),
        fetchTMDB('/tv/top_rated'),
    ]);

    // Build carousel from trending movies
    buildCarousel(trending);

    // Populate sections
    populateRow('spotlight-row', trending.slice(0, 15));
    populateRow('curated-row', popular.slice(0, 15));
    populateRow('entertainment-row', nowPlaying.slice(0, 15));
    populateRow('top10-row', topRated.slice(0, 10), true);
    populateRow('webseries-row', tvPopular.slice(0, 15));
    populateRow('upcoming-row', upcoming.slice(0, 15));
    populateRow('toprated-row', tvTopRated.slice(0, 15));
}



// ===== Nav Link Active State =====
document.querySelectorAll('.zee5-nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.zee5-nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});


// ====================================================
//   NAVBAR INTERACTIVE PANELS (5 features)
// ====================================================

function closeAllDropdowns() {
    document.getElementById('zee5-more-dropdown')?.classList.remove('active');
    document.getElementById('zee5-lang-dropdown')?.classList.remove('active');
}

// 1) 9-Dots More Dropdown
document.getElementById('nav-more')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dd = document.getElementById('zee5-more-dropdown');
    const wasActive = dd.classList.contains('active');
    closeAllDropdowns();
    if (!wasActive) {
        // Position dropdown below the 9-dots icon
        const icon = document.getElementById('nav-more');
        const rect = icon.getBoundingClientRect();
        dd.style.left = rect.left + 'px';
        dd.style.top = rect.bottom + 'px';
        dd.classList.add('active');
    }
});

// 2) Language Dropdown
document.getElementById('zee5-language')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dd = document.getElementById('zee5-lang-dropdown');
    const wasActive = dd.classList.contains('active');
    closeAllDropdowns();
    if (!wasActive) {
        const icon = document.getElementById('zee5-language');
        const rect = icon.getBoundingClientRect();
        dd.style.right = (window.innerWidth - rect.right) + 'px';
        dd.style.top = rect.bottom + 'px';
        dd.classList.add('active');
    }
});

// Language tab switching
document.querySelectorAll('.lang-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// Language Apply
document.getElementById('lang-apply-btn')?.addEventListener('click', () => {
    closeAllDropdowns();
});


// 5) Hamburger Sidebar
document.getElementById('zee5-hamburger')?.addEventListener('click', () => {
    document.getElementById('zee5-sidebar')?.classList.add('active');
    document.getElementById('zee5-sidebar-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
});

function closeSidebar() {
    document.getElementById('zee5-sidebar')?.classList.remove('active');
    document.getElementById('zee5-sidebar-overlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('zee5-sidebar-overlay')?.addEventListener('click', closeSidebar);

// Accordion toggle
document.querySelectorAll('.sidebar-accordion-header').forEach(header => {
    header.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const body = document.getElementById(targetId);
        const icon = this.querySelector('i');
        if (body) {
            body.classList.toggle('open');
            if (icon) {
                icon.className = body.classList.contains('open') ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            }
        }
    });
});

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.zee5-more-dropdown') && !e.target.closest('#nav-more')) {
        document.getElementById('zee5-more-dropdown')?.classList.remove('active');
    }
    if (!e.target.closest('.zee5-lang-dropdown') && !e.target.closest('#zee5-language')) {
        document.getElementById('zee5-lang-dropdown')?.classList.remove('active');
    }
});

// ====================================================
//          WATCH MODAL LOGIC
// ====================================================
let watchTimerInterval = null;
let continueWatchingList = JSON.parse(localStorage.getItem('zee5_continue_watching') || '[]');

function openWatchModal(item) {
    const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    window.location.href = `watch.html?id=${item.id}&type=${mediaType}`;
}

function addToContinueWatching(item) {
    // Remove if already exists to put it at front
    continueWatchingList = continueWatchingList.filter(m => m.id !== item.id);
    // Give it a random duration/progress for UI purposes
    item._progress = Math.floor(Math.random() * 40 + 10); // 10 to 50 mins left
    item._duration = item._progress + Math.floor(Math.random() * 60 + 20); // Total duration
    item._percentage = ((item._duration - item._progress) / item._duration) * 100;
    continueWatchingList.unshift(item);
    if (continueWatchingList.length > 10) continueWatchingList.pop(); // keep last 10
    
    localStorage.setItem('zee5_continue_watching', JSON.stringify(continueWatchingList));
    renderContinueWatching();
}

function renderContinueWatching() {
    const section = document.getElementById('section-continue-watching');
    const row = document.getElementById('continue-watching-row');
    if (!section || !row) return;

    if (continueWatchingList.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    row.innerHTML = '';

    continueWatchingList.forEach(item => {
        const title = item.title || item.name || 'Untitled';
        const poster = item.poster_path ? `${IMG_BASE}${POSTER_SIZE}${item.poster_path}` : 'https://via.placeholder.com/342x513?text=No+Image';
        
        const card = document.createElement('div');
        card.className = 'movie-card cw-card';
        card.innerHTML = `
            <div class="card-poster">
                <img src="${poster}" alt="${title}" loading="lazy">
                <span class="cw-badge">NEW EPISODE</span>
            </div>
            <div class="cw-info">
                <div class="cw-title">${title}</div>
                <div class="cw-time-left">${item._progress}m Left</div>
                <div class="cw-progress-bg">
                    <div class="cw-progress-fill" style="width: ${item._percentage}%"></div>
                </div>
            </div>
            <div class="card-hover-info">
                <div class="card-hover-actions">
                    <button class="btn card-btn-watch"><i class="bi bi-play-fill"></i> Continue</button>
                </div>
            </div>
        `;
        
        card.querySelector('.card-btn-watch').addEventListener('click', (e) => {
            e.stopPropagation();
            openWatchModal(item);
        });

        row.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Render Continue Watching initially
    renderContinueWatching();
});

// ===== Search Functionality =====
let searchTimeout;
const searchInput = document.getElementById('zee5-search-input');
const searchResultsSection = document.getElementById('section-search-results');
const searchResultsRow = document.getElementById('search-results-row');
const queryDisplay = document.getElementById('search-query-display');
const clearSearchBtn = document.getElementById('clear-search-btn');

const originalSections = [
    'hero-carousel', 'section-spotlight',
    'section-curated', 'section-entertainment', 'section-top10',
    'section-webseries', 'section-upcoming', 'section-toprated'
];

function toggleMainSections(show) {
    originalSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    });
    
    // Handle Continue Watching separately
    const cwSection = document.getElementById('section-continue-watching');
    if (show) {
        renderContinueWatching(); // Restores it if there's history
    } else if (cwSection) {
        cwSection.style.display = 'none';
    }
}

searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length === 0) {
        clearSearch();
        return;
    }

    searchTimeout = setTimeout(() => performSearch(query), 500);
});

async function performSearch(query) {
    queryDisplay.textContent = query;
    toggleMainSections(false);
    searchResultsSection.style.display = 'block';
    showSkeletons('search-results-row', 10);

    const url = `/search/multi&query=${encodeURIComponent(query)}`;
    // The fetchTMDB function appends ?api_key..., but if we already have a parameter, 
    // we need to make sure we don't end up with /search/multi?query=...&?api_key=...
    // wait, fetchTMDB does: `${BASE_URL}${endpoint}?api_key=${API_KEY}`
    // If we pass `/search/multi&query=...`, the fetchTMDB url becomes `.../search/multi&query=...?api_key=...` which is invalid.
    
    // A better approach is to handle the query parametr in fetchTMDB or construct a special call:
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=325b1e06f0fafb2a71d8ca9bc584a4f8&language=en-US&query=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(searchUrl);
        const data = await response.json();
        const results = data.results || [];
        
        if (results.length === 0) {
            searchResultsRow.innerHTML = '<p style="color: #ccc; padding: 20px; width: 100%; text-align: center;">No movies or shows found for this search.</p>';
            return;
        }

        const filtered = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        populateRow('search-results-row', filtered);
    } catch (err) {
        console.error("Search error:", err);
        searchResultsRow.innerHTML = '<p style="color: #e50914; padding: 20px;">An error occurred while searching.</p>';
    }
}

function clearSearch() {
    if (searchInput) searchInput.value = '';
    if (searchResultsSection) searchResultsSection.style.display = 'none';
    toggleMainSections(true);
}

clearSearchBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    clearSearch();
});

// ===== Run =====
document.addEventListener('DOMContentLoaded', initApp);
