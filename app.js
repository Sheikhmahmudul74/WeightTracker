// App Constants
const STORAGE_KEY = 'weight_tracker_data';
const HEIGHT_KEY = 'weight_tracker_height';
const GOAL_KEY = 'weight_tracker_goal';
const NAME_KEY = 'weight_tracker_name';
const SETUP_KEY = 'weight_tracker_setup';
const ctx = document.getElementById('weightChart').getContext('2d');

// State
let weights = [];
let userHeight = null; // in cm
let userGoal = null; // in kg
let chartInstance = null;
let editingId = null; // Track if we are editing
// Weight Change Modes
const modes = ['total', '7days', '30days'];
let currentModeIndex = 0;

function getClosestWeight(daysAgo) {
    if (weights.length === 0) return null;

    const latestDate = new Date(weights[weights.length - 1].date);

    for (let i = weights.length - 1; i >= 0; i--) {
        const d = new Date(weights[i].date);
        const diffDays = (latestDate - d) / (1000 * 60 * 60 * 24);

        if (diffDays >= daysAgo) {
            return weights[i].weight;
        }
    }
    return null;
}

function updateWeightChangeMetric() {
    if (weights.length === 0) {
        totalChangeEl.innerHTML = '-- <span>kg</span>';
        changeLabel.textContent = 'Total Change';
        changeSubtitle.textContent = 'Since Start';
        return;
    }

    const latestWeight = parseFloat(weights[weights.length - 1].weight);
    const firstWeight = parseFloat(weights[0].weight);
    const mode = modes[currentModeIndex];

    let change = 0;
    let label = '';
    let subtitle = '';

    if (mode === 'total') {
        change = latestWeight - firstWeight;
        label = 'Total Change';
        subtitle = 'Since Start';
    } else if (mode === '7days') {
        const pastWeight = getClosestWeight(7);
        if (pastWeight === null) {
            totalChangeEl.innerHTML = 'Not enough data';
            totalChangeEl.style.color = 'var(--text-secondary)';
            changeLabel.textContent = '7 Day Change';
            changeSubtitle.textContent = 'Last 7 Days';
            return;
        }
        change = latestWeight - parseFloat(pastWeight);
        label = '7 Day Change';
        subtitle = 'Last 7 Days';
    } else if (mode === '30days') {
        const pastWeight = getClosestWeight(30);
        if (pastWeight === null) {
            totalChangeEl.innerHTML = 'Not enough data';
            totalChangeEl.style.color = 'var(--text-secondary)';
            changeLabel.textContent = '30 Day Change';
            changeSubtitle.textContent = 'Last 30 Days';
            return;
        }
        change = latestWeight - parseFloat(pastWeight);
        label = '30 Day Change';
        subtitle = 'Last 30 Days';
    }

    changeLabel.textContent = label;
    changeSubtitle.textContent = subtitle;

    const sign = change > 0 ? '+' : '';
    totalChangeEl.innerHTML = `${sign}${change.toFixed(1)} <span>kg</span>`;

    if (change < 0) {
        totalChangeEl.style.color = 'var(--success-color)';
    } else if (change > 0) {
        totalChangeEl.style.color = 'var(--danger-color)';
    } else {
        totalChangeEl.style.color = 'var(--text-primary)';
    }
}

// DOM Elements
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');
const dateInput = document.getElementById('date-input');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const historyList = document.getElementById('history-list');
const currentWeightEl = document.getElementById('current-weight');
const totalChangeEl = document.getElementById('total-change');
const startWeightEl = document.getElementById('start-weight');

