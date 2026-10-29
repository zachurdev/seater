let guestData = [];
let searchQuery = "";
let displayMode = "table"; // 'table' or 'alpha'

/*
window.addEventListener("DOMContentLoaded", () => {
    loadJsonData();
    readUrlHash();
});
*/

window.addEventListener("DOMContentLoaded", () => {
    loadCsvData(); // Changed from loadJsonData
    readUrlHash();
});

window.addEventListener("hashchange", () => {
    readUrlHash();
    render();
});

// Replace loadJsonData with this:
async function loadCsvData() {
    const errorEl = document.getElementById("errorState");
    try {
        const response = await fetch('./data.csv');
        if (!response.ok) throw new Error("Failed to fetch data.csv");
        
        const csvText = await response.text();
        guestData = parseCSV(csvText);
        
        if (!Array.isArray(guestData) || guestData.length === 0) {
            throw new Error("CSV structure is empty or invalid.");
        }
        errorEl.classList.add("hidden");
        render();
    } catch (err) {
        console.error("Error loading CSV:", err);
        errorEl.classList.remove("hidden");
        document.getElementById("statusCounter").textContent = "Data loading error";
    }
}

// Simple CSV parser helper function
function parseCSV(text) {
    // Split by newlines, handling both Windows (\r\n) and Unix (\n) line endings
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return [];
    
    // Parse headers from the first line
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;

        // Iterate character by character to correctly handle commas inside/outside quotes
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Push the final column

        const obj = {};
        headers.forEach((header, index) => {
            let val = values[index] !== undefined ? values[index] : '';
            // Strip surrounding quotes if Excel added them
            val = val.replace(/^["']|["']$/g, '').trim();
            obj[header] = val;
        });
        
        return obj;
    });
}

/*
// Fetch data from data.json
async function loadJsonData() {
    const errorEl = document.getElementById("errorState");
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error("Failed to fetch data.json");
        
        guestData = await response.json();
        
        if (!Array.isArray(guestData)) {
            throw new Error("JSON structure must be an array of guests.");
        }
        errorEl.classList.add("hidden");
        render();
    } catch (err) {
        console.error("Error loading guest JSON:", err);
        errorEl.classList.remove("hidden");
        document.getElementById("statusCounter").textContent = "Data loading error";
    }
}
*/

function readUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    if (params.has("search")) {
        searchQuery = params.get("search");
    } else if (params.has("table")) {
        searchQuery = params.get("table");
    }
    
    if (searchQuery) {
        document.getElementById("searchInput").value = searchQuery;
        document.getElementById("clearBtn").classList.remove("hidden");
    }
}

function updateUrlHash() {
    if (searchQuery) {
        window.location.hash = `search=${encodeURIComponent(searchQuery)}`;
    } else {
        history.replaceState(null, null, ' ');
    }
}

function handleSearchInput(val) {
    searchQuery = val.trim();
    document.getElementById("clearBtn").classList.toggle("hidden", searchQuery === "");
    updateUrlHash();
    render();
}

function clearSearch() {
    searchQuery = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("clearBtn").classList.add("hidden");
    updateUrlHash();
    render();
}

function setDisplayMode(mode) {
    displayMode = mode;
    const btnTable = document.getElementById("viewBtnTable");
    const btnAlpha = document.getElementById("viewBtnAlpha");

    if (mode === "table") {
        btnTable.className = "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 bg-gold-500 text-navy-950 shadow";
        btnAlpha.className = "px-3 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
    } else {
        btnAlpha.className = "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 bg-gold-500 text-navy-950 shadow";
        btnTable.className = "px-3 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
    }
    render();
}

function getFilteredGuests() {
    const q = searchQuery.toLowerCase();
    if (!q) return guestData;

    return guestData.filter(g => 
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.table && String(g.table).toLowerCase().includes(q)) ||
        (g.tableName && g.tableName.toLowerCase().includes(q)) ||
        (g.seat && g.seat.toLowerCase().includes(q)) ||
        (g.notes && g.notes.toLowerCase().includes(q))
    );
}

function highlightText(text, query) {
    if (!text) return "";
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return String(text).replace(regex, `<mark class="bg-gold-500/40 text-gold-200 px-0.5 rounded">$1</mark>`);
}

