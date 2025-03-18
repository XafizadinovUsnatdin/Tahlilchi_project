document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadMonths();
    updateDashboard();
});

const showLoadingSpinner = () => document.getElementById("loadingSpinner").style.display = "flex";
const hideLoadingSpinner = () => document.getElementById("loadingSpinner").style.display = "none";

let salesChart;

function loadProducts() {
    fetch('/products')
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            const select = document.getElementById("productSelect");
            Object.keys(data).forEach(pid => select.add(new Option(`${pid} - ${data[pid].name}`, pid)));
            if (select.options.length > 1) select.value = select.options[1].value;
            updateDashboard();
        })
        .catch(err => alert(`Mahsulotlarni yuklashda xatolik: ${err.message}`));
}

function loadMonths() {
    const select = document.getElementById("monthSelect");
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        select.add(new Option(`${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`,
                              `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`));
    }
    select.value = today.toISOString().slice(0, 7).replace('-', '-');
}

function updateDashboard() {
    const pid = document.getElementById("productSelect").value;
    const month = document.getElementById("monthSelect").value;
    if (!pid || !month) return;

    showLoadingSpinner();
    fetch(`/dashboard_data/${pid}?month=${month}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            renderChart(data);
            updateStats(data);
            hideLoadingSpinner();
        })
        .catch(err => {
            console.error("Dashboard xatosi:", err);
            alert(`Xatolik: ${err.message}`);
            if (salesChart) salesChart.destroy();
            document.getElementById("errorPercent").textContent = "";
            document.getElementById("totalActual").textContent = "";
            document.getElementById("totalForecast").textContent = "";
            hideLoadingSpinner();
        });
}

function renderChart(data) {
    const ctx = document.getElementById("salesChart").getContext("2d");
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: `Haqiqiy sotuvlar (${data.month})`,
                    data: data.actual_sales,
                    borderColor: 'blue',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: `Bashorat qilingan sotuvlar (${data.month})`,
                    data: data.forecast_sales,
                    borderColor: 'red',
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Sana' } },
                y: { title: { display: true, text: 'Miqdor' }, beginAtZero: true }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
    document.getElementById("errorPercent").textContent = `Xatolik foizi (MAE): ${data.error_percent}%`;
}

function updateStats(data) {
    const totalActual = data.actual_sales.reduce((s, v) => s + v, 0);
    const totalForecast = data.forecast_sales.reduce((s, v) => s + v, 0);
    document.getElementById("totalActual").textContent = `Jami haqiqiy sotuvlar (${data.month}): ${totalActual.toFixed(2)}`;
    document.getElementById("totalForecast").textContent = `Jami bashorat qilingan sotuvlar (${data.month}): ${totalForecast.toFixed(2)}`;
}

function showDashboard() {
    window.location.href = '/dashboard';
}