import json
from pathlib import Path

from docx import Document

INPUT = Path("data/admission-plans/shandong-2026/undergraduate-plan-supplement.docx")
OUTPUT = Path("data/admission-plans/shandong-2026/undergraduate-plan-supplement.json")

doc = Document(str(INPUT))
records = []
for table in doc.tables:
    headers = [cell.text.strip().replace("\n", "") for cell in table.rows[0].cells]
    for row in table.rows[1:]:
        values = [cell.text.strip().replace("\n", "") for cell in row.cells]
        item = dict(zip(headers, values))
        records.append(
            {
                "year": 2026,
                "province": "山东",
                "sourceType": "supplement",
                "category": item.get("科类", ""),
                "batch": item.get("批次", ""),
                "schoolCode": item.get("院校代号", ""),
                "schoolName": item.get("院校名称", ""),
                "level": item.get("层次", ""),
                "majorCode": item.get("专业代号", ""),
                "majorName": item.get("专业名称", ""),
                "change": item.get("主要内容", ""),
                "sourceUrl": "https://www.sdzk.cn/NewsInfo.aspx?NewsID=7268",
                "sourceFile": str(INPUT),
            }
        )

OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(records)} supplement records to {OUTPUT}")
