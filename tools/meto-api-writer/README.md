# meto-api-writer — ให้ Opus/Sonnet ผ่าน API เขียนงานออกแบบ METO

ทำ 2 พ.ย. 2569 ตามคำเจ้าของ: "แต่เราต้องแก้เครื่องมือเป็นของเรา อันนี้คุณเขียนเองก่อนได้เลย" (ดัดแปลงจาก `L:\ModSTD\tools\api-reviewer`)

ต่างจากตัวตรวจของ ModSTD:
- เป็น **ผู้เขียน** ไม่ใช่ผู้ตรวจ: เขียน/แก้ไฟล์ได้ทุกไฟล์ **ภายใน `--out-dir` เท่านั้น** (hook บล็อกทุก path นอกโฟลเดอร์)
- `--allow-openscad` (ไม่บังคับ): ให้รัน OpenSCAD export ได้ทีละคำสั่ง ต้องเป็น `openscad.com` และไฟล์ `-o` อยู่ใน `--out-dir` · ห้ามต่อท่อ/คำสั่งซ้อน (`; & | > <` ฯลฯ)
- **ต้องใส่ `--fire` ถึงจะเรียก API** — ใส่หลังเจ้าของพิมพ์ "ยิง" เท่านั้น (ไม่ใส่ = ตรวจอาร์กิวเมนต์แล้วจบ ไม่เสียเครดิต)
- ใช้ Python/venv ของ `L:\ModSTD\tools\api-reviewer\.venv` (มี claude-agent-sdk แล้ว) ไม่สร้าง venv ใน Google Drive
- API key อ่านจากตัวแปร `ANTHROPIC_API_KEY` ที่เจ้าของตั้งไว้เอง ห้ามใส่คีย์ในไฟล์

## เรียกใช้
```powershell
& "G:\My Drive\METTO\Code\RoboBlock\tools\meto-api-writer\run-writer.ps1" `
  --brief "<ใบสั่งงาน.md>" --out-dir "<โฟลเดอร์ผล>" --max-budget-usd 3 --allow-openscad --fire
```
ค่าเริ่ม: `claude-opus-5-5`, effort `high`, งบ $3 ต่อครั้ง · ตัวเลือกประหยัด `--model claude-sonnet-5-5` · `--cwd` ค่าเริ่ม = โฟลเดอร์ของใบสั่งงาน (คัดลอกไฟล์อ้างอิงไว้ข้างใบ)

หลังจบ: แสดงค่าใช้จ่าย/token/เวลา, เขียน `_คำตอบสุดท้าย.md` ในโฟลเดอร์ผล, ต่อแถวใน `usage-log.csv`

## ทดสอบ hook (ไม่เรียก API)
```powershell
& "G:\My Drive\METTO\Code\RoboBlock\tools\meto-api-writer\run-writer.ps1" --self-test-hooks
```
ผล 2 พ.ย.: `HOOK SELF-TEST: PASS` (9 กรณี + กรณีไม่เปิด OpenSCAD)