const bmiDisplayEl = document.getElementById('bmi-display');
const bmiCategoryEl = document.getElementById('bmi-category');
const heightBtn = document.getElementById('height-btn');
const heightModal = document.getElementById('height-modal');
const heightInputModal = document.getElementById('height-input');
const saveHeightBtn = document.getElementById('save-height-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

const goalDisplayEl = document.getElementById('goal-display');
const goalProgressEl = document.getElementById('goal-progress');
const goalBmiEl = document.getElementById('goal-bmi');
const goalBtn = document.getElementById('goal-btn');
const goalModal = document.getElementById('goal-modal');
const goalInputModal = document.getElementById('goal-input');
const saveGoalBtn = document.getElementById('save-goal-btn');
const closeGoalModalBtn = document.getElementById('close-goal-modal-btn');

const changeModeBtn = document.getElementById('change-mode-btn');
const changeLabel = document.getElementById('change-label');
const changeSubtitle = document.getElementById('change-subtitle');

// New Modal Elements
const openAddBtn = document.getElementById('open-add-btn');
const addModal = document.getElementById('add-modal');
const closeAddBtn = document.getElementById('close-add-btn');

const openHistoryBtn = document.getElementById('open-history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-modal-btn');

// Initialization
function init() {
    // Check if first time user
    const isSetup = localStorage.getItem(SETUP_KEY);
    if (!isSetup) {
        window.location.href = 'index.html';
        return;
    }

    // Update welcome message with user's name
    const userName = localStorage.getItem(NAME_KEY);
    const welcomeMsg = document.getElementById('welcome-msg');
    if (userName && welcomeMsg) {
        welcomeMsg.innerHTML = `Welcome back, <span style="color: var(--danger-color);">${userName}</span>! Monitor your progress, stay healthy.`;
    }

    loadData();
    renderChart();
    updateUI();

    // Set default date to today (Local time)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// Load Data
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            weights = JSON.parse(data);
            if (!Array.isArray(weights)) weights = [];
            // Ensure sorted by date
            weights.sort((a, b) => new Date(a.date) - new Date(b.date));
        } catch (e) {
            console.error("Failed to load weights:", e);
            weights = [];
        }
    }

    const height = localStorage.getItem(HEIGHT_KEY);
    if (height) {
        userHeight = parseFloat(height);
        if (isNaN(userHeight)) userHeight = null;
    }

    const goal = localStorage.getItem(GOAL_KEY);
    if (goal) {
        userGoal = parseFloat(goal);
        if (isNaN(userGoal)) userGoal = null;
    }
}

// Save Data
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}

function saveHeight(h) {
    userHeight = h;
    localStorage.setItem(HEIGHT_KEY, userHeight);
    updateMetrics(); // Re-calc BMI
}

function saveGoal(g) {
    userGoal = g;
    localStorage.setItem(GOAL_KEY, userGoal);
    updateMetrics(); // Re-calc Goal
}

// Update UI (Metrics & List)
function updateUI() {
    renderHistory();
    updateMetrics();
    updateWeightChangeMetric();
    updateChart();
}