function render() {
    if (!guestData || guestData.length === 0) return;

    const guests = getFilteredGuests();
    document.getElementById("statusCounter").innerHTML = `Showing <span class="text-gold-400 font-bold">${guests.length}</span> of <span>${guestData.length}</span> guests`;

    const container = document.getElementById("contentContainer");
    const emptyState = document.getElementById("emptyState");

    if (guests.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    } else {
        emptyState.classList.add("hidden");
    }

    if (displayMode === "table") {
        renderTableView(guests, container);
    } else {
        renderAlphaView(guests, container);
    }

    if (window.lucide) lucide.createIcons();
}

function renderTableView(guests, container) {
    const tableGroups = {};
    
    guestData.forEach(g => {
        const title = g.tableName || `Table ${g.table}`;
        if (!tableGroups[title]) tableGroups[title] = [];
    });

    guests.forEach(g => {
        const title = g.tableName || `Table ${g.table}`;
        if (tableGroups[title]) tableGroups[title].push(g);
    });

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;

    Object.keys(tableGroups).forEach(tableName => {
        const tableGuests = tableGroups[tableName];
        if (searchQuery && tableGuests.length === 0) return;

        html += `
            <div class="glass-card rounded-xl p-5 border border-slate-800 transition-all">
                <div class="flex items-center gap-3 pb-3 mb-3 border-b border-slate-800/80">
                    <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-gold-400 font-serif font-bold text-sm flex items-center justify-center shrink-0">
                        <i data-lucide="utensils" class="w-4 h-4"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-serif font-bold text-slate-100 text-base truncate">${tableName}</h3>
                        <span class="text-[11px] text-slate-400">${tableGuests.length} Guests Seated</span>
                    </div>
                </div>

                <div class="space-y-1.5">
                    ${tableGuests.map(g => {
                        const isMatch = searchQuery && (
                            (g.name && g.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (g.notes && g.notes.toLowerCase().includes(searchQuery.toLowerCase()))
                        );
                        return `
                            <div class="p-2 rounded-lg flex items-center justify-between text-xs ${isMatch ? 'bg-gold-500/20 border border-gold-500/40 text-slate-100 font-semibold' : 'text-slate-300 hover:bg-slate-800/40'}">
                                <div class="flex flex-col min-w-0 pr-2">
                                    <span class="truncate">${highlightText(g.name, searchQuery)}</span>
                                    ${g.notes ? `<span class="text-[10px] text-slate-400 truncate">${highlightText(g.notes, searchQuery)}</span>` : ''}
                                </div>
                                <span class="px-2 py-0.5 bg-slate-800/80 text-slate-400 font-mono text-[11px] rounded border border-slate-700/50 shrink-0">${g.seat || 'Assigned'}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderAlphaView(guests, container) {
    const sorted = [...guests].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let html = `
    <div class="glass-card rounded-xl overflow-hidden border border-slate-800">
        <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/80 uppercase text-[10px] text-slate-400 tracking-wider font-semibold border-b border-slate-800">
            <tr>
                <th class="py-3 px-4">Guest Name</th>
                <th class="py-3 px-4">Assigned Table</th>
                <th class="py-3 px-4">Seat</th>
                <th class="py-3 px-4 text-right">Notes</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
            ${sorted.map(g => {
                const isMatch = searchQuery && (
                (g.name && g.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (g.tableName && g.tableName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (g.table && String(g.table).toLowerCase().includes(searchQuery.toLowerCase()))
                );
                const tableTitle = g.tableName || `Table ${g.table}`;
                return `
                <tr class="transition-colors ${isMatch ? 'bg-gold-500/10 font-semibold text-slate-100' : 'hover:bg-slate-800/30'}">
                    <td class="py-3 px-4 font-medium">${highlightText(g.name, searchQuery)}</td>
                    <td class="py-3 px-4 text-gold-400">${highlightText(tableTitle, searchQuery)}</td>
                    <td class="py-3 px-4 font-mono text-slate-400">${g.seat || 'Assigned'}</td>
                    <td class="py-3 px-4 text-right text-slate-400 text-[11px]">${highlightText(g.notes || '-', searchQuery)}</td>
                </tr>
                `;
            }).join('')}
            </tbody>
        </table>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

// Expose functions globally so HTML onclick attributes can access them from the module
window.setDisplayMode = setDisplayMode;
window.handleSearchInput = handleSearchInput;
window.clearSearch = clearSearch;