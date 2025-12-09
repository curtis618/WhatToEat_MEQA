// 預設資料 (當無法連線時使用)
const defaultRestaurants = [];

// 資料變數
let restaurants = [];

// DOM 元素
const restaurantTableBody = document.querySelector('#restaurantTable tbody');
const filterTypeSelect = document.getElementById('filterType');
const typeListDatalist = document.getElementById('typeList');
const pickBtn = document.getElementById('pickBtn');
const resultArea = document.getElementById('resultArea');
const resultContent = document.getElementById('resultContent');
const addBtn = document.getElementById('addBtn');

// 初始化
async function init() {
    await loadFromServer();
    renderTable();
    updateTypeOptions();
}

// 從伺服器讀取資料
async function loadFromServer() {
    try {
        const response = await fetch('/api/restaurants');
        if (response.ok) {
            restaurants = await response.json();
        } else {
            console.error('無法讀取資料');
            alert('無法讀取資料，請確認是否已執行 python server.py');
        }
    } catch (error) {
        console.error('連線錯誤:', error);
        alert('連線失敗！請確認您是執行 "python server.py" 而不是 Live Server 或其他方式。');
        // 如果連線失敗，嘗試讀取 LocalStorage 作為備案，或使用空陣列
        restaurants = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    }
}

// 儲存資料到伺服器
async function saveToServer() {
    try {
        const response = await fetch('/api/restaurants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(restaurants)
        });
        
        if (!response.ok) {
            alert('儲存失敗！');
        }
    } catch (error) {
        console.error('儲存錯誤:', error);
        alert('無法連線到伺服器，資料僅暫存於瀏覽器。');
        // 備份到 LocalStorage
        localStorage.setItem('myRestaurants', JSON.stringify(restaurants));
    }
}

// 渲染表格
function renderTable() {
    restaurantTableBody.innerHTML = '';
    restaurants.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.name}</td>
            <td>${r.type}</td>
            <td>$${r.minPrice} ~ $${r.maxPrice}</td>
            <td><button class="delete-btn" onclick="deleteRestaurant(${r.id})">刪除</button></td>
        `;
        restaurantTableBody.appendChild(row);
    });
}

// 更新種類選項 (下拉選單 & 新增時的建議清單)
function updateTypeOptions() {
    // 取得所有不重複的種類
    const types = [...new Set(restaurants.map(r => r.type))];
    
    // 更新篩選下拉選單
    const currentFilter = filterTypeSelect.value;
    filterTypeSelect.innerHTML = '<option value="all">全部種類</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterTypeSelect.appendChild(option);
    });
    filterTypeSelect.value = currentFilter; // 保持原本選擇

    // 更新新增表單的 datalist
    typeListDatalist.innerHTML = '';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        typeListDatalist.appendChild(option);
    });
}

// 新增餐廳
addBtn.addEventListener('click', () => {
    const name = document.getElementById('newName').value.trim();
    const type = document.getElementById('newType').value.trim();
    const minPrice = parseInt(document.getElementById('newMinPrice').value) || 0;
    const maxPrice = parseInt(document.getElementById('newMaxPrice').value) || 0;

    if (!name || !type) {
        alert('請輸入餐廳名稱和種類！');
        return;
    }

    if (minPrice > maxPrice && maxPrice !== 0) {
        alert('最低價不能高於最高價！');
        return;
    }

    const newId = restaurants.length > 0 ? Math.max(...restaurants.map(r => r.id)) + 1 : 1;
    
    restaurants.push({
        id: newId,
        name,
        type,
        minPrice,
        maxPrice
    });

    // 清空輸入框
    document.getElementById('newName').value = '';
    document.getElementById('newType').value = '';
    document.getElementById('newMinPrice').value = '';
    document.getElementById('newMaxPrice').value = '';

    saveToServer(); // 儲存到伺服器
    renderTable();
    updateTypeOptions();
});

// 刪除餐廳
window.deleteRestaurant = function(id) {
    if(confirm('確定要刪除這間餐廳嗎？')) {
        restaurants = restaurants.filter(r => r.id !== id);
        saveToServer(); // 儲存到伺服器
        renderTable();
        updateTypeOptions();
    }
};

// AI 挑選邏輯
pickBtn.addEventListener('click', () => {
    // 1. 取得篩選條件
    const filterMin = parseInt(document.getElementById('filterMinPrice').value);
    const filterMax = parseInt(document.getElementById('filterMaxPrice').value);
    const filterType = filterTypeSelect.value;

    // 2. 篩選符合的餐廳
    const candidates = restaurants.filter(r => {
        // 種類篩選
        if (filterType !== 'all' && r.type !== filterType) return false;
        
        // 價格篩選邏輯：
        // 如果使用者設定了預算上限 (filterMax)，餐廳的最低價 (r.minPrice) 必須在預算內
        // 如果使用者設定了預算下限 (filterMin)，餐廳的最高價 (r.maxPrice) 應該要能滿足下限 (這部分邏輯可依需求調整，這裡採寬鬆認定)
        
        // 簡單邏輯：只要餐廳的價格區間與使用者的篩選區間有重疊即可
        // 餐廳區間: [r.min, r.max]
        // 篩選區間: [f.min, f.max]
        
        let userMin = isNaN(filterMin) ? 0 : filterMin;
        let userMax = isNaN(filterMax) ? Infinity : filterMax;

        // 檢查區間是否有重疊
        // 重疊條件：max(r.min, userMin) <= min(r.max, userMax)
        const overlapMin = Math.max(r.minPrice, userMin);
        const overlapMax = Math.min(r.maxPrice, userMax);

        return overlapMin <= overlapMax;
    });

    // 3. 顯示結果
    resultArea.classList.remove('hidden');
    
    if (candidates.length === 0) {
        resultContent.innerHTML = `<span style="color: #999;">沒有符合條件的餐廳... 😢<br>試試看放寬條件吧！</span>`;
    } else {
        // 模擬 AI 思考動畫
        resultContent.textContent = "🤔 思考中...";
        pickBtn.disabled = true;
        
        let count = 0;
        const interval = setInterval(() => {
            const randomTemp = candidates[Math.floor(Math.random() * candidates.length)];
            resultContent.textContent = randomTemp.name;
            count++;
            if (count > 10) {
                clearInterval(interval);
                const finalChoice = candidates[Math.floor(Math.random() * candidates.length)];
                resultContent.innerHTML = `
                    🎉 ${finalChoice.name} 🎉<br>
                    <span style="font-size: 1rem; color: #666;">
                        (${finalChoice.type} | $${finalChoice.minPrice}-$${finalChoice.maxPrice})
                    </span>
                `;
                pickBtn.disabled = false;
            }
        }, 100);
    }
});

// 啟動
init();
