// --- DOM Elements ---
const navScanner = document.getElementById('nav-scanner');
const navHistory = document.getElementById('nav-history');
const pageScanner = document.getElementById('page-scanner');
const pageHistory = document.getElementById('page-history');
const scanButton = document.getElementById('scan-button');
const scanResultsContainer = document.getElementById('scan-results-container');
const historyListContainer = document.getElementById('history-list-container');

// --- State Management ---
let lastScanData = null; // Holds data of the last scan to be saved to history

// --- Page Navigation Logic ---
navScanner.addEventListener('click', () => showPage('scanner'));
navHistory.addEventListener('click', () => {
    showPage('history');
    loadHistory();
});

function showPage(pageName) {
    [pageScanner, pageHistory].forEach(p => p.classList.remove('page-active'));
    [navScanner, navHistory].forEach(n => n.classList.remove('nav-active', 'text-gray-400', 'hover:text-emerald-400'));

    if (pageName === 'scanner') {
        pageScanner.classList.add('page-active');
        navScanner.classList.add('nav-active');
        navHistory.classList.add('text-gray-400', 'hover:text-emerald-400');
    } else {
        pageHistory.classList.add('page-active');
        navHistory.classList.add('nav-active');
        navScanner.classList.add('text-gray-400', 'hover:text-emerald-400');
    }
}

// --- Scanner Logic ---
scanButton.addEventListener('click', async () => {
    if (lastScanData) {
        fetch('http://localhost:5000/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lastScanData)
        }).catch(error => console.error('Failed to save previous scan:', error));
    }
    
    scanButton.disabled = true;
    scanButton.textContent = 'Scanning...';
    scanResultsContainer.innerHTML = `<div class="text-center py-10"><div class="loader rounded-full h-12 w-12 border-4 border-gray-600 mx-auto"></div><p class="mt-4 text-gray-400">Scan in progress...</p></div>`;

    const target = document.getElementById('target').value;
    const options = document.getElementById('options').value;

    try {
        const response = await fetch('http://localhost:5000/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, options }),
        });
        const results = await response.json();
        if (!response.ok) throw new Error(results.error || 'An unknown error occurred.');

        scanResultsContainer.innerHTML = createResultsHTML(results);
        lastScanData = { target, options, results };

    } catch (error) {
        scanResultsContainer.innerHTML = createErrorHTML(error.message);
        lastScanData = null; 
    } finally {
        scanButton.disabled = false;
        if (lastScanData) {
            scanButton.textContent = 'Store & Start New Scan';
        } else {
            scanButton.textContent = 'Start Scan';
        }
    }
});

// --- History Logic ---
async function loadHistory() {
    historyListContainer.innerHTML = `<div class="text-center py-10"><div class="loader rounded-full h-12 w-12 border-4 border-gray-600 mx-auto"></div></div>`;
    try {
        const response = await fetch('http://localhost:5000/history');
        const historyData = await response.json();
        if (!response.ok) throw new Error('Failed to load history.');
        displayHistory(historyData);
    } catch (error) {
        historyListContainer.innerHTML = createErrorHTML(error.message);
    }
}

function displayHistory(historyData) {
    if (historyData.length === 0) {
        historyListContainer.innerHTML = `<div class="text-center text-gray-500 py-10">No scan history found.</div>`;
        return;
    }
    historyListContainer.innerHTML = historyData.map(entry => `
        <div class="bg-gray-800/50 p-5 rounded-lg mb-4 transition hover:bg-gray-800">
            <div class="flex justify-between items-center cursor-pointer" onclick="toggleHistoryDetails('${entry.id}')">
                <div>
                    <div class="font-bold text-lg text-white">${entry.target}</div>
                    <div class="text-sm text-gray-400">
                        ${new Date(entry.timestamp).toLocaleString()} &mdash; Options: <code class="bg-gray-900 px-2 py-1 rounded">${entry.options}</code>
                    </div>
                </div>
                <span id="arrow-${entry.id}" class="transform transition-transform text-gray-400">&#9662;</span>
            </div>
            <div id="details-${entry.id}" class="hidden mt-4 border-t border-gray-700 pt-4">
                ${createResultsHTML(entry.results)}
            </div>
        </div>
    `).join('');
}

function toggleHistoryDetails(id) {
    const details = document.getElementById(`details-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    details.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
}

// --- Reusable HTML Generation ---
function createResultsHTML(results) {
    if (!results || results.length === 0) return `<div class="text-center text-yellow-400 bg-yellow-900/50 py-4 rounded-lg">No hosts found or scan returned no data.</div>`;
    return results.map(host => `
        <div class="bg-gray-800 p-6 rounded-xl shadow-md">
            <div class="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                 <h3 class="text-2xl font-bold text-white">Host: <span class="text-emerald-400">${host.host}</span> <span class="text-gray-400 text-lg">(${host.hostname || 'N/A'})</span></h3>
                 <p class="text-lg">State: <span class="font-semibold ${host.state === 'up' ? 'text-green-400' : 'text-red-400'}">${host.state.toUpperCase()}</span></p>
            </div>
            ${host.protocols.map(proto => `
                <div class="mt-4">
                    <h4 class="text-xl font-semibold text-gray-300 mb-3">${proto.protocol.toUpperCase()} Ports</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-left">
                            <thead class="bg-gray-900/50">
                                <tr>
                                    <th class="p-3">Port</th><th class="p-3">State</th>
                                    <th class="p-3">Service</th><th class="p-3">Version</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-700/50">${proto.ports.map(port => `
                                <tr class="hover:bg-gray-700/50">
                                    <td class="p-3 font-semibold text-emerald-400">${port.port || ''}</td>
                                    <td class="p-3">${port.state || ''}</td>
                                    <td class="p-3">${port.name || ''}</td>
                                    <td class="p-3 text-gray-400">${port.product || ''} ${port.version || ''}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`).join('')}
        </div>`).join('');
}

function createErrorHTML(message) {
    return `<div class="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><h3 class="font-bold">Error</h3><p>${message}</p></div>`;
}
