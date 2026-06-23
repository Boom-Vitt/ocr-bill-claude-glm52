/* ==========================================================================
   OCR Bill — app.js  (ocr-bill-claude-glm52)
   Client-side bill management with Tesseract.js OCR + localStorage.
   No backend. Images never leave the device.
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "ocr-bill-claude-glm52:bills:v1";
  const LANGS = "tha+eng";

  /* ---------- State ---------- */
  let currentImage = null;     // dataURL string
  let currentFileName = "";
  let working = emptyBill();   // bill being edited in the scan tab

  /* ---------- DOM helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const bills = loadBills();

  /* ---------- Tab switching ---------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === name)
    );
    document.querySelectorAll(".panel").forEach((p) => {
      const active = p.id === "tab-" + name;
      p.classList.toggle("active", active);
      p.hidden = !active;
    });
    if (name === "bills") renderBills();
    if (name === "stats") renderStats();
  }

  /* ---------- Dropzone & file input ---------- */
  const dropzone = $("dropzone");
  const fileInput = $("fileInput");
  const pickBtn = $("pickFileBtn");
  const cameraBtn = $("cameraBtn");

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  cameraBtn.addEventListener("click", (e) => { e.stopPropagation(); openCamera(); });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
  );
  dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function openCamera() {
    // Use capture attribute to open camera on mobile; on desktop falls back to file picker.
    fileInput.setAttribute("capture", "environment");
    fileInput.click();
    // Reset after use so normal file picking isn't forced to camera next time.
    setTimeout(() => fileInput.removeAttribute("capture"), 1000);
  }

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      toast("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      currentImage = reader.result;
      $("previewImg").src = currentImage;
      $("previewWrap").hidden = false;
      $("resultWrap").hidden = true;
      $("ocrStatus").hidden = true;
      // scroll into view
      $("previewWrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    reader.readAsDataURL(file);
  }

  $("clearImgBtn").addEventListener("click", clearImage);
  $("runOcrBtn").addEventListener("click", runOcr);
  $("resetScanBtn").addEventListener("click", resetScan);
  $("reparseBtn").addEventListener("click", () => parseToForm($("rawText").value));
  $("copyRawBtn").addEventListener("click", copyRaw);
  $("saveBillBtn").addEventListener("click", saveBill);
  $("addItemBtn").addEventListener("click", () => addItemRow({ name: "", qty: 1, price: 0 }));

  function clearImage() {
    currentImage = null;
    currentFileName = "";
    fileInput.value = "";
    $("previewWrap").hidden = true;
    $("resultWrap").hidden = true;
    $("ocrStatus").hidden = true;
    working = emptyBill();
  }

  function resetScan() {
    clearImage();
    toast("เริ่มใหม่แล้ว");
  }

  /* ---------- OCR ---------- */
  async function runOcr() {
    if (!currentImage) { toast("ยังไม่มีรูปใบเสร็จ"); return; }
    if (typeof Tesseract === "undefined") {
      toast("โหลด Tesseract.js ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      return;
    }

    $("runOcrBtn").disabled = true;
    $("ocrStatus").hidden = false;
    setProgress(0, "กำลังเตรียมเครื่องมือ OCR…");

    try {
      const result = await Tesseract.recognize(currentImage, LANGS, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100), "กำลังอ่านตัวหนังสือ…");
          } else if (m.status) {
            setProgress(Math.round((m.progress || 0) * 100), humanStatus(m.status));
          }
        },
      });
      const text = (result.data.text || "").trim();
      setProgress(100, "เสร็จเรียบร้อย");
      showResult(text);
    } catch (err) {
      console.error(err);
      toast("OCR ผิดพลาด: " + (err.message || err));
      $("ocrStatus").hidden = true;
    } finally {
      $("runOcrBtn").disabled = false;
    }
  }

  function humanStatus(s) {
    const map = {
      "loading tesseract core": "กำลังโหลด core…",
      "initializing tesseract": "กำลังเริ่มระบบ…",
      "loading language traineddata": "กำลังโหลดแพ็กภาษา (ไทย+อังกฤษ)…",
      "initializing api": "กำลังเตรียม API…",
      "recognizing text": "กำลังอ่านตัวหนังสือ…",
    };
    return map[s] || s;
  }

  function setProgress(pct, text) {
    $("ocrProgress").value = pct;
    $("ocrPercent").textContent = pct + "%";
    $("ocrStatusText").textContent = text;
  }

  function showResult(text) {
    $("resultWrap").hidden = false;
    $("rawText").value = text;
    parseToForm(text);
    $("resultWrap").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyRaw() {
    const t = $("rawText").value;
    if (!t) { toast("ยังไม่มีข้อความให้คัดลอก"); return; }
    navigator.clipboard.writeText(t).then(() => toast("คัดลอกข้อความแล้ว"));
  }

  /* ---------- Parsing heuristics ---------- */
  // Extract structured fields from raw OCR text. Best-effort; user can edit.
  function parseToForm(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Store: first meaningful non-numeric line, or one containing common keywords.
    const storeKeywords = /(ร้าน|จำกัด|มหาชน|ltd|co\.?|store|shop|mart|restaurant|cafe|โรง|คลินิก)/i;
    let store = "";
    for (const l of lines.slice(0, 8)) {
      if (storeKeywords.test(l) || (l.length >= 3 && !/^\d/.test(l) && !hasPriceOnly(l))) {
        store = l.replace(/\s+/g, " ").slice(0, 80);
        break;
      }
    }
    if (!store && lines[0]) store = lines[0].slice(0, 80);

    // Date: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yy, plus พ.ศ. support
    const dateRe = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/;
    const dm = text.match(dateRe);
    let date = "";
    if (dm) {
      let [, d, m, y] = dm;
      if (y.length === 2) y = "20" + y;
      if (Number(y) > 2500) y = String(Number(y) - 543); // พ.ศ. -> ค.ศ.
      date = `${pad(d)}/${pad(m)}/${y}`;
    }

    // Total: look for label + number, prefer "รวม" / "total"
    const total = findTotal(text);

    // Items: lines ending with a price
    const items = findItems(lines);

    working = emptyBill();
    working.store = store;
    working.date = date;
    working.total = total;
    working.items = items.length ? items : [{ name: "", qty: 1, price: 0 }];
    working.rawText = text;

    renderForm();
  }

  function hasPriceOnly(l) {
    return /^[\d,.\s]+$/ .test(l) && /\d/.test(l);
  }

  function num(s) {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[, ]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function findTotal(text) {
    // Candidates: lines mentioning รวม / total / ยอดรวม / amount / grand total / สุทธิ
    const labelRe = /(ยอดรวม|รวมสุทธิ|สุทธิ|รวม\s*ทั้ง\s*หมด|grand\s*total|total|amount\s*due|balance\s*due)/i;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidates = [];
    for (const l of lines) {
      if (labelRe.test(l)) {
        const nums = l.match(/-?\d[\d,]*\.?\d*/g);
        if (nums) candidates.push(num(nums[nums.length - 1]));
      }
    }
    if (candidates.length) return Math.max(...candidates);

    // Fallback: largest single number that looks like baht (not a date, not a qty)
    const all = text.match(/-?\d[\d,]*\.\d{2}/g);
    if (all) return Math.max(...all.map(num));
    return 0;
  }

  function findItems(lines) {
    const items = [];
    // Pattern: <name ...> <qty?> <price>  (price = number with optional decimals at end)
    const priceAtEnd = /^(.+?)\s+(\d{1,4})(?:\s+x?\s*)?(\d[\d,]*\.?\d{0,2})$/i;
    for (const l of lines) {
      if (/(รวม|total|สุทธิ|cash|เงินสด|change|ทอน|vat|ภ\.ษ\.|พิเศษ|svc)/i.test(l)) continue;
      const m = l.match(priceAtEnd);
      if (!m) continue;
      const name = m[1].trim();
      const qty = parseInt(m[2], 10);
      const price = num(m[3]);
      if (price <= 0 || name.length < 1) continue;
      // skip pure-number / phone-like
      if (/^[\d\s\-.]+$/.test(name)) continue;
      if (qty > 0 && qty <= 9999 && price < 1000000) {
        items.push({ name: name.slice(0, 60), qty: qty, price: price });
      }
    }
    return items.slice(0, 40);
  }

  /* ---------- Form rendering ---------- */
  function renderForm() {
    $("fStore").value = working.store || "";
    $("fDate").value = working.date || "";
    $("fTotal").value = working.total || "";
    $("fCategory").value = working.category || "อาหาร";
    $("fNote").value = working.note || "";
    const body = $("itemsBody");
    body.innerHTML = "";
    working.items.forEach((it) => addItemRow(it));
  }

  function addItemRow(it) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="i-name" value="${escapeAttr(it.name)}" placeholder="ชื่อรายการ" /></td>
      <td class="num"><input type="number" class="i-qty" min="1" value="${it.qty || 1}" /></td>
      <td class="num"><input type="number" class="i-price" min="0" step="0.01" value="${it.price || 0}" /></td>
      <td class="row-total">0.00</td>
      <td><button type="button" class="item-del" title="ลบรายการ">✕</button></td>`;
    $("itemsBody").appendChild(tr);
    const updateRow = () => {
      const q = num(tr.querySelector(".i-qty").value);
      const p = num(tr.querySelector(".i-price").value);
      tr.querySelector(".row-total").textContent = (q * p).toFixed(2);
    };
    tr.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", updateRow));
    tr.querySelector(".item-del").addEventListener("click", () => tr.remove());
    updateRow();
  }

  function collectForm() {
    const items = [];
    $("itemsBody").querySelectorAll("tr").forEach((tr) => {
      const name = tr.querySelector(".i-name").value.trim();
      const qty = num(tr.querySelector(".i-qty").value) || 1;
      const price = num(tr.querySelector(".i-price").value);
      if (name || price) items.push({ name, qty, price });
    });
    return {
      store: $("fStore").value.trim(),
      date: $("fDate").value.trim(),
      total: num($("fTotal").value),
      category: $("fCategory").value,
      note: $("fNote").value.trim(),
      items,
      rawText: $("rawText").value,
    };
  }

  function saveBill() {
    const f = collectForm();
    if (!f.store && !f.total && f.items.length === 0) {
      toast("ไม่มีข้อมูลให้บันทึก — ลองรัน OCR ก่อน");
      return;
    }
    const bill = {
      id: working.id || genId(),
      createdAt: working.createdAt || Date.now(),
      image: currentImage || working.image || null,
      fileName: currentFileName || working.fileName || "",
      ...f,
    };
    const idx = bills.findIndex((b) => b.id === bill.id);
    if (idx >= 0) bills[idx] = bill; else bills.unshift(bill);
    persist();
    toast(idx >= 0 ? "แก้ไขบิลแล้ว" : "บันทึกบิลแล้ว ✅");
    working = emptyBill();
    clearImage();
    switchTab("bills");
  }

  /* ---------- Bills list ---------- */
  $("searchInput").addEventListener("input", renderBills);
  $("filterCategory").addEventListener("change", renderBills);
  $("sortBy").addEventListener("change", renderBills);
  $("exportCsvBtn").addEventListener("click", exportCsv);
  $("exportJsonBtn").addEventListener("click", exportJson);
  $("clearAllBtn").addEventListener("click", confirmClearAll);

  function getFilteredBills() {
    const q = $("searchInput").value.trim().toLowerCase();
    const cat = $("filterCategory").value;
    let list = bills.filter((b) => {
      if (cat && b.category !== cat) return false;
      if (!q) return true;
      const hay = [b.store, b.note, (b.items || []).map((i) => i.name).join(" "), b.rawText]
        .join(" ").toLowerCase();
      return hay.includes(q);
    });
    const [field, dir] = $("sortBy").value.split("-");
    list.sort((a, b) => {
      let va, vb;
      if (field === "amount") { va = a.total; vb = b.total; }
      else if (field === "created") { va = a.createdAt; vb = b.createdAt; }
      else { va = parseDateVal(a.date); vb = parseDateVal(b.date); }
      return dir === "asc" ? va - vb : vb - va;
    });
    return list;
  }

  function renderBills() {
    const list = getFilteredBills();
    const wrap = $("billList");
    wrap.innerHTML = "";
    $("billsEmpty").hidden = list.length > 0;
    for (const b of list) wrap.appendChild(billCard(b));
  }

  function billCard(b) {
    const card = document.createElement("div");
    card.className = "bill-card";
    const total = (b.total || 0).toFixed(2);
    const itemsCount = (b.items || []).length;
    card.innerHTML = `
      ${b.image ? `<img src="${b.image}" alt="ใบเสร็จ" data-img="${b.id}" />` : ""}
      <div class="bill-store">${escapeHtml(b.store || "(ไม่ระบุร้าน)")}</div>
      <div class="bill-meta">
        <span>📅 ${escapeHtml(b.date || "—")}</span>
        <span class="bill-cat">${escapeHtml(b.category || "อื่นๆ")}</span>
      </div>
      <div class="bill-amount">฿${total}</div>
      <div class="bill-meta"><span>รายการ ${itemsCount} ชิ้น</span></div>
      ${b.note ? `<div class="bill-meta">📝 ${escapeHtml(b.note)}</div>` : ""}
      <div class="bill-actions">
        <button class="btn small" data-edit="${b.id}">✏️ แก้ไข</button>
        <button class="btn small danger" data-del="${b.id}">🗑 ลบ</button>
      </div>`;
    const img = card.querySelector("img");
    if (img) img.addEventListener("click", () => viewImage(b.image));
    card.querySelector("[data-edit]").addEventListener("click", () => editBill(b.id));
    card.querySelector("[data-del]").addEventListener("click", () => confirmDelete(b.id));
    return card;
  }

  function editBill(id) {
    const b = bills.find((x) => x.id === id);
    if (!b) return;
    working = { ...emptyBill(), ...b, items: (b.items || []).map((i) => ({ ...i })) };
    currentImage = b.image || null;
    currentFileName = b.fileName || "";
    if (currentImage) {
      $("previewImg").src = currentImage;
      $("previewWrap").hidden = false;
    }
    $("resultWrap").hidden = false;
    $("rawText").value = b.rawText || "";
    renderForm();
    switchTab("scan");
    $("resultWrap").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("กำลังแก้ไขบิล — กด บันทึก เพื่ออัปเดต");
  }

  function confirmDelete(id) {
    const b = bills.find((x) => x.id === id);
    if (!b) return;
    showModal(`ลบบิลนี้?`, `“${escapeHtml(b.store || "บิลไม่ระบุร้าน")}" ยอด ฿${(b.total||0).toFixed(2)} จะถูกลบถาวร`, () => {
      const i = bills.findIndex((x) => x.id === id);
      if (i >= 0) bills.splice(i, 1);
      persist();
      renderBills();
      renderStats();
      toast("ลบบิลแล้ว");
    });
  }

  function confirmClearAll() {
    if (!bills.length) { toast("ยังไม่มีบิลให้ล้าง"); return; }
    showModal("ล้างบิลทั้งหมด?", `จะลบบิล ${bills.length} รายการถาวร ไม่สามารถกู้คืนได้`, () => {
      bills.length = 0;
      persist();
      renderBills();
      renderStats();
      toast("ล้างบิลทั้งหมดแล้ว");
    });
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const total = bills.reduce((s, b) => s + (b.total || 0), 0);
    const count = bills.length;
    const avg = count ? total / count : 0;
    const byCat = {};
    bills.forEach((b) => {
      const c = b.category || "อื่นๆ";
      byCat[c] = (byCat[c] || 0) + (b.total || 0);
    });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const maxCat = topCat ? topCat[1] : 0;

    const cards = $("statsCards");
    cards.innerHTML = `
      ${statCard("จำนวนบิล", count + " ใบ")}
      ${statCard("ยอมรวมทั้งหมด", "฿" + total.toFixed(2))}
      ${statCard("ยอดเฉลี่ยต่อบิล", "฿" + avg.toFixed(2))}
      ${statCard("หมวดที่ใช้จ่ายมากสุด", topCat ? topCat[0] : "—")}`;

    const bars = $("categoryBars");
    bars.innerHTML = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amt]) => `
        <div class="cat-bar">
          <span class="name">${escapeHtml(name)}</span>
          <span class="track"><span class="fill" style="width:${maxCat ? (amt / maxCat * 100) : 0}%"></span></span>
          <span class="amt">฿${amt.toFixed(2)}</span>
        </div>`).join("") || `<p class="empty-hint">ยังไม่มีข้อมูล</p>`;

    const recent = [...bills].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    $("recentList").innerHTML = recent.map((b) => `
      <div class="recent-row">
        <div><div>${escapeHtml(b.store || "(ไม่ระบุร้าน)")}</div><div class="muted">${escapeHtml(b.date || "—")} • ${escapeHtml(b.category || "อื่นๆ")}</div></div>
        <div class="bill-amount" style="font-size:1rem">฿${(b.total||0).toFixed(2)}</div>
      </div>`).join("") || `<p class="empty-hint">ยังไม่มีข้อมูล</p>`;
  }

  function statCard(label, value) {
    return `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  }

  /* ---------- Export ---------- */
  function exportCsv() {
    if (!bills.length) { toast("ยังไม่มีบิลให้ export"); return; }
    const rows = [["id", "createdAt", "date", "store", "category", "total", "note", "items"]];
    bills.forEach((b) => {
      const items = (b.items || []).map((i) => `${i.qty}x ${i.name}@${i.price}`).join(" | ");
      rows.push([
        b.id, new Date(b.createdAt).toISOString(), b.date || "", b.store || "",
        b.category || "", (b.total || 0).toFixed(2), b.note || "", items,
      ]);
    });
    download("bills.csv", csvEscape(rows), "text/csv;charset=utf-8");
    toast("ส่งออก CSV แล้ว");
  }

  function exportJson() {
    if (!bills.length) { toast("ยังไม่มีบิลให้ export"); return; }
    download("bills.json", JSON.stringify(bills, null, 2), "application/json");
    toast("ส่งออก JSON แล้ว");
  }

  function csvEscape(rows) {
    return rows.map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
  }

  function download(name, content, type) {
    const blob = new Blob(["﻿" + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Image viewer ---------- */
  function viewImage(src) {
    if (!src) return;
    const v = document.createElement("div");
    v.className = "viewer";
    v.innerHTML = `<img src="${src}" alt="ใบเสร็จขยาย" />`;
    v.addEventListener("click", () => v.remove());
    document.body.appendChild(v);
  }

  /* ---------- Modal & toast ---------- */
  let modalConfirmCb = null;
  $("modalConfirm").addEventListener("click", () => {
    if (modalConfirmCb) modalConfirmCb();
    hideModal();
  });
  $("modalCancel").addEventListener("click", hideModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") hideModal(); });

  function showModal(title, bodyHtml, onConfirm) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = bodyHtml;
    modalConfirmCb = onConfirm;
    $("modal").hidden = false;
  }
  function hideModal() { $("modal").hidden = true; modalConfirmCb = null; }

  let toastTimer = null;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2400);
  }

  /* ---------- Persistence ---------- */
  function loadBills() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("load bills failed", e);
      return [];
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    } catch (e) {
      console.warn("persist failed", e);
      toast("บันทึกไม่ได้ — อาจเกินโควต้า localStorage (รูปใบเสร็จใหญ่เกินไป)");
    }
  }

  /* ---------- Utils ---------- */
  function emptyBill() {
    return { id: "", createdAt: 0, image: null, fileName: "", store: "", date: "", total: 0, category: "อาหาร", note: "", items: [], rawText: "" };
  }
  function genId() {
    return "b_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }
  function parseDateVal(s) {
    if (!s) return 0;
    const m = s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (!m) return 0;
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    if (Number(y) > 2500) y = String(Number(y) - 543);
    return new Date(Number(y), Number(mo) - 1, Number(d)).getTime() || 0;
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  /* ---------- Init ---------- */
  renderBills();
  renderStats();
})();