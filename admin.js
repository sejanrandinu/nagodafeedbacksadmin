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
        // Temporarily hide actions for PDF
        const actions = document.querySelector('.header-actions');
        if (actions) actions.style.display = 'none';

        const opt = {
            margin: 0.2,
            filename: 'reviews_report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore actions
            if (actions) actions.style.display = 'flex';
        });
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm("ඔබට සියලුම දත්ත මැකීමට අවශ්‍ය බව විශ්වාසද? / Are you sure you want to delete all reviews?")) {
            fetch(`${API_URL}?clear=true`, { method: "DELETE" })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        loadData();
                    } else {
                        alert("Failed to clear data.");
                    }
                })
                .catch(err => {
                    console.error("Error clearing data:", err);
                    alert("Network error.");
                });
        }
    });
});

function loadData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem; color: #64748B;">Loading...</td></tr>';

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const reviews = data.reviews || [];
            let veryHappyCount = 0;
            let happyCount = 0;
            let badCount = 0;

            tableBody.innerHTML = '';

            if (!reviews || reviews.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem; color: #64748B;">No responses found yet.</td></tr>';
                updateStats(0, 0, 0, 0);
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
                <td style="white-space:nowrap; font-size:0.875rem;">${review.created_at || review.date || '-'}</td>
                <td><span class="${badgeClass}">${displayRating}</span></td>
                <td><strong style="color: #0F172A;">${escapeHtml(review.name)}</strong></td>
                <td>${escapeHtml(review.phone)}</td>
                <td>${escapeHtml(review.address)}</td>
                <td>${escapeHtml(review.purpose)}</td>
                <td>${escapeHtml(review.task)}</td>
                <td>${escapeHtml(review.message)}</td>
                <td style="text-transform:uppercase; font-size:0.75rem; color:#64748B; font-weight:700;">${review.lang}</td>
                <td class="no-print"><button class="row-delete-btn" onclick="deleteRow('${review.id}')">Delete</button></td>
            `;

                tableBody.appendChild(row);
            });

            updateStats(reviews.length, veryHappyCount, happyCount, badCount);
        })
        .catch(err => {
            console.error("Error loading data:", err);
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem; color: #EF4444;">Failed to load data. Please check your API connection.</td></tr>';
            updateStats(0, 0, 0, 0);
        });
}

// Global function to delete a single row
window.deleteRow = function (id) {
    if (confirm("ඔබට මෙම ප්‍රතිචාරය මැකීමට අවශ්‍ය බව විශ්වාසද? / Are you sure you want to delete this review?")) {
        fetch(`${API_URL}?id=${id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadData();
                } else {
                    alert("Failed to delete review.");
                }
            })
            .catch(err => {
                console.error("Error deleting review:", err);
                alert("Network error.");
            });
    }
};

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
