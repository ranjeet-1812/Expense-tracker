// Simple Expense Tracker using localStorage
const LS_KEY = "expense_tracker_v1";

let expenses = [];
let chart = null;
let filters = { from: null, to: null, category: "All" };

// --- Helpers
const $ = id => document.getElementById(id);
const formatCurrency = v => `₹${Number(v).toLocaleString('en-IN', {maximumFractionDigits:2})}`;

// --- Load / Save
function loadExpenses(){
  const raw = localStorage.getItem(LS_KEY);
  expenses = raw ? JSON.parse(raw) : [];
}
function saveExpenses(){
  localStorage.setItem(LS_KEY, JSON.stringify(expenses));
}

// --- UI Renders
function renderTable(list){
  const tbody = document.querySelector("#expenses-table tbody");
  tbody.innerHTML = "";
  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:18px">No expenses found.</td></tr>`;
    return;
  }
  list.forEach(exp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.category}</td>
      <td>${escapeHtml(exp.description||"—")}</td>
      <td style="font-weight:600">${Number(exp.amount).toFixed(2)}</td>
      <td>
        <div class="actions-btn">
          <button class="small-btn edit" onclick="editExpense('${exp.id}')">Edit</button>
          <button class="small-btn delete" onclick="deleteExpense('${exp.id}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSummary(list){
  const total = list.reduce((s, e) => s + Number(e.amount), 0);
  $("total-spent").textContent = formatCurrency(total);
  $("count-expenses").textContent = list.length;
  if(list.length){
    const dates = list.map(e => e.date).sort();
    $("range-dates").textContent = `${dates[0]} → ${dates[dates.length-1]}`;
  } else {
    $("range-dates").textContent = "—";
  }
  renderChart(list);
}