// Render History List
function renderHistory() {
    historyList.innerHTML = '';
    // Show newest first in list
    const sortedForList = [...weights].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedForList.length === 0) {
        historyList.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 1rem;">No records yet. Start tracking!</li>';
        return;
    }

    sortedForList.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-date">${new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <div style="display: flex; align-items: center;">
                <span class="history-weight">${parseFloat(entry.weight).toFixed(1)} kg</span>
                <button class="action-btn edit-btn" onclick="editEntry('${entry.id}')" title="Edit">✏️</button>
                <button class="action-btn delete-btn" onclick="deleteEntry('${entry.id}')" title="Delete">&times;</button>
            </div>
        `;
        historyList.appendChild(li);
    });
}

// Edit Entry
window.editEntry = function (id) {
    const entry = weights.find(w => w.id === id);
    if (entry) {
        weightInput.value = entry.weight;
        dateInput.value = entry.date;
        editingId = id;

        // Change UI to Edit Mode
        submitBtn.textContent = 'Update Entry';
        cancelEditBtn.style.display = 'block';

        // Open modal
        if (historyModal.open) historyModal.close();
        addModal.showModal();
    }
}

// Cancel Edit
cancelEditBtn.addEventListener('click', () => {
    resetForm();
    addModal.close();
});

function resetForm() {
    editingId = null;
    weightForm.reset();
    dateInput.valueAsDate = new Date(); // Reset to today
    submitBtn.textContent = 'Add Entry';
    cancelEditBtn.style.display = 'none';
}

// Delete Entry
window.deleteEntry = function (id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        weights = weights.filter(w => w.id !== id);

        // If we deleted the item being edited, reset form
        if (editingId === id) {
            resetForm();
        }

        saveData();
        updateUI();
    }
};

// Open Modals
if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
        resetForm(); // Ensure clean state
        addModal.showModal();
    });
}

if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', () => {
        renderHistory(); // Ensure fresh list
        historyModal.showModal();
    });
}

// Close Modals
if (closeAddBtn) {
    closeAddBtn.addEventListener('click', () => {
        addModal.close();
        resetForm();
    });
}

if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
        historyModal.close();
    });
}

// Update Metrics
function updateMetrics() {
    // Handle No Data Case
    if (weights.length === 0) {
        currentWeightEl.innerHTML = '-- <span>kg</span>';
        startWeightEl.innerHTML = 'Start: -- <span>kg</span>';
        bmiDisplayEl.innerText = '--';
        bmiCategoryEl.innerText = 'No Data';
        goalDisplayEl.innerHTML = userGoal ? `${userGoal} <span>kg</span>` : '--';
        goalProgressEl.innerText = 'No Data';
        return;
    }

    // Calculate Metrics
    const current = parseFloat(weights[weights.length - 1].weight);
    const start = parseFloat(weights[0].weight);

    currentWeightEl.innerHTML = `${current.toFixed(1)} <span>kg</span>`;
    startWeightEl.innerHTML = `Start: ${start.toFixed(1)} <span>kg</span>`;

    // BMI Calculation
    if (userHeight && userHeight > 0) {
        const heightM = userHeight / 100;
        const bmi = current / (heightM * heightM);
        bmiDisplayEl.innerText = bmi.toFixed(1);

        let category = '';
        let color = '';
        if (bmi < 18.5) { category = 'Underweight'; color = 'var(--text-secondary)'; }
        else if (bmi < 25) { category = 'Normal weight'; color = 'var(--success-color)'; }
        else if (bmi < 30) { category = 'Overweight'; color = 'orange'; }
        else { category = 'Obese'; color = 'var(--danger-color)'; }

        bmiCategoryEl.innerText = category;
        bmiCategoryEl.style.color = color;
    } else {
        bmiDisplayEl.innerText = '--';
        bmiCategoryEl.innerText = 'Set Height';
        bmiCategoryEl.style.color = 'var(--text-secondary)';
    }

    // Goal Calculation
    if (userGoal && userGoal > 0) {
        goalDisplayEl.innerHTML = `${userGoal} <span>kg</span>`;
        const diff = current - userGoal;
        const absDiff = Math.abs(diff).toFixed(1);

        if (diff === 0) {
            goalProgressEl.innerText = "Goal Reached! 🎉";
            goalProgressEl.style.color = 'var(--success-color)';
        } else if (diff > 0) {
            goalProgressEl.innerText = `${absDiff} kg to lose`;
            goalProgressEl.style.color = 'var(--text-secondary)';
        } else {
            goalProgressEl.innerText = `${absDiff} kg to gain`;
            goalProgressEl.style.color = 'var(--text-secondary)';
        }

        // Target BMI
        if (userHeight && userHeight > 0) {
            const heightM = userHeight / 100;
            const targetBmi = userGoal / (heightM * heightM);
            goalBmiEl.innerText = `Target BMI: ${targetBmi.toFixed(1)}`;
        } else {
            goalBmiEl.innerText = '';
        }

    } else {
        goalDisplayEl.innerText = '--';
        goalProgressEl.innerText = 'Set Goal';
        goalBmiEl.innerText = '';
    }
}

// Modal Logic
heightBtn.addEventListener('click', () => {
    heightInputModal.value = userHeight || '';
    heightModal.showModal();
});

closeModalBtn.addEventListener('click', () => {
    heightModal.close();
});

saveHeightBtn.addEventListener('click', (e) => {
    // Prevent form submit if strictly needed, but dialogue form handles it usually.
    // However, creating a custom handler is safer.
    e.preventDefault();
    const val = parseFloat(heightInputModal.value);
    if (val && val > 0) {
        saveHeight(val);
        heightModal.close();
    }
});

goalBtn.addEventListener('click', () => {
    goalInputModal.value = userGoal || '';
    goalModal.showModal();
});

closeGoalModalBtn.addEventListener('click', () => {
    goalModal.close();
});

saveGoalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const val = parseFloat(goalInputModal.value);
    if (val && val > 0) {
        saveGoal(val);
        goalModal.close();
    }
});

// Change Mode Toggle
if (changeModeBtn) {
    changeModeBtn.addEventListener('click', () => {
        currentModeIndex = (currentModeIndex + 1) % modes.length;
        updateWeightChangeMetric();
    });
}


// Format Date for Chart
// Format Date for Chart
function formatDate(dateString) {
    // Expects YYYY-MM-DD
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

// Render/Update Chart
function renderChart() {
    // Chart.js Setup
    Chart.defaults.color = '#656d76';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    // Check if Chart is defined
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded.');
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight',
                data: [],
                borderColor: '#0969da',
                backgroundColor: 'rgba(9, 105, 218, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#0969da',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1f2328',
                    bodyColor: '#1f2328',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return `Weight: ${context.parsed.y} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    suggestedMin: 40,
                    suggestedMax: 70,
                }
            }
        }
    });
}

function updateChart() {
    if (!chartInstance) return;

    // Use all weights
    const labels = weights.map(w => formatDate(w.date));
    const data = weights.map(w => w.weight);

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();

    // Adjust chart width for scrolling
    const scrollContainer = document.querySelector('.canvas-wrapper');
    const chartInner = document.querySelector('.chart-scroll-inner');
    const minWidthPerPoint = 50; // pixels per data point
    const dynamicWidth = weights.length * minWidthPerPoint;

    // Ensure it doesn't shrink smaller than container
    if (chartInner && scrollContainer) {
        chartInner.style.width = `${Math.max(scrollContainer.clientWidth, dynamicWidth)}px`;

        // Scroll to end (newest data)
        requestAnimationFrame(() => {
            scrollContainer.scrollLeft = scrollContainer.scrollWidth;
        });
    }
}

