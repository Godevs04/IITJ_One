"""
Builds the raw (Layer 1) academic-calendar source file from the authoritative PDF.

    python apps/api/scripts/academic-calendar/extract_source.py

Input : docs/calender/Academic-Calendar-AY-2026-27-639178076336417495.pdf  (IIT Jodhpur, 2026-10-01)
Output: apps/api/data/academic-calendar/2026-27.source.json

See docs/calender/ACADEMIC_CALENDAR_IMPLEMENTATION_PLAN.md §8.2. The output is a lossless, verbatim
transcription — no dates are parsed or corrected here. Parts B, D, E and F are read from the PDF's
tables; Part A (summary table, pp.1-2) has an interleaved multi-line layout that table extraction
cannot split reliably, so it is transcribed below by hand from the rendered pages. EVERY activity and
cell string — hand-transcribed or extracted — is then verified against the PDF's own text layer and
the script exits non-zero on any mismatch.

Dev-only tooling: requires `pip install pdfplumber`. The JSON it writes is committed and reviewed;
the app and API never run this script.
"""
import json
import logging
import re
import sys
from pathlib import Path

import pdfplumber

logging.disable(logging.CRITICAL)  # pdfminer prints harmless colour-space warnings for the logo

ROOT = Path(__file__).resolve().parents[4]
PDF = ROOT / 'docs/calender/Academic-Calendar-AY-2026-27-639178076336417495.pdf'
OUT = ROOT / 'apps/api/data/academic-calendar/2026-27.source.json'

BULLET = ''


def clean(text):
    """Collapse PDF line wraps to single spaces; bullets become ' · '. Wording is otherwise untouched."""
    if text is None:
        return ''
    # A line ending in '-' is a wrapped token ("Mon-\nSun", "2026-\n27)"): rejoin it without a space.
    # Hyphens followed by a space on the SAME line ("30 Oct- 1 Nov", "12- 14 March") are kept as printed.
    text = re.sub(r'-[ \t]*\n[ \t]*', '-', text)
    text = text.replace(BULLET, '\n' + BULLET)
    parts = [re.sub(r'\s+', ' ', p).strip() for p in text.split(BULLET)]
    parts = [p for p in parts if p]
    return ' · '.join(parts)


def cell(text, kind=None, merged_span=None):
    text = clean(text)
    if kind is None:
        if text == '':
            kind = 'blank'
        elif text in ('NA', 'N/A'):
            kind = 'NA'
        else:
            kind = 'date'
    c = {'text': text, 'kind': kind}
    if merged_span:
        c['mergedSpan'] = merged_span
    return c


# ---------------------------------------------------------------------------
# Part A — hand transcription (pages 1-2). Verified against the text layer below.
# ---------------------------------------------------------------------------
REG_SPAN = [f'A-reg-{i}' for i in range(1, 9)]
CLS_SPAN = [f'A-cls-{i}' for i in range(1, 5)]
ADD_DROP_SPAN = ['A-cls-6', 'A-cls-7']

