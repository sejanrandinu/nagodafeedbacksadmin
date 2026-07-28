const API_URL = "https://nagoda-review-api.nagodadb.workers.dev/api/reviews"; // Endpoint MUST end with /api/reviews
const ADMIN_PASSWORD = "Nag01";

let allReviewsData = [];

const sinhalaMonthNames = {
    "01": "ජනවාරි", "02": "පෙබරවාරි", "03": "මාර්තු", "04": "අප්‍රේල්",
    "05": "මැයි", "06": "ජූනි", "07": "ජූලි", "08": "අගෝස්තු",
    "09": "සැප්තැම්බර්", "10": "ඔක්තෝබර්", "11": "නොවැම්බර්", "12": "දෙසැම්බර්"
};

const englishMonthNames = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December"
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('adminPassword');
            const loginError = document.getElementById('loginError');
            const loginCard = document.querySelector('.login-card');

            if (passwordInput.value === ADMIN_PASSWORD) {
                sessionStorage.setItem('adminAuth', 'true');
                loginError.classList.add('hidden');
                passwordInput.value = '';
                unlockDashboard();
            } else {
                loginError.classList.remove('hidden');
                if (loginCard) {
                    loginCard.classList.add('shake');
                    setTimeout(() => loginCard.classList.remove('shake'), 500);
                }
                passwordInput.focus();
                passwordInput.select();
            }
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminAuth');
            lockDashboard();
        });
    }

    // Month Filter Event Listener
    const monthSelect = document.getElementById('monthFilterSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', () => {
            filterAndRenderData();
        });
    }

    document.getElementById('printBtn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadData();
    });

    document.getElementById('pdfBtn').addEventListener('click', () => {
        const element = document.querySelector('.dashboard');
        const actions = document.querySelector('.header-actions');
        if (actions) actions.style.display = 'none';

        element.classList.add('pdf-rendering');

        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `reviews_report_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove('pdf-rendering');
            if (actions) actions.style.display = 'flex';
        }).catch(err => {
            console.error("PDF generation error:", err);
            element.classList.remove('pdf-rendering');
            if (actions) actions.style.display = 'flex';
        });
    });
});

function checkAuth() {
    const isAuth = sessionStorage.getItem('adminAuth') === 'true';
    if (isAuth) {
        unlockDashboard();
    } else {
        lockDashboard();
    }
}

function unlockDashboard() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('dashboardContent');
    if (modal) modal.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    loadData();
}

function lockDashboard() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('dashboardContent');
    if (modal) modal.classList.remove('hidden');
    if (content) content.classList.add('hidden');
}

function updateLastUpdateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    const el = document.getElementById('lastUpdate');
    if (el) {
        el.textContent = `අවසන් යාවත්කාලීන කිරීම: ${year}-${month}-${day} ${timeStr}`;
    }
}

function getMonthKey(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }
    return null;
}

function populateMonthFilter(reviews) {
    const select = document.getElementById('monthFilterSelect');
    if (!select) return;

    const currentSelected = select.value || 'all';
    select.innerHTML = '<option value="all">සියලුම මාස (All Months)</option>';

    const monthMap = new Map();

    reviews.forEach(review => {
        const key = getMonthKey(review.created_at || review.date);
        if (key) {
            monthMap.set(key, (monthMap.get(key) || 0) + 1);
        }
    });

    const sortedKeys = Array.from(monthMap.keys()).sort().reverse();

    sortedKeys.forEach(key => {
        const [year, monthNum] = key.split('-');
        const siName = sinhalaMonthNames[monthNum] || monthNum;
        const enName = englishMonthNames[monthNum] || monthNum;
        const count = monthMap.get(key);

        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${year} ${siName} (${enName}) - [${count}]`;
        select.appendChild(option);
    });

    if (sortedKeys.includes(currentSelected) || currentSelected === 'all') {
        select.value = currentSelected;
    } else {
        select.value = 'all';
    }
}

function loadData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">Loading...</td></tr>';

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            allReviewsData = data.reviews || [];
            populateMonthFilter(allReviewsData);
            filterAndRenderData();
            updateLastUpdateTime();
        })
        .catch(err => {
            console.error("Error loading data:", err);
            allReviewsData = [];
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #EF4444;">Failed to load data. Please check your API connection.</td></tr>';
            updateStats(0, 0, 0, 0);
            updateLastUpdateTime();
        });
}

function filterAndRenderData() {
    const select = document.getElementById('monthFilterSelect');
    const selectedMonth = select ? select.value : 'all';

    if (selectedMonth === 'all') {
        renderReviewsTable(allReviewsData);
    } else {
        const filtered = allReviewsData.filter(r => getMonthKey(r.created_at || r.date) === selectedMonth);
        renderReviewsTable(filtered);
    }
}

function renderReviewsTable(reviews) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    let veryHappyCount = 0;
    let happyCount = 0;
    let badCount = 0;

    if (!reviews || reviews.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">තෝරාගත් මාසය සඳහා ප්‍රතිචාර හමු නොවීය. / No responses found for selected filter.</td></tr>';
        updateStats(0, 0, 0, 0);
        return;
    }

    reviews.forEach(review => {
        const row = document.createElement('tr');

        let badgeClass = '';
        let displayRating = '';
        if (review.rating === 'very-happy') {
            badgeClass = 'badge-very-happy';
            displayRating = 'ඉතා හොඳයි 😀';
            veryHappyCount++;
        } else if (review.rating === 'happy') {
            badgeClass = 'badge-happy';
            displayRating = 'හොඳයි 😊';
            happyCount++;
        } else {
            badgeClass = 'badge-bad';
            displayRating = 'අසතුටුදායකයි 😞';
            badCount++;
        }

        row.innerHTML = `
        <td style="white-space:nowrap; font-size:0.85rem;">${review.created_at || review.date || '-'}</td>
        <td><span class="${badgeClass}">${displayRating}</span></td>
        <td><strong style="color: #0F172A;">${escapeHtml(review.name)}</strong></td>
        <td>${escapeHtml(review.phone)}</td>
        <td>${escapeHtml(review.address)}</td>
        <td>${escapeHtml(review.purpose)}</td>
        <td>${escapeHtml(review.task)}</td>
        <td>${escapeHtml(review.message)}</td>
        <td style="text-transform:uppercase; font-size:0.75rem; color:#64748B; font-weight:700;">${review.lang || '-'}</td>
    `;

        tableBody.appendChild(row);
    });

    updateStats(reviews.length, veryHappyCount, happyCount, badCount);
}

function updateStats(total, veryHappy, happy, bad) {
    document.getElementById('totalReviews').textContent = total;
    document.getElementById('veryHappyStats').textContent = veryHappy;
    document.getElementById('happyStats').textContent = happy;
    document.getElementById('badStats').textContent = bad;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '-';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
