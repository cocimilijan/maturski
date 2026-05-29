document.addEventListener('DOMContentLoaded', () => {

    // --- 1. MOBILNI MENI LOGIKA ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    let isMenuOpen = false;

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            if (isMenuOpen) {
                // Otvara meni
                mobileMenu.classList.remove('translate-x-full');
                mobileMenuBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'; // X ikonica
                document.body.style.overflow = 'hidden'; // Sprečava skrolanje u pozadini
            } else {
                // Zatvara meni
                mobileMenu.classList.add('translate-x-full');
                mobileMenuBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>'; // Hamburger ikonica
                document.body.style.overflow = 'auto';
            }
        });
    }

    // --- 2. SCROLL TO TOP DUGME ---
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    
    window.addEventListener('scroll', () => {
        if (scrollToTopBtn) {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.remove('opacity-0', 'translate-y-10');
                scrollToTopBtn.classList.add('opacity-100', 'translate-y-0');
            } else {
                scrollToTopBtn.classList.remove('opacity-100', 'translate-y-0');
                scrollToTopBtn.classList.add('opacity-0', 'translate-y-10');
            }
        }
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- 3. JIKAN API LOGIKA ZA POČETNU STRANU ---
    if(document.getElementById('hero-img')) {
        fetchTrendingAnime();
    }

    // --- 4. LOGIKA ZA ZABORAVLJENU LOZINKU ---
    const passwordFormContainer = document.getElementById('password-form-container');
    if (passwordFormContainer) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        const loadingMsg = document.getElementById('loading-msg');
        const errorMsg = document.getElementById('error-msg');

        if (accessToken && refreshToken && type === 'recovery') {
            if (loadingMsg) loadingMsg.style.display = 'none';
            document.getElementById('access_token').value = accessToken;
            document.getElementById('refresh_token').value = refreshToken;
            passwordFormContainer.style.display = 'block';
        } else {
            if (loadingMsg) loadingMsg.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'block';
        }
    }

    // --- 5. LOGIKA ZA PROFIL: AVATAR PREVIEW ---
    const avatarSelect = document.getElementById('avatarSelect');
    if (avatarSelect) {
        avatarSelect.addEventListener('change', (e) => {
            const preview = document.getElementById('avatarPreview');
            if (preview) {
                preview.src = "/static/avatars/" + e.target.value;
            }
        });
    }

    // --- 6. LOGIKA ZA PROFIL: JIKAN API, SORT I FILTER ---
    const listDataElement = document.getElementById('user-list-data');
    if (listDataElement) {
        ucitajProfilGrid(listDataElement);
    }
});


// ==============================================
// GLOBALNE FUNKCIJE 
// ==============================================

// Funkcije za API na početnoj strani
async function fetchTrendingAnime() {
    try {
        const response = await fetch('https://api.jikan.moe/v4/seasons/now?limit=7&order_by=members&sort=desc');
        const data = await response.json();
        const animeList = data.data;

        if (animeList && animeList.length > 0) {
            updateHeroSection(animeList[0]);
            populateTrendingGrid(animeList.slice(1, 6)); 
        }
    } catch (error) {
        console.error("Jikan API Greška:", error);
    }
}

function updateHeroSection(anime) {
    const heroImg = document.getElementById('hero-img');
    const heroType = document.getElementById('hero-type');
    const heroRating = document.getElementById('hero-rating');
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');

    if(heroImg) heroImg.src = anime.images.webp.large_image_url;
    if(heroType) heroType.innerText = anime.type || 'TV';
    if(heroRating) heroRating.innerText = `★ ${anime.score || 'N/A'}`;
    
    const title = anime.title_english ? anime.title_english : anime.title;
    if(heroTitle) {
        const titleWords = title.split(' ');
        if(titleWords.length > 1) {
            const firstPart = titleWords.slice(0, Math.ceil(titleWords.length/2)).join(' ');
            const secondPart = titleWords.slice(Math.ceil(titleWords.length/2)).join(' ');
            heroTitle.innerHTML = `${firstPart}<br><span class="text-indigo-500">${secondPart}</span>`;
        } else {
            heroTitle.innerText = title;
        }
    }
    
    if(heroDesc) heroDesc.innerText = anime.synopsis ? anime.synopsis.split('[')[0] : "Opis trenutno nije dostupan.";

    const detailsBtn = document.getElementById('hero-details-btn');
    if(detailsBtn) {
        detailsBtn.onclick = () => window.location.href = `/anime/${anime.mal_id}`;
    }
}

function populateTrendingGrid(animeList) {
    const grid = document.getElementById('trending-grid');
    if(!grid) return;
    
    grid.innerHTML = ''; 
    animeList.forEach(anime => {
        const title = anime.title_english || anime.title;
        const imageUrl = anime.images.webp.image_url;
        const score = anime.score || 'N/A';
        const animeId = anime.mal_id;

        const cardHTML = `
            <a href="/anime/${animeId}" class="group relative rounded-xl overflow-hidden cursor-pointer shadow-lg bg-gray-900 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-indigo-500/20 block border border-white/5">
                <img src="${imageUrl}" alt="${title}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                <div class="absolute bottom-0 w-full p-4">
                    <div class="text-indigo-400 text-xs font-bold mb-1 shadow-black drop-shadow-md">★ ${score}</div>
                    <h3 class="text-white font-bold text-sm line-clamp-2 shadow-black drop-shadow-md">${title}</h3>
                </div>
            </a>
        `;
        grid.innerHTML += cardHTML;
    });
}

