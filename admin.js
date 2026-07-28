const API_URL = "https://nagoda-review-api.nagodadb.workers.dev/api/reviews"; // Endpoint MUST end with /api/reviews

document.addEventListener('DOMContentLoaded', () => {
    loadData();

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

function loadData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">Loading...</td></tr>';

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const reviews = data.reviews || [];
            let veryHappyCount = 0;
            let happyCount = 0;
            let badCount = 0;

            tableBody.innerHTML = '';

            if (!reviews || reviews.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #64748B;">No responses found yet.</td></tr>';
                updateStats(0, 0, 0, 0);
                updateLastUpdateTime();
                return;
            }

            reviews.forEach(review => {
                const row = document.createElement('tr');

                let badgeClass = '';
                let displayRating = '';
                if (review.rating === 'very-happy') {
                    badgeClass = 'badge-very-happy';
                    displayRating = 'ඉතා හොඳයි 🤩';
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
            updateLastUpdateTime();
        })
        .catch(err => {
            console.error("Error loading data:", err);
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 3rem; color: #EF4444;">Failed to load data. Please check your API connection.</td></tr>';
            updateStats(0, 0, 0, 0);
            updateLastUpdateTime();
        });
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
