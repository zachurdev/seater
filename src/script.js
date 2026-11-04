let guestData = [];
let searchQuery = "";

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
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
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
    }).filter(obj => Object.values(obj).some(value => value !== ""));
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

function getFilteredGuests() {
    const q = searchQuery.toLowerCase();
    if (!q) return guestData;

    return guestData.filter(guest =>
        [guest.rank, guest.name, guest.table, guest.seat]
            .some(value => String(value || '').toLowerCase().includes(q))
    );
}

function getTableLabel(guest) {
    return guest.table ? `Table ${guest.table}` : "Unassigned Table";
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
    document.getElementById("statusCounter").innerHTML = `Showing <span class="text-gold-400 font-bold">${guests.length}</span> of <span>${guestData.length}</span> seats`;

    const container = document.getElementById("contentContainer");
    const emptyState = document.getElementById("emptyState");

    if (guests.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    } else {
        emptyState.classList.add("hidden");
    }

    renderTableView(guests, container);

    if (window.lucide) lucide.createIcons();
}

function renderTableView(guests, container) {
    const tableGroups = new Map();
    
    guestData.forEach(guest => {
        const title = getTableLabel(guest);
        if (!tableGroups.has(title)) tableGroups.set(title, []);
    });

    guests.forEach(guest => {
        tableGroups.get(getTableLabel(guest)).push(guest);
    });

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;

    tableGroups.forEach((tableGuests, tableName) => {
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
                            [g.rank, g.name, g.table, g.seat]
                                .some(value => String(value || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        );
                        return `
                            <div class="p-2 rounded-lg flex items-center justify-between text-xs ${isMatch ? 'bg-gold-500/20 border border-gold-500/40 text-slate-100 font-semibold' : 'text-slate-300 hover:bg-slate-800/40'}">
                                <div class="flex flex-col min-w-0 pr-2">
                                    <span class="truncate">${highlightText(g.name || 'Unassigned', searchQuery)}</span>
                                    <span class="text-[10px] text-slate-400 truncate">${highlightText(g.rank || '-', searchQuery)}</span>
                                </div>
                                <span class="px-2 py-0.5 bg-slate-800/80 text-slate-400 font-mono text-[11px] rounded border border-slate-700/50 shrink-0">Seat ${highlightText(g.seat || '-', searchQuery)}</span>
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

// Expose functions globally so HTML onclick attributes can access them from the module
window.handleSearchInput = handleSearchInput;
window.clearSearch = clearSearch;