// Globalna funkcija za kontrolu Modala na Profilu
window.toggleModal = function(modalID) {
    const modal = document.getElementById(modalID);
    const modalBox = document.getElementById(modalID + 'Box');
    if (!modal || !modalBox) return;
    
    if (modal.classList.contains('opacity-0')) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalBox.classList.remove('scale-95');
        modalBox.classList.add('scale-100');
    } else {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modalBox.classList.remove('scale-100');
        modalBox.classList.add('scale-95');
    }
};

// Funkcija za iscrtavanje Grid-a na Profilu
async function ucitajProfilGrid(listDataElement) {
    const rawData = listDataElement.textContent;
    const userList = JSON.parse(rawData);
    const grid = document.getElementById('profile-grid');
    
    let allAnimeData = []; 
    let currentFilter = 'all';
    let currentSort = 'newest';

    if(userList.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 col-span-full text-lg">Vaša lista je trenutno prazna. Pronađite anime u pretrazi i dodajte ga!</p>';
        const filterBtns = document.getElementById('filter-buttons');
        const sortSel = document.getElementById('sort-select');
        if (filterBtns) filterBtns.style.display = 'none';
        if (sortSel) sortSel.style.display = 'none';
        return;
    }

    grid.innerHTML = '<p class="text-indigo-400 col-span-full animate-pulse">Preuzimanje podataka sa servera...</p>';

    for(let i = 0; i < userList.length; i++) {
        const item = userList[i];
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${item.anime_id}`);
            const data = await res.json();
            const anime = data.data;

            const title = anime.title_english || anime.title;
            const imageUrl = anime.images.webp.image_url;

            let statusColor = item.status === 'Završeno' ? 'bg-green-600' : 
                              item.status === 'Gledam' ? 'bg-blue-600' : 
                              item.status === 'Odustao' ? 'bg-red-600' : 'bg-gray-600';

            let ocenaPrikaz = item.ocena > 0 ? `★ ${item.ocena}/10` : 'Bez ocene';
            let ocenaPrikazBoja = item.ocena > 0 ? 'text-indigo-400 bg-indigo-900/30' : 'text-gray-400 bg-gray-800/50';
            const timeAdded = item.created_at ? new Date(item.created_at).getTime() : i;

            const cardHTML = `
                <div class="anime-card group relative rounded-xl overflow-hidden shadow-lg bg-gray-900 border border-white/5">
                    <a href="/anime/${item.anime_id}" class="block overflow-hidden">
                        <img src="${imageUrl}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110">
                    </a>
                    <div class="p-4">
                        <h3 class="text-white font-bold text-sm line-clamp-1 mb-3">${title}</h3>
                        <div class="flex justify-between items-center text-[10px] font-black tracking-wider uppercase">
                            <span class="${statusColor} px-2 py-1 rounded text-white shadow-md">${item.status}</span>
                            <span class="${ocenaPrikazBoja} px-2 py-1 rounded">${ocenaPrikaz}</span>
                        </div>
                    </div>
                    <form action="/obrisi_anime/${item.anime_id}" method="POST" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="submit" class="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center shadow-lg transition-transform hover:scale-110" title="Obriši iz liste">✕</button>
                    </form>
                </div>
            `;

            allAnimeData.push({
                status: item.status,
                ocena: item.ocena,
                title: title,
                timeAdded: timeAdded,
                html: cardHTML
            });
        } catch (error) {
            console.error("Greška API:", error);
        }
        await new Promise(r => setTimeout(r, 330)); 
    }

    function renderGrid() {
        let filtered = allAnimeData.filter(item => currentFilter === 'all' || item.status === currentFilter);

        filtered.sort((a, b) => {
            if (currentSort === 'newest') return b.timeAdded - a.timeAdded;
            if (currentSort === 'oldest') return a.timeAdded - b.timeAdded;
            if (currentSort === 'rating_desc') return b.ocena - a.ocena;
            if (currentSort === 'rating_asc') return a.ocena - b.ocena;
            if (currentSort === 'title_asc') return a.title.localeCompare(b.title);
            if (currentSort === 'title_desc') return b.title.localeCompare(a.title);
            return 0;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<p class="text-gray-500 col-span-full">Nema rezultata za ovu pretragu.</p>';
        } else {
            grid.innerHTML = filtered.map(item => item.html).join('');
        }
    }

    renderGrid();

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => { b.classList.remove('bg-indigo-600', 'text-white'); b.classList.add('bg-gray-900', 'text-gray-400'); });
            e.target.classList.remove('bg-gray-900', 'text-gray-400');
            e.target.classList.add('bg-indigo-600', 'text-white');

            currentFilter = e.target.getAttribute('data-filter');
            renderGrid();
        });
    });

    const sortSelect = document.getElementById('sort-select');
    if(sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderGrid();
        });
    }
}