PART_A = [
    # (ref, sectionTitle, page, activity, sem1, sem2, summer-cell-or-None, footnotes)
    ('A-reg-1', 'Registration', 1, 'All continuing Students (Online registration)', '20-23 July 2026, Mon-Thu', '15-17 December 2026, Tue-Thu', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-2', 'Registration', 1, 'Physical reporting of continuing students', '29 July 2026, Wed', '31 December 2026, Thu', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-3', 'Registration', 1, 'Physical reporting and document verification of New PG students', '21-24 July 2026, Tue-Fri', '31 December 2026, Thu', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-4', 'Registration', 1, 'Orientation for New PG Students', '24 July 2026, Fri', '4 January 2027, Mon', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-5', 'Registration', 1, 'Course Registration of New PG Students', '24-28 July 2026, Fri-Tue', '1 January 2027, Fri', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-6', 'Registration', 1, 'Physical reporting and document verification of New UG Students', '27-29 July 2026, Mon-Wed', 'N/A', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-7', 'Registration', 1, 'Orientation for New UG Students', '29 July 2026, Wed', 'N/A', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-reg-8', 'Registration', 1, 'Course Registration of New UG Students', '29-30 July 2026, Wed -Thu', 'N/A', ('03-10 May 2027, Mon-Mon', REG_SPAN), None),
    ('A-cls-1', 'Classes Commencement', 1, 'Classes Commencement', '30 July 2026, Thu', '4 January 2027, Mon', ('10 May, 2027 Mon', CLS_SPAN), None),
    ('A-cls-2', 'Classes Commencement', 1, 'First-Course Handout (including evaluation scheme) to the existing students', '31 July 2026, Fri', '5 January 2027, Tue', ('10 May, 2027 Mon', CLS_SPAN), None),
    ('A-cls-3', 'Classes Commencement', 1, 'Class commencement for first year UG students', '05 August 2026, Wed', '4 January 2027, Mon', ('10 May, 2027 Mon', CLS_SPAN), None),
    ('A-cls-4', 'Classes Commencement', 1, 'First-Course Handout (including evaluation scheme) to UG first year students', '05 August 2026, Wed', '5 January 2027, Tue', ('10 May, 2027 Mon', CLS_SPAN), None),
    ('A-cls-5', 'Classes Commencement', 1, 'Late Registration', '7 August 2026, Fri', '7 Jan 2027, Thu', ('12 May, 2027 Wed', None), None),
    ('A-cls-6', 'Classes Commencement', 1, 'Last date of Add/Drop of Courses including Design Credits · Last date of RKA request · Last date for Registration to be approved by the Faculty Advisors', '7 August 2026, Fri', '07 January 2027, Thu', ('12 May, 2027 Wed', ADD_DROP_SPAN), None),
    ('A-cls-7', 'Classes Commencement', 1, 'Course withdrawal from the instructors and adding courses in lieu of dropped courses', '10 August 2026, Mon', '08 January 2027, Fri', ('12 May, 2027 Wed', ADD_DROP_SPAN), None),
    ('A-exm-1', 'Examinations and Grade Submission', 2, 'Last date to conduct I, X and E to D grade Examination', '5-7 August 2026, Wed-Fri (For 2nd Semester/ Summer Term of AY 2025-26)', '04-06 January 2027, Mon-Wed (For 1st Semester of AY 2026-27)', ('4-6 August 2027, Wed-Fri', None), None),
    ('A-exm-2', 'Examinations and Grade Submission', 2, 'Online Grade submission for I, X and E to D grade Examinations', '11 August 2026, Tue (For 2nd Semester / Summer Term of AY 2025-26)', '08 January 2027, Fri (For 1st Semester of AY 2026-27)', ('09 August 2027, Mon', None), None),
    ('A-exm-3', 'Examinations and Grade Submission', 2, 'Minor Examination', '15-20 September 2026, Tue-Sun', '16-21 February 2027, Tue-Sun', ('04-06 June 2027, Fri-Sun', None), None),
    ('A-exm-4', 'Examinations and Grade Submission', 2, 'MAJOR Examination (Fractal 3 and M.Tech. working professional)', '19-26 November 2026, Thu-Thu', '22-29 April 2027, Thu-Thu', ('10-13 July 2027, Sat-Tue', None), None),
    ('A-exm-5', 'Examinations and Grade Submission', 2, 'Last date of submission of online grades', '30 November 2026, Mon', '3 May 2027, Mon', ('19 July 2027, Mon', None), None),
    ('A-exm-6', 'Examinations and Grade Submission', 2, 'Moderation Committee Meeting', '1 December 2026, Tue', '5 May 2027, Wed', ('20 July 2027, Tue', None), None),
    ('A-exm-7', 'Examinations and Grade Submission', 2, 'Last Date for display of Grades for Courses, Projects and Thesis; Last date of submission of hard copies of grades', '3 December 2026, Thu', '6 May 2027, Thu', ('23 July 2027, Fri', None), ['** For First year students; grades will be displayed when all courses were approved.']),
    ('A-pre-1', 'Pre-registration', 2, 'Pre-registration for next semester', '3-6 November 2026, Tue-Fri', '5-7 April 2027, Mon-Wed', None, None),
    ('A-vac-1', 'Vacation (Only for UG students)', 2, 'Semester Break', '2-8 November 2026, Mon-Sun', '20-28 March 2027, Sat-Sun', None, None),
    ('A-vac-2', 'Vacation (Only for UG students)', 2, 'Winter/ Summer Break', '2 - 30 December 2026, Wed-Wed', '03 May-29 July 2027, Mon-Thu', None, None),
]

PART_A_NOTES = [
    ('A-note-1', 2, 'If the Government of India announces any additional Holiday on a working day, the buffer days of 18 November 2026 for Semester I and 21 April 2027 for Semester II will be observed as a working day.'),
    ('A-note-2', 2, 'Lectures on the following days will be held with the schedule of the days mentioned against them:'),
    ('A-note-3', 3, 'If the requisite number of lectures cannot be scheduled, the instructor(s) may, in consultation with the students in their respective courses, decide on a schedule of extra classes. A regular course has engagement of 13 lectures (one lecture of 50 minutes) per one credit.'),
    ('A-note-4', 3, 'There will be no extra classes on Gazetted Holidays.'),
    ('A-note-5', 3, 'Saturdays and Sundays falling within the examination period will be used for scheduling examinations. Under extraordinary circumstances, examinations of some of the courses may be scheduled on the days preceding the mid-semester/end semester examinations.'),
    ('A-note-6', 3, '**All faculty members need to necessarily report to the Institute before the date of physical reporting of continuing students, as specified in the academic calendar.'),
]


def part_a_entries():
    entries = []
    for ref, section, page, activity, s1, s2, summer, footnotes in PART_A:
        cells = {'sem1': cell(s1), 'sem2': cell(s2)}
        if summer is None:
            cells['summer'] = cell('')
        else:
            text, span = summer
            cells['summer'] = cell(text, kind='merged' if span else None, merged_span=span)
        e = {
            'sourceRef': ref, 'part': 'A',
            'sectionTitle': f'Academic Calendar: Academic Year 2026-27 — {section}',
            'page': page, 'activityText': activity, 'cells': cells,
        }
        if footnotes:
            e['footnotes'] = footnotes
        entries.append(e)
    return entries


# ---------------------------------------------------------------------------
# Parts B, D, E, F — extracted from the PDF tables
# ---------------------------------------------------------------------------
def part_d(pdf):
    """
    Geometry-based: pdfplumber's row splitting puts a multi-line row's first lines on sub-rows ABOVE the
    vertically-centred S.N., which attaches them to the previous activity, and the ruling lines include
    in-cell artefacts. What is reliable is the S.N. column's cell rectangles: they tile the column top to
    bottom, one per printed row. Each row is cut out between consecutive tiles and every word is assigned
    to the row containing its vertical centre (so no word can land in two rows).
    """
    entries, current = [], None
    for page_index in range(3, 9):  # pages 4-9
        page_no = page_index + 1
        page = pdf.pages[page_index]
        table = page.find_tables()[0]
        cols = next(r.cells for r in table.rows if all(c is not None for c in r.cells))
        xs = [(c[0], c[2]) for c in cols]
        sn_x0, sn_x1 = xs[0]
        rects = [r for r in page.rects
                 if r['x0'] <= sn_x0 + 3 and r['x1'] >= sn_x1 - 3 and r['bottom'] - r['top'] > 3]
        bands, cursor = [], table.bbox[1]
        while True:
            nxt = [r for r in rects if abs(r['top'] - cursor) <= 2.5]
            if not nxt:
                break
            tile = max(nxt, key=lambda r: r['bottom'] - r['top'])
            bands.append((tile['top'], tile['bottom']))
            cursor = tile['bottom']
        if not bands or bands[-1][1] < table.bbox[3] - 3:
            sys.exit(f'Part D page {page_no}: S.N. column tiling incomplete ({bands[-1] if bands else None} vs table bottom {table.bbox[3]:.0f})')
        for y0, y1 in bands:
            texts = []
            for x0, x1 in xs:
                # Character-level, centre-based: a glyph belongs to exactly one cell, and a word that
                # visually touches a column rule cannot fuse with text from the neighbouring cell.
                region = page.filter(lambda o, x0=x0, x1=x1, y0=y0, y1=y1: o.get('object_type') == 'char'
                                     and x0 <= (o['x0'] + o['x1']) / 2 < x1
                                     and y0 <= (o['top'] + o['bottom']) / 2 < y1)
                texts.append(region.extract_text() or '')
            sn = texts[0].strip().rstrip('.')
            if sn == 'S.N':
                continue
            if sn.isdigit():
                current = {'row': int(sn), 'page': page_no, 'parts': [[], [], [], []]}
                entries.append(current)
            elif current is None or not any(t.strip() for t in texts[1:]):
                continue
            for i in range(4):
                if texts[i + 1].strip():
                    current['parts'][i].append(texts[i + 1])
            if page_no != current['page']:
                current['pageEnd'] = page_no
    out = []
    for e in entries:
        activity, s1, s2, summer = ('\n'.join(p) for p in e['parts'])
        item = {
            'sourceRef': f"D-{e['row']}", 'part': 'D',
            'sectionTitle': 'Comprehensive Academic Calendar: Academic Year 2026-27',
            'page': e['page'], 'row': e['row'], 'activityText': clean(activity),
            'cells': {'sem1': cell(s1), 'sem2': cell(s2), 'summer': cell(summer)},
        }
        if 'pageEnd' in e:
            item['pageEnd'] = e['pageEnd']
        out.append(item)
    if [e['row'] for e in out] != list(range(1, 94)):
        sys.exit(f"Part D: expected rows 1..93, got {[e['row'] for e in out]}")
    return out


# Part E — the Fractals table (p.9) wraps each row over several extracted lines with no reliable row
# separator, so it is transcribed by hand like Part A and verified against the text layer the same way.
PART_E = [
    ('Fractal 1 withdrawal and addition of Fractal 2', '31 August 2026, Mon', '3 February 2027, Wed', '28 May 2027, Fri'),
    ('Fractal 2 begins', '1 September 2026, Tue', '4 February 2027, Thu', '31 May 2027, Mon'),
    ('Last date of course withdrawal request', '12 October 2026, Mon', '15 March 2027, Mon', ''),
    ('Display of minor answer sheets and scores by the instructors', '7 October 2026, Wed', '25 February 2027, Thu', '17 June 2027, Thu'),
    ('Fractal 2 withdrawal and addition of Fractal 3', '7 October 2026, Wed', '11 March 2027, Thu', '18 June 2027, Fri'),
    ('Fractal 3 begins', '9 October 2026, Fri', '12 March 2027, Fri', '21 June 2027, Mon'),
    ('Fractal 3 Withdrawal, Last Day of classes, Online Attendance submission on ERP, Display of all Marks for pre major evaluation components;', '17 November 2026, Tue', '20 April 2027, Tue', '09 July 2027, Fri'),
]


def part_e(_pdf):
    return [{
        'sourceRef': f'E-{n}', 'part': 'E', 'sectionTitle': 'Fractals', 'page': 9,  # unnumbered table: n = printed position
        'activityText': activity,
        'cells': {'sem1': cell(s1), 'sem2': cell(s2), 'summer': cell(summer)},
    } for n, (activity, s1, s2, summer) in enumerate(PART_E, start=1)]


def part_f(pdf):
    out = []
    for page_index in (8, 9):
        for table in pdf.pages[page_index].extract_tables():
            for row in table:
                row = [(c or '').strip() for c in row]
                if len(row) == 4 and row[0].isdigit():
                    n = int(row[0])
                    out.append({
                        'sourceRef': f'F-{n}', 'part': 'F', 'sectionTitle': 'List of holidays',
                        'page': page_index + 1, 'row': n, 'activityText': clean(row[3]),
                        'cells': {'date': cell(row[1]), 'day': cell(row[2], kind='date')},
                        **({'marker': '*'} if row[3].endswith('*') else {}),
                    })
    if [e['row'] for e in out] != list(range(1, 18)):
        sys.exit(f"Part F: expected S. No. 1..17, got {[e['row'] for e in out]}")
    return out


def part_b(pdf):
    sections = {
        'Time Table Adjustment Sem I': 'B-sem1',
        'Time Table Adjustment Sem I for UG first year students only': 'B-ug1',
        'Time Table Adjustment Sem II': 'B-sem2',
    }
    out, current, counts = [], None, {}
    for page_index in (1, 2):
        for table in pdf.pages[page_index].extract_tables():
            for row in table:
                row = [(c or '').strip() for c in row]
                if len(row) != 2:
                    break
                if row[0] in sections and not row[1]:
                    current = row[0]
                    continue
                if current is None or row[0] == 'Schedule' or not row[1]:
                    continue
                prefix = sections[current]
                counts[prefix] = counts.get(prefix, 0) + 1
                out.append({
                    'sourceRef': f'{prefix}-{counts[prefix]}', 'part': 'B', 'sectionTitle': current,
                    'page': page_index + 1, 'activityText': clean(row[0]),
                    'cells': {'date': cell(row[1])},
                })
    if counts != {'B-sem1': 5, 'B-ug1': 4, 'B-sem2': 3}:
        sys.exit(f'Part B: unexpected row counts {counts}')
    return out


# ---------------------------------------------------------------------------
# Verification against the PDF text layer
# ---------------------------------------------------------------------------
def words(text):
    return re.findall(r"[A-Za-z0-9]+", text.replace(BULLET, ' ').replace('’', "'"))


def appears_in_order(needle, haystack):
    """Every word of `needle`, in order (gaps allowed — PDF columns interleave line by line)."""
    it = iter(haystack)
    return all(any(w == h for h in it) for w in needle)


def verify(entries, pdf):
    page_words = {i + 1: words(p.extract_text() or '') for i, p in enumerate(pdf.pages)}
    problems = []
    for e in entries:
        pages = range(e['page'], e.get('pageEnd', e['page']) + 1)
        hay = [w for p in pages for w in page_words[p]]
        texts = [('activity', e['activityText'])] + [(k, c['text']) for k, c in e['cells'].items() if c['text']]
        for label, text in texts:
            if not appears_in_order(words(text), hay):
                problems.append(f"{e['sourceRef']} {label}: {text!r} not found in PDF text on page(s) {list(pages)}")
    return problems


def main():
    pdf = pdfplumber.open(PDF)
    meta = pdf.metadata
    entries = part_a_entries() + part_b(pdf) + part_d(pdf) + part_e(pdf) + part_f(pdf)
    notes = [{'sourceRef': r, 'part': 'A', 'page': p, 'text': t} for r, p, t in PART_A_NOTES]
    problems = verify(entries, pdf) + verify(
        [{'sourceRef': n['sourceRef'], 'page': n['page'], 'activityText': n['text'], 'cells': {}} for n in notes], pdf)
    if problems:
        print('\n'.join(problems))
        sys.exit(f'{len(problems)} source string(s) do not match the PDF — refusing to write output.')

    doc = {
        'source': {
            'file': PDF.name,
            'title': 'Academic Calendar: Academic Year 2026-27',
            'publisher': 'Indian Institute of Technology Jodhpur, Office of Academic Affairs',
            'pages': len(pdf.pages),
            'pdfCreationDate': meta.get('CreationDate'),
            'documentDate': '2026-10-01',
        },
        'holidayListNotes': [
            {'page': 9, 'text': 'List of holidays will be added as the institute holiday approved.'},
            {'page': 10, 'text': '*May be changed, subject to any further order of Central/State Government'},
            {'page': 10, 'text': 'List of holidays for Semester-II, AY 2026-27 are yet to be declared. The tentative holidays for Semester-II, AY 2026-27 are taken into consideration, which will be updated as and when notified by the Institute.'},
        ],
        'notes': notes,
        'teachingDays': {
            'page': 3,
            'rows': [['Mondays', 13, 14], ['Tuesdays', 13, 13], ['Wednesdays', 13, 13], ['Thursdays', 14, 13], ['Fridays', 13, 13]],
            'total': [66, 66],
        },
        'entries': entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {}
    for e in entries:
        counts[e['part']] = counts.get(e['part'], 0) + 1
    print(f'Wrote {OUT.relative_to(ROOT)}: {len(entries)} entries {counts}, {len(notes)} notes; all strings verified against the PDF.')


if __name__ == '__main__':
    main()
