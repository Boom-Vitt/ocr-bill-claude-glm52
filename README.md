<!-- BBN:HEADER:START -->
<div align="center">

<img src=".github/brand/banner.svg" width="100%" alt="OCR Bill Manager · Claude — In-browser receipt OCR with Tesseract.js, no backend" />

<a href="https://github.com/Boom-Vitt/ocr-bill-claude-glm52/stargazers"><img src="https://img.shields.io/github/stars/Boom-Vitt/ocr-bill-claude-glm52?style=flat-square&color=14b8a6&labelColor=0b1220" alt="stars" /></a>
<a href="https://github.com/Boom-Vitt/ocr-bill-claude-glm52/commits/main"><img src="https://img.shields.io/github/last-commit/Boom-Vitt/ocr-bill-claude-glm52?style=flat-square&color=14b8a6&labelColor=0b1220" alt="last commit" /></a>
<a href="https://github.com/Boom-Vitt"><img src="https://img.shields.io/badge/by-BoomBigNose-14b8a6?style=flat-square&labelColor=0b1220" alt="by BoomBigNose" /></a>

</div>
<!-- BBN:HEADER:END -->

# 🧾 ocr-bill-claude-glm52

เว็บแอปจัดการบิลเงินด้วย **OCR** — ถ่าย/อัปโหลดใบเสร็จแล้วระบบอ่านตัวหนังสือออกมาเป็นข้อความ พร้อมแยก ร้าน / วันที่ / ยอดรวม / รายการสินค้า อัตโนมัติ

รัน OCR ในเบราว์เซอร์ล้วน ๆ ด้วย [Tesseract.js](https://tesseract.projectnaptha.com/) — **ไม่มี backend, รูปไม่ออกจากเครื่อง** ข้อมูลเก็บใน localStorage

## ✨ ความสามารถ
- 📷 สแกนบิล: ลากไฟล์ / เลือกไฟล์ / ถ่ายจากกล้อง → รัน OCR (รองรับ ไทย + อังกฤษ) แสดงความคืบหน้าแบบเรียลไทม์
- 🧾 แยกข้อมูลอัตโนมัติ: ร้าน, วันที่ (รองรับ พ.ศ.→ค.ศ.), ยอดรวม, รายการสินค้า — แก้ไขได้ทุกช่อง
- 📚 ประวัติบิล: ค้นหา / กรองหมวด / เรียงลำดับ / แก้ไข / ลบ / ดูรูปขยาย
- 📊 สรุป: จำนวน, ยอดรวม, เฉลี่ย, หมวดที่ใช้จ่ายมากสุด + แท่งเปรียบเทียบ
- ⬇️ Export CSV / JSON
- 💾 เก็บใน localStorage (ออฟไลน์ได้หลังโหลด Tesseract ครั้งแรก)

## 🚀 วิธีใช้
เปิด `index.html` ในเบราว์เซอร์ หรือใช้เวอร์ชันออนไลน์ผ่าน GitHub Pages ของ repo นี้ได้เลย

1. แท็บ **สแกนบิล** → อัปโหลดใบเสร็จ
2. กด **รัน OCR** → รออ่านตัวหนังสือ
3. ตรวจ/แก้ข้อมูลที่แยกได้
4. กด **บันทึกบิล** → ดูในแท็บ **ประวัติบิล** และ **สรุป**

## 🛠 เทคโนโลยี
- HTML / CSS / Vanilla JavaScript
- [Tesseract.js](https://cdn.jsdelivr.net/npm/tesseract.js@5) (OCR ในเบราว์เซอร์)
- localStorage (เก็บบิล)

## 📂 โครงสร้าง
```
index.html   # หน้าเว็บ (3 แท็บ)
styles.css   # ดาร์กธีม UI
app.js        # ตรรกะ OCR + parse + จัดการบิล
```

---
ocr-bill-claude-glm52 • ข้อมูลเก็บในเครื่องของคุณเท่านั้น

<!-- BBN:FOOTER:START -->
---

<div align="center">

**สร้างโดย [BoomBigNose](https://github.com/Boom-Vitt)** · [Kruoop.com](https://kruoop.com) แหล่งเรียน AI + คอมมูนิตี้ · [Seeneo.ai](https://seeneo.ai) · [YouTube 220K](https://www.youtube.com/@BoomBigNose)

<sub>ถ้าโปรเจกต์นี้มีประโยชน์ กด ⭐ ให้กำลังใจกันได้เลย</sub>

</div>
<!-- BBN:FOOTER:END -->
