// ======================================
// BET Dashboard
// ======================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyO89H4tRqU7PmRqUr9nsgQIKWpG4joY6JR-hDvfMf080IuG1pV7sr43yXOIjYq103L/exec";

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const dashboardContent = document.getElementById("dashboardContent");
const lastUpdated = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");

let trendChartInstance = null;
let centerChartInstance = null;

refreshBtn.addEventListener("click", loadDashboard);
loadDashboard();

function loadDashboard() {
    loadingState.style.display = "block";
    errorState.style.display = "none";
    dashboardContent.style.display = "none";

    fetch(`${SCRIPT_URL}?action=analytics`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed to load analytics.");
            if (!Array.isArray(data.monthly) || !data.totals) {
                throw new Error("The API returned an unexpected shape — your Apps Script deployment is likely still running the old code. Redeploy Code.gs as a New Version.");
            }
            render(data);
            loadingState.style.display = "none";
            dashboardContent.style.display = "block";
            lastUpdated.textContent = "Updated " + new Date().toLocaleString();
        })
        .catch(err => {
            loadingState.style.display = "none";
            errorState.style.display = "block";
            errorState.textContent = "❌ " + err.message;
        });
}

function render(data) {
    renderKPIs(data);
    renderTrendChart(data.monthly);
    renderLeaderboard(data.leaders);
    renderCenterChart(data.centers);
    renderCoachTable(data.coaches, data.months);
}

// ======================================
// KPI CARDS
// ======================================

function renderKPIs(data) {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // yyyy-MM
    const thisMonth = data.monthly.find(m => m.month === currentMonthKey) ||
        { registrations: 0, renewals: 0, removals: 0, certificates: 0 };

    const cards = [
        { label: "Active Learners", value: data.totals.activeLearners, sub: "Currently in the system", cls: "blue" },
        { label: "Removed Learners", value: data.totals.removedLearners, sub: "Archived to date", cls: "red" },
        { label: "Total Learners Ever", value: data.totals.totalEverLearners, sub: "Active + removed", cls: "purple" },
        { label: "Registrations This Month", value: thisMonth.registrations, sub: "New learners", cls: "blue" },
        { label: "Renewals This Month", value: thisMonth.renewals, sub: "Contracts renewed", cls: "green" },
        { label: "Removals This Month", value: thisMonth.removals, sub: "Learners removed", cls: "red" },
        { label: "Certificates This Month", value: thisMonth.certificates, sub: "Issued", cls: "orange" }
    ];

    document.getElementById("kpiGrid").innerHTML = cards.map(c => `
        <div class="kpi-card ${c.cls}">
            <div class="kpi-label">${c.label}</div>
            <div class="kpi-value">${c.value}</div>
            <div class="kpi-sub">${c.sub}</div>
        </div>
    `).join("");
}

// ======================================
// MONTHLY TREND CHART
// ======================================

function renderTrendChart(monthly) {
    const ctx = document.getElementById("trendChart").getContext("2d");
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthly.map(m => m.label),
            datasets: [
                { label: "Registrations", data: monthly.map(m => m.registrations), borderColor: "#2563eb", backgroundColor: "#2563eb", tension: .3 },
                { label: "Renewals", data: monthly.map(m => m.renewals), borderColor: "#16a34a", backgroundColor: "#16a34a", tension: .3 },
                { label: "Removals", data: monthly.map(m => m.removals), borderColor: "#dc2626", backgroundColor: "#dc2626", tension: .3 },
                { label: "Certificates", data: monthly.map(m => m.certificates), borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: .3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

// ======================================
// CENTER LEADERBOARD
// ======================================

function renderLeaderboard(leaders) {
    const labels = {
        registrations: "Top Center — Registrations",
        renewals: "Top Center — Renewals",
        removals: "Top Center — Removals",
        certificates: "Top Center — Certificates"
    };

    document.getElementById("leaderGrid").innerHTML = Object.keys(labels).map(key => {
        const l = leaders[key];
        return `
        <div class="leader-item">
            <div class="leader-metric">${labels[key]}</div>
            <div class="leader-center">${l ? l.center : "—"}</div>
            <div class="leader-count">${l ? l.count + " total" : "No data yet"}</div>
        </div>`;
    }).join("");
}

// ======================================
// CENTER COMPARISON CHART
// ======================================

function renderCenterChart(centers) {
    const ctx = document.getElementById("centerChart").getContext("2d");
    if (centerChartInstance) centerChartInstance.destroy();

    const centerNames = Object.keys(centers);

    centerChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: centerNames,
            datasets: [
                { label: "Registrations", data: centerNames.map(c => centers[c].registrations), backgroundColor: "#2563eb" },
                { label: "Renewals", data: centerNames.map(c => centers[c].renewals), backgroundColor: "#16a34a" },
                { label: "Removals", data: centerNames.map(c => centers[c].removals), backgroundColor: "#dc2626" },
                { label: "Certificates", data: centerNames.map(c => centers[c].certificates), backgroundColor: "#f59e0b" }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

// ======================================
// COACH TABLE (pivot: coach x month + total)
// ======================================

function renderCoachTable(coaches, months) {
    const head = document.getElementById("coachTableHead");
    const body = document.getElementById("coachTableBody");

    const monthLabels = months.map(mk => {
        const [y, m] = mk.split("-");
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    });

    head.innerHTML = `<th>Coach</th>` +
        monthLabels.map(l => `<th>${l}</th>`).join("") +
        `<th>Total</th>`;

    body.innerHTML = coaches.map(c => {
        const monthCells = months.map(mk => `<td>${c.monthly[mk] || 0}</td>`).join("");
        return `<tr><td>${c.coach}</td>${monthCells}<td>${c.total}</td></tr>`;
    }).join("");

    if (coaches.length === 0) {
        body.innerHTML = `<tr><td colspan="${months.length + 2}">No coach data yet.</td></tr>`;
    }
}
