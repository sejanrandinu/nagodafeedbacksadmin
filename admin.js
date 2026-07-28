const API_URL = "https://nagoda-review-api.nagodadb.workers.dev/api/reviews";
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

document.addEventListener('DOMContentLoaded', function () {

    // ---- Check Auth ----
    checkAuth();

    // ---- Login Form ----
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var pw = document.getElementById('adminPassword').value;
            var errEl = document.getElementById('loginError');
            var card = document.getElementById('loginCard');

            if (pw === ADMIN_PASSWORD) {
                sessionStorage.setItem('adminAuth', 'true');
                errEl.classList.add('hidden');
                document.getElementById('adminPassword').value = '';
                unlockDashboard();
            } else {
                errEl.classList.remove('hidden');
                if (card) {
                    card.classList.remove('shake');
                    void card.offsetWidth; // reflow to restart animation
                    card.classList.add('shake');
                    setTimeout(function () { card.classList.remove('shake'); }, 500);
                }
                document.getElementById('adminPassword').focus();
                document.getElementById('adminPassword').select();
            }
        });
    }

    // ---- Logout ----
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            sessionStorage.removeItem('adminAuth');
            lockDashboard();
        });
    }

    // ---- Month Filter ----
    var monthSelect = document.getElementById('monthFilterSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', function () {
            filterAndRenderData();
        });
    }

    // ---- Print ----
    var printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            window.print();
        });
    }

    // ---- Refresh ----
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadData();
        });
    }

    // ---- PDF ----
    var pdfBtn = document.getElementById('pdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function () {
            var element = document.querySelector('.dashboard');
            var actions = document.querySelector('.header-actions');
            if (actions) actions.style.display = 'none';

            element.classList.add('pdf-rendering');

            var opt = {
                margin: [0.3, 0.3, 0.3, 0.3],
                filename: 'reviews_report_' + new Date().toISOString().slice(0, 10) + '.pdf',
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

            html2pdf().set(opt).from(element).save().then(function () {
                element.classList.remove('pdf-rendering');
                if (actions) actions.style.display = 'flex';
            }).catch(function (err) {
                console.error("PDF error:", err);
                element.classList.remove('pdf-rendering');
                if (actions) actions.style.display = 'flex';
            });
        });
    }
});

function checkAuth() {
    var isAuth = sessionStorage.getItem('adminAuth') === 'true';
    if (isAuth) {
        unlockDashboard();
    } else {
        lockDashboard();
    }
}

function unlockDashboard() {
    var modal = document.getElementById('loginModal');
    var content = document.getElementById('dashboardContent');
    if (modal) modal.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    loadData();
}

function lockDashboard() {
    var modal = document.getElementById('loginModal');
    var content = document.getElementById('dashboardContent');
    if (modal) modal.classList.remove('hidden');
    if (content) content.classList.add('hidden');
}

function updateLastUpdateTime() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    var el = document.getElementById('lastUpdate');
    if (el) {
        el.textContent = 'අවසන් යාවත්කාලීන කිරීම: ' + year + '-' + month + '-' + day + ' ' + timeStr;
    }
}

function getMonthKey(dateStr) {
    if (!dateStr) return null;
    var match = dateStr.match(/^(\d{4})-(\d{2})/);
    if (match) return match[1] + '-' + match[2];
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    return null;
}

function populateMonthFilter(reviews) {
    var select = document.getElementById('monthFilterSelect');
    if (!select) return;

    var currentSelected = select.value || 'all';
    select.innerHTML = '<option value="all">සියලුම මාස (All Months)</option>';

    var monthMap = {};
    reviews.forEach(function (review) {
        var key = getMonthKey(review.created_at || review.date);
        if (key) {
            monthMap[key] = (monthMap[key] || 0) + 1;
        }
    });

    var sortedKeys = Object.keys(monthMap).sort().reverse();

    sortedKeys.forEach(function (key) {
        var parts = key.split('-');
        var year = parts[0];
        var monthNum = parts[1];
        var siName = sinhalaMonthNames[monthNum] || monthNum;
        var enName = englishMonthNames[monthNum] || monthNum;
        var count = monthMap[key];

        var option = document.createElement('option');
        option.value = key;
        option.textContent = year + ' ' + siName + ' (' + enName + ') - [' + count + ']';
        select.appendChild(option);
    });

    if (sortedKeys.indexOf(currentSelected) !== -1 || currentSelected === 'all') {
        select.value = currentSelected;
    } else {
        select.value = 'all';
    }
}

function loadData() {
    var tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">Loading... ⏳</td></tr>';

    fetch(API_URL)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            allReviewsData = data.reviews || [];
            populateMonthFilter(allReviewsData);
            filterAndRenderData();
            updateLastUpdateTime();
        })
        .catch(function (err) {
            console.error("Error loading data:", err);
            allReviewsData = [];
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #EF4444;">❌ Failed to load data. Please check your API connection.</td></tr>';
            updateStats(0, 0, 0, 0);
            updateLastUpdateTime();
        });
}

function filterAndRenderData() {
    var select = document.getElementById('monthFilterSelect');
    var selectedMonth = select ? select.value : 'all';

    if (selectedMonth === 'all') {
        renderReviewsTable(allReviewsData);
    } else {
        var filtered = allReviewsData.filter(function (r) {
            return getMonthKey(r.created_at || r.date) === selectedMonth;
        });
        renderReviewsTable(filtered);
    }
}

function renderReviewsTable(reviews) {
    var tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    var veryHappyCount = 0;
    var happyCount = 0;
    var badCount = 0;

    if (!reviews || reviews.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">තෝරාගත් මාසය සඳහා ප්‍රතිචාර හමු නොවීය. / No responses found.</td></tr>';
        updateStats(0, 0, 0, 0);
        return;
    }

    reviews.forEach(function (review) {
        var row = document.createElement('tr');

        var badgeClass = '';
        var displayRating = '';

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

        row.innerHTML =
            '<td style="white-space:nowrap; font-size:0.82rem;">' + (review.created_at || review.date || '-') + '</td>' +
            '<td><span class="' + badgeClass + '">' + displayRating + '</span></td>' +
            '<td><strong style="color:#0F172A;">' + escapeHtml(review.name) + '</strong></td>' +
            '<td>' + escapeHtml(review.phone) + '</td>' +
            '<td>' + escapeHtml(review.address) + '</td>' +
            '<td>' + escapeHtml(review.purpose) + '</td>' +
            '<td>' + escapeHtml(review.task) + '</td>' +
            '<td>' + escapeHtml(review.message) + '</td>' +
            '<td style="text-transform:uppercase; font-size:0.75rem; color:#64748B; font-weight:700;">' + (review.lang || '-') + '</td>';

        tableBody.appendChild(row);
    });

    updateStats(reviews.length, veryHappyCount, happyCount, badCount);
}

function updateStats(total, veryHappy, happy, bad) {
    var t = document.getElementById('totalReviews');
    var vh = document.getElementById('veryHappyStats');
    var h = document.getElementById('happyStats');
    var b = document.getElementById('badStats');
    if (t) t.textContent = total;
    if (vh) vh.textContent = veryHappy;
    if (h) h.textContent = happy;
    if (b) b.textContent = bad;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '-';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
