document.addEventListener("DOMContentLoaded", () => {
    loadMonths();
    loadData();
});

const showLoadingSpinner = () => document.getElementById("loadingSpinner").style.display = "flex";
const hideLoadingSpinner = () => document.getElementById("loadingSpinner").style.display = "none";

function loadMonths() {
    const monthSelect = document.getElementById("monthSelect");
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthSelect.add(new Option(`${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`, yearMonth));
    }
    monthSelect.value = today.toISOString().slice(0, 7).replace('-', '-');
}

function getSelectedMonth() {
    return document.getElementById("monthSelect").value;
}

function loadData() {
    const section = document.getElementById("pageTitle").textContent;
    showLoadingSpinner();
    const month = getSelectedMonth();
    let url = '';
    switch (section) {
        case "Mahsulotlar":
            url = '/products';
            break;
        case "Ombor Qoldiqlari":
            url = '/warehouse_stock';
            break;
        case "Bashoratlar":
            url = `/forecast?month=${month}`;
            break;
        case "Buyurtmalar":
            url = `/orders?month=${month}`;
            break;
        case "Hisobotlar":
            url = `/reports?month=${month}`;
            break;
        default:
            hideLoadingSpinner();
            return;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            renderTable(data, section);
            hideLoadingSpinner();
        })
        .catch(error => {
            console.error(`${section} yuklashda xato:`, error);
            document.getElementById("stockBody").innerHTML = `<tr><td colspan="31">Ma'lumotlar topilmadi: ${error.message}</td></tr>`;
            hideLoadingSpinner();
        });
}

function renderTable(data, section) {
    const dateHeader = document.getElementById("dateHeader");
    const stockBody = document.getElementById("stockBody");
    stockBody.innerHTML = "";

    if (section === "Mahsulotlar") {
        dateHeader.innerHTML = "<th>ID</th><th>Nomi</th><th>Kategoriya</th><th>Birlik</th><th>Amal qilish muddati (kun)</th>";
        Object.keys(data).forEach(productId => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${productId}</td>
                <td>${data[productId].name}</td>
                <td>${data[productId].category}</td>
                <td>${data[productId].unit}</td>
                <td>${data[productId].shelf_life_days}</td>
            `;
            stockBody.appendChild(row);
        });
    } else if (section === "Ombor Qoldiqlari") {
        dateHeader.innerHTML = "<th>ID</th><th>Qoldiq</th><th>Qoplash Kunlari</th>";
        Object.keys(data).forEach(productId => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${productId}</td>
                <td>${data[productId].stock.toFixed(2)}</td>
                <td>${data[productId].days_to_cover}</td>
            `;
            stockBody.appendChild(row);
        });
    } else if (section === "Bashoratlar") {
        const dates = new Set();
        Object.values(data).forEach(product => Object.keys(product).forEach(date => dates.add(date)));
        const sortedDates = Array.from(dates).sort();
        dateHeader.innerHTML = `<th>ID</th>${sortedDates.map(date => `<th>${date}</th>`).join('')}`;
        Object.keys(data).forEach(productId => {
            const row = document.createElement("tr");
            let rowContent = `<td>${productId}</td>`;
            sortedDates.forEach(date => {
                rowContent += `<td>${(data[productId][date] || 0).toFixed(2)}</td>`;
            });
            row.innerHTML = rowContent;
            stockBody.appendChild(row);
        });
    } else if (section === "Buyurtmalar") {
        const dates = new Set();
        Object.values(data).forEach(product => Object.keys(product).forEach(date => dates.add(date)));
        const sortedDates = Array.from(dates).sort();
        dateHeader.innerHTML = `<th>ID</th>${sortedDates.map(date => `<th>${date}</th>`).join('')}`;
        Object.keys(data).forEach(productId => {
            const row = document.createElement("tr");
            let rowContent = `<td>${productId}</td>`;
            sortedDates.forEach(date => {
                const value = (data[productId][date] || 0).toFixed(2);
                rowContent += `<td class="${value != '0.00' ? 'non-zero' : ''}">${value}</td>`;
            });
            row.innerHTML = rowContent;
            stockBody.appendChild(row);
        });
    } else if (section === "Hisobotlar") {
        dateHeader.innerHTML = "<th>Nomi</th><th>Miqdori</th><th>Birlik</th>";
        if (data.message) {
            stockBody.innerHTML = `<tr><td colspan="3">${data.message}</td></tr>`;
        } else {
            data.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.quantity.toFixed(2)}</td>
                    <td>${item.unit}</td>
                `;
                stockBody.appendChild(row);
            });
        }
    }
}

function showProducts() {
    document.getElementById("pageTitle").textContent = "Mahsulotlar";
    loadData();
}

function showWarehouseStock() {
    document.getElementById("pageTitle").textContent = "Ombor Qoldiqlari";
    loadData();
}

function showForecast() {
    document.getElementById("pageTitle").textContent = "Bashoratlar";
    loadData();
}

function showOrders() {
    document.getElementById("pageTitle").textContent = "Buyurtmalar";
    loadData();
}

function showReports() {
    document.getElementById("pageTitle").textContent = "Hisobotlar";
    loadData();
}