// Handle Form Submit
weightForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const weightVal = parseFloat(weightInput.value);
    const dateVal = dateInput.value;

    if (!weightVal || !dateVal) return;

    if (editingId) {
        // Update existing entry
        const index = weights.findIndex(w => w.id === editingId);
        if (index !== -1) {
            weights[index].weight = weightVal;
            weights[index].date = dateVal;
        }
        resetForm();
        addModal.close(); // Close modal after edit
    } else {
        // Add new entry
        // Check for duplicates only if not editing
        const existingIndex = weights.findIndex(w => w.date === dateVal);
        if (existingIndex >= 0) {
            if (confirm('An entry for this date already exists. Overwrite?')) {
                weights[existingIndex].weight = weightVal;
            } else {
                return;
            }
        } else {
            weights.push({
                id: Date.now().toString(),
                date: dateVal,
                weight: weightVal
            });
        }
        addModal.close(); // Close modal after add
    }

    // Sort by date
    weights.sort((a, b) => new Date(a.date) - new Date(b.date));

    saveData();
    updateUI();

    if (!editingId) {
        weightInput.value = ''; // Only clear if we added new
    }
});

// Pure function: compute metrics from data without touching the DOM
function computeMetrics(weightsArr, heightCm, goalKg, mode) {
    const result = {
        current: null,
        start: null,
        compareWeight: null,
        change: 0,
        bmi: null,
        bmiCategory: '',
        bmiColor: '',
        goalDisplay: null,
        goalProgressText: '',
        goalProgressColor: 'var(--text-secondary)',
        goalBmiText: ''
    };

    if (!Array.isArray(weightsArr) || weightsArr.length === 0) return result;

    const parsedWeights = weightsArr.map(w => ({ date: w.date, weight: parseFloat(w.weight) }));
    const current = parsedWeights[parsedWeights.length - 1].weight;
    const start = parsedWeights[0].weight;
    result.current = current;
    result.start = start;
    result.compareWeight = start;

    const findClosestEntry = (targetDate) => {
        let closest = parsedWeights[0];
        let minDiff = Math.abs(new Date(parsedWeights[0].date) - targetDate);
        for (let i = 1; i < parsedWeights.length; i++) {
            const d = new Date(parsedWeights[i].date);
            const diff = Math.abs(d - targetDate);
            if (diff < minDiff) {
                minDiff = diff;
                closest = parsedWeights[i];
            }
        }
        return closest;
    };

    if (mode === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const closest = findClosestEntry(oneWeekAgo);
        result.compareWeight = closest.weight;
    } else if (mode === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        const closest = findClosestEntry(oneMonthAgo);
        result.compareWeight = closest.weight;
    }

    result.change = result.current - result.compareWeight;

    // BMI
    if (heightCm && heightCm > 0) {
        const heightM = heightCm / 100;
        const bmi = result.current / (heightM * heightM);
        result.bmi = bmi;

        if (bmi < 18.5) { result.bmiCategory = 'Underweight'; result.bmiColor = 'var(--text-secondary)'; }
        else if (bmi < 25) { result.bmiCategory = 'Normal weight'; result.bmiColor = 'var(--success-color)'; }
        else if (bmi < 30) { result.bmiCategory = 'Overweight'; result.bmiColor = 'orange'; }
        else { result.bmiCategory = 'Obese'; result.bmiColor = 'var(--danger-color)'; }
    }

    // Goal
    if (goalKg && goalKg > 0) {
        result.goalDisplay = `${goalKg} <span>kg</span>`;
        const diff = result.current - goalKg;
        const absDiff = Math.abs(diff).toFixed(1);
        if (diff === 0) {
            result.goalProgressText = 'Goal Reached! 🎉';
            result.goalProgressColor = 'var(--success-color)';
        } else if (diff > 0) {
            result.goalProgressText = `${absDiff} kg to lose`;
        } else {
            result.goalProgressText = `${absDiff} kg to gain`;
        }

        if (heightCm && heightCm > 0) {
            const heightM = heightCm / 100;
            const targetBmi = goalKg / (heightM * heightM);
            result.goalBmiText = `Target BMI: ${targetBmi.toFixed(1)}`;
        }
    }

    return result;
}

// Run a silent test by computing metrics for a provided weights array without updating UI
function runSilentTest(testWeights, testMode = 'week') {
    return computeMetrics(testWeights, userHeight, userGoal, testMode);
}

// Start
init();