function renderChart(list){
  const byCat = {};
  list.forEach(e => byCat[e.category] = (byCat[e.category]||0) + Number(e.amount));
  const labels = Object.keys(byCat);
  const data = labels.map(l => byCat[l]);

  const ctx = document.getElementById("categoryChart").getContext("2d");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, hoverOffset:6 }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${Number(ctx.raw).toFixed(2)}` } }
      }
    }
  });
}

// --- Filters
function applyFilters(){
  const from = $("from-date").value || null;
  const to = $("to-date").value || null;
  const category = $("filter-category").value;

  filters = { from, to, category };

  let list = [...expenses];
  if(from) list = list.filter(e => e.date >= from);
  if(to) list = list.filter(e => e.date <= to);
  if(category && category !== "All") list = list.filter(e => e.category === category);

  renderTable(list);
  renderSummary(list);
}
function resetFilters(){
  $("from-date").value = "";
  $("to-date").value = "";
  $("filter-category").value = "All";
  filters = { from: null, to: null, category: "All" };
  renderAll();
}

// --- CRUD
function addExpense(exp){
  expenses.push(exp);
  saveExpenses();
  renderAll();
}
function updateExpense(id, updated){
  const i = expenses.findIndex(e => e.id === id);
  if(i>-1) expenses[i] = {...expenses[i], ...updated};
  saveExpenses();
  renderAll();
}
function deleteExpense(id){ 
  if(!confirm("Delete this expense?")) return;
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderAll();
}

function editExpense(id){
  const e = expenses.find(x => x.id === id);
  if(!e) return;
  $("expense-id").value = e.id;
  $("amount").value = e.amount;
  $("category").value = e.category;
  $("date").value = e.date;
  $("description").value = e.description || "";
  window.scrollTo({top:0, behavior:"smooth"});
}

// --- Form handling
function handleFormSubmit(ev){
  ev.preventDefault();
  const id = $("expense-id").value;
  const amount = Number($("amount").value).toFixed(2);
  const category = $("category").value;
  const date = $("date").value;
  const description = $("description").value.trim();

  if(!date || !amount || Number(amount) <= 0) {
    alert("Please enter valid data.");
    return;
  }

  if(id){
    updateExpense(id, { amount, category, date, description });
  } else {
    addExpense({
      id: generateId(),
      amount,
      category,
      date,
      description
    });
  }
  clearForm();
}

function clearForm(){
  $("expense-id").value = "";
  $("amount").value = "";
  $("category").value = "Food";
  $("date").value = "";
  $("description").value = "";
}

// --- Utils
function generateId(){
  return 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// --- Export / Import
function exportCSV(){
  const header = ["id","date","category","description","amount"];
  const rows = expenses.map(e => [e.id, e.date, e.category, `"${(e.description||"").replace(/"/g,'""')}"`, e.amount]);
  const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  downloadBlob(csv, "expenses.csv", "text/csv");
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(expenses, null, 2)], {type:"application/json"});
  downloadBlob(blob, "expenses.json", "application/json");
}
// --- Create Bill for filtered expenses ---


 function createBill() {
  let list = [...expenses];
  if (filters.from) list = list.filter(e => e.date >= filters.from);
  if (filters.to) list = list.filter(e => e.date <= filters.to);
  if (filters.category && filters.category !== "All") list = list.filter(e => e.category === filters.category);

  if (!list.length) {
    alert("No expenses found for current filters!");
    return;
  }

  const total = list.reduce((s, e) => s + Number(e.amount), 0);

  const billHTML = `
    <div style="font-family:Arial; padding:10px;">
      <h2 style="text-align:center;color:#2b6cb0;">Expense Bill (Filtered)</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f7fb">
            <th>Date</th><th>Category</th><th>Description</th><th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(e => `
            <tr>
              <td>${e.date}</td>
              <td>${e.category}</td>
              <td>${e.description || "—"}</td>
              <td>${Number(e.amount).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:bold;">Total</td>
            <td><strong>₹${total.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Important: doc.html requires html2canvas
  doc.html(billHTML, {
    callback: function (doc) {
      doc.save(`Expense_Bill_${new Date().toISOString().slice(0,10)}.pdf`);
    },
    x: 20,
    y: 20,
    html2canvas: { scale: 0.6 } // adjust scale for better fit
  });
}


function downloadBlob(data, filename, mime){
  const a = document.createElement("a");
  const blob = data instanceof Blob ? data : new Blob([data], {type: mime});
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

function importJSONFile(file){
  const r = new FileReader();
  r.onload = e => {
    try{
      const parsed = JSON.parse(e.target.result);
      if(!Array.isArray(parsed)) throw new Error("Expected array");
      // Merge with existing: avoid duplicate ids
      const existingIds = new Set(expenses.map(x => x.id));
      const toAdd = parsed.filter(x => !existingIds.has(x.id)).map(x => ({
        id: x.id || generateId(),
        date: x.date || new Date().toISOString().slice(0,10),
        category: x.category || "Other",
        description: x.description || "",
        amount: Number(x.amount||0).toFixed(2)
      }));
      expenses = [...expenses, ...toAdd];
      saveExpenses();
      renderAll();
      alert(`Imported ${toAdd.length} records.`);
    } catch(err){
      alert("Invalid JSON file.");
    }
  };
  r.readAsText(file);
}

// --- Sample data
function addSampleData(){
  const sample = [
    
    {id: generateId(), date: today(0), category:"Room Rent", description:"Room Rent", amount:"2625.00"},
    {id: generateId(), date: today(0), category:"Mess", description:"Mess", amount:"3200.00"}
  ];
  expenses = [...expenses, ...sample];
  saveExpenses();
  renderAll();
}

function today(offsetDays=0){
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0,10);
}

// --- Top-level render
function renderAll(){
  // Apply current filters (if any)
  let list = [...expenses];
  if(filters.from) list = list.filter(e => e.date >= filters.from);
  if(filters.to) list = list.filter(e => e.date <= filters.to);
  if(filters.category && filters.category !== "All") list = list.filter(e => e.category === filters.category);

  // Sort by date descending
  list.sort((a,b) => b.date.localeCompare(a.date));
  renderTable(list);
  renderSummary(list);
}

// --- Events wiring
function wireEvents(){
  $("expense-form").addEventListener("submit", handleFormSubmit);
  $("clear-form").addEventListener("click", clearForm);
  $("apply-filters").addEventListener("click", applyFilters);
  $("reset-filters").addEventListener("click", resetFilters);
  $("add-sample").addEventListener("click", addSampleData);
  $("export-csv").addEventListener("click", exportCSV);
  $("export-json").addEventListener("click", exportJSON);
  $("create-bill").addEventListener("click", createBill);

  $("clear-all").addEventListener("click", () => {
    if(confirm("Clear ALL expenses? This cannot be undone.")){
      expenses = [];
      saveExpenses();
      renderAll();
    }
  });

  $("import-json").addEventListener("click", () => $("import-json-file").click());
  $("import-json-file").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if(file) importJSONFile(file);
    ev.target.value = "";
  });
}

// --- Initialize
function init(){
  loadExpenses();
  wireEvents();
  // set default date to today for convenience
  $("date").value = today();
  renderAll();
}

// Run
init();
