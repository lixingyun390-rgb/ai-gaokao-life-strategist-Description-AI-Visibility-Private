import json
import re
from pathlib import Path

import pdfplumber

ROOT = Path("data/admission-plans/fujian-2026/physics")
OUTPUT = Path("data/admission-plans/fujian-2026/physics-undergraduate-batch.json")

WATERMARK_CHARS = {"福", "建", "省", "教", "育", "考", "试", "院"}


def clean(value):
    text = "" if value is None else str(value)
    text = text.replace("\u3000", " ")
    text = re.sub(r"[ ]+", " ", text)
    return text.strip()


def clean_major_name(value):
    text = clean(value)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    kept = []
    for line in lines:
        if line.startswith(":") or "专业组" in line:
            continue
        if len(line) == 1 and line in WATERMARK_CHARS:
            continue
        kept.append(line)
    return [re.sub(r"^[福建省教育考试院]+", "", line).strip() for line in kept if line.strip()]


def split_lines(value):
    return [clean(line) for line in clean(value).splitlines() if clean(line)]


def only_numbers(lines):
    return [item for item in lines if re.fullmatch(r"\d+", item)]


def extract_group(value):
    text = clean(value)
    match = re.search(r":\s*(\d{3})", text)
    if match:
        return match.group(1)
    match = re.search(r"专业组\s*(.+)", text)
    return match.group(1).strip() if match else ""


def looks_like_school(value):
    text = clean(value)
    return bool(re.search(r"(大学|学院|职业技术大学|职业学院|高等专科学校)", text))


def extract_school(value):
    text = clean(value)
    text = text.split("招生章程网址")[0]
    text = re.sub(r"^\d{3}\s+\d+\s+\d+\s*", "", text)
    line = next((line for line in text.splitlines() if looks_like_school(line)), "")
    if not line:
        return "", "", ""
    city_match = re.search(r"\s([^\s()（）]{2,8}市)\s", f" {line} ")
    school = re.split(r"\s+\d+\s+", line)[0].strip()
    nature = "公办" if "公办" in line else "民办" if "民办" in line else ""
    return school, city_match.group(1) if city_match else "", nature


def parse_pdf(pdf_path):
    records = []
    current_school = ""
    current_city = ""
    current_nature = ""
    current_group = ""

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables() or []:
                for row in table:
                    cells = row + [None] * (7 - len(row))
                    school_cell = clean(cells[0])
                    if looks_like_school(school_cell):
                        school, city, nature = extract_school(school_cell)
                        current_school = school or current_school
                        current_city = city or current_city
                        current_nature = nature or current_nature

                    group = extract_group(" ".join(clean(cell) for cell in cells[:3]))
                    if group:
                        current_group = group

                    school_code = clean(cells[0])
                    if not re.fullmatch(r"\d{4}", school_code):
                        continue

                    codes = only_numbers(split_lines(cells[1]))
                    names = clean_major_name(cells[2])
                    durations = split_lines(cells[3])
                    plans = only_numbers(split_lines(cells[4]))
                    tuition = only_numbers(split_lines(cells[5]))
                    remark = clean(cells[6])

                    if len(plans) == len(codes) + 1:
                        plans = plans[1:]
                    if len(names) > len(codes):
                        names = names[: len(codes)]
                    if len(durations) > len(codes):
                        durations = durations[-len(codes):]
                    if len(tuition) > len(codes):
                        tuition = tuition[-len(codes):]

                    if not current_school or not codes:
                        continue

                    confidence = "high" if len(codes) == len(names) == len(plans) else "needs_review"
                    for index, code in enumerate(codes):
                        records.append(
                            {
                                "year": 2026,
                                "province": "福建",
                                "batch": "本科批",
                                "candidateTrack": "general",
                                "subjectGroup": "物理科目组",
                                "schoolCode": school_code,
                                "schoolName": current_school,
                                "city": current_city,
                                "schoolNature": current_nature,
                                "collegeGroup": current_group,
                                "majorCode": code,
                                "majorName": names[index] if index < len(names) else "",
                                "planCount": int(plans[index]) if index < len(plans) else None,
                                "tuition": tuition[index] if index < len(tuition) else "",
                                "duration": durations[index] if index < len(durations) else "",
                                "campus": "",
                                "requirement": remark,
                                "sourceUrl": "http://www.eeafj.cn/gkptgkgsgg/20260624/14715.html",
                                "sourceFile": str(pdf_path),
                                "page": page_number,
                                "confidence": confidence,
                            }
                        )
    return records


pdf = next(ROOT.glob("4*.pdf"))
records = parse_pdf(pdf)
OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(records)} records to {OUTPUT}")
print(f"High confidence: {sum(1 for item in records if item['confidence'] == 'high')}")
