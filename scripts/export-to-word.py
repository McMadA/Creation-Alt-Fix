#!/usr/bin/env python3
"""
Creation+Alt+Fix Official Word (.docx) Document Generator
Converts official Markdown files into executive Microsoft Word documents
styled 1:1 like the Creation+Alt+Fix invoice template (factuursjabloon.html).

Features:
- 3-Color Brand Gradient Top Accent Bar (Indigo #6366f1 -> Purple #a855f7 -> Cyan #22d3ee)
- Space Grotesk / Inter corporate typography and colors
- Executive Cover Page with structured sender/metadata grid (KvK 99986191, BTW NL005423147B16)
- Dark Table Headers (#0a0e1a) with bold white text and alternating zebra rows (#f8fafc)
- Callout/Quote highlight boxes (#f0f9ff with 3.5pt indigo accent line)
- Running headers and footers with official page numbering (Pagina X van Y)
- Complete fidelity to the source Markdown content
"""

import os
import sys
import re
from pathlib import Path

# Force UTF-8 on Windows stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

# Brand Color Palette from factuursjabloon.html
COLOR_PRIMARY = RGBColor(99, 102, 241)     # #6366f1 Indigo
COLOR_PRIMARY_DARK = RGBColor(79, 70, 229) # #4f46e5 Indigo Dark
COLOR_PURPLE = RGBColor(168, 85, 247)     # #a855f7 Purple
COLOR_CYAN = RGBColor(34, 211, 238)       # #22d3ee Cyan
COLOR_DARK_NAVY = RGBColor(10, 14, 26)    # #0a0e1a Header Dark
COLOR_TEXT_MAIN = RGBColor(30, 41, 59)    # #1e293b Slate 800
COLOR_TEXT_MUTED = RGBColor(100, 116, 139)# #64748b Slate 500
COLOR_LIGHT_BG = "F8FAFC"                 # #f8fafc Slate 50
COLOR_BORDER = "E2E8F0"                   # #e2e8f0 Slate 200
COLOR_CALLOUT_BG = "F0F9FF"               # #f0f9ff Sky 50
COLOR_CALLOUT_BORDER = "2563EB"           # #2563eb Blue 600

def set_cell_background(cell, color_hex):
    """Sets background fill color for a table cell."""
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Sets internal padding (in dxa) for a table cell."""
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    cell._tc.get_or_add_tcPr().append(tcMar)

def set_cell_left_border(cell, color_hex=COLOR_CALLOUT_BORDER, sz="24"):
    """Sets a thick accent border on the left side of a cell."""
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    cell._tc.get_or_add_tcPr().append(tcBorders)

def set_table_borders(table, color_hex=COLOR_BORDER):
    """Applies clean subtle horizontal borders to a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="{color_hex}"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color_hex}"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def make_table_no_borders(table):
    """Removes all borders from a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="none"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="none"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def add_page_number_to_paragraph(p):
    """Injects dynamic Page X of Y fields into a paragraph."""
    fldSimple_page = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
    fldSimple_numpages = parse_xml(r'<w:fldSimple %s w:instr="NUMPAGES"/>' % nsdecls('w'))
    r1 = p.add_run("Pagina ")
    r1.font.size = Pt(8.5)
    r1.font.color.rgb = COLOR_TEXT_MUTED
    p._p.append(fldSimple_page)
    r2 = p.add_run(" van ")
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = COLOR_TEXT_MUTED
    p._p.append(fldSimple_numpages)

def format_inline_runs(paragraph, text, base_font_size=10.5, is_bold=False, is_italic=False, text_color=COLOR_TEXT_MAIN):
    """Parses markdown bold (**text**) and italic (*text*) and backticks (`code`) within a string."""
    # Pattern to match bold, italic, code
    token_pattern = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)')
    parts = token_pattern.split(text)
    
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**') and len(part) >= 4:
            run = paragraph.add_run(part[2:-2])
            run.font.name = "Inter"
            run.font.size = Pt(base_font_size)
            run.font.bold = True
            run.font.italic = is_italic
            run.font.color.rgb = text_color
        elif part.startswith('*') and part.endswith('*') and len(part) >= 2:
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Inter"
            run.font.size = Pt(base_font_size)
            run.font.bold = is_bold
            run.font.italic = True
            run.font.color.rgb = text_color
        elif part.startswith('`') and part.endswith('`') and len(part) >= 2:
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(base_font_size - 0.5)
            run.font.color.rgb = COLOR_PRIMARY_DARK
            # light background for inline code
        else:
            run = paragraph.add_run(part)
            run.font.name = "Inter"
            run.font.size = Pt(base_font_size)
            run.font.bold = is_bold
            run.font.italic = is_italic
            run.font.color.rgb = text_color

def create_brand_gradient_bar(doc):
    """Creates the signature 3-color Creation+Alt+Fix gradient bar."""
    bar_table = doc.add_table(rows=1, cols=3)
    bar_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    bar_table.autofit = False
    make_table_no_borders(bar_table)
    
    # 6.5 inches printable width divided into 3 segments
    col_widths = [Inches(2.15), Inches(2.15), Inches(2.20)]
    colors = ["6366F1", "A855F7", "22D3EE"]
    
    row = bar_table.rows[0]
    # Set height of the bar to ~6pt (120 dxa)
    trPr = row._tr.get_or_add_trPr()
    trHeight = parse_xml(f'<w:trHeight {nsdecls("w")} w:val="100" w:hRule="exact"/>')
    trPr.append(trHeight)
    
    for i, cell in enumerate(row.cells):
        cell.width = col_widths[i]
        set_cell_background(cell, colors[i])
        set_cell_margins(cell, top=20, bottom=20, left=0, right=0)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run("")
        r.font.size = Pt(1)

def add_cover_page(doc, title, subtitle="", doc_id="CAB-DOC", status="Officieel Bedrijfsdocument"):
    """Builds a formal executive cover page with invoice styling."""
    # 1. 3-Color Gradient Top Bar
    create_brand_gradient_bar(doc)
    
    # 2. Brand Header Block
    p_brand = doc.add_paragraph()
    p_brand.paragraph_format.space_before = Pt(28)
    p_brand.paragraph_format.space_after = Pt(2)
    run_brand = p_brand.add_run("CREATION+ALT+FIX")
    run_brand.font.name = "Space Grotesk"
    run_brand.font.size = Pt(22)
    run_brand.font.bold = True
    run_brand.font.color.rgb = COLOR_DARK_NAVY
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(40)
    run_sub = p_sub.add_run("IT, AI & WEBDESIGN • SOFTWARE ARCHITECTUUR")
    run_sub.font.name = "Inter"
    run_sub.font.size = Pt(9.5)
    run_sub.font.bold = True
    run_sub.font.color.rgb = COLOR_PRIMARY_DARK
    
    # 3. Main Document Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(30)
    p_title.paragraph_format.space_after = Pt(8)
    run_title = p_title.add_run(title)
    run_title.font.name = "Space Grotesk"
    run_title.font.size = Pt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_DARK_NAVY
    
    if subtitle:
        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_before = Pt(0)
        p_desc.paragraph_format.space_after = Pt(36)
        run_desc = p_desc.add_run(subtitle)
        run_desc.font.name = "Inter"
        run_desc.font.size = Pt(13)
        run_desc.font.italic = True
        run_desc.font.color.rgb = COLOR_TEXT_MUTED
    else:
        p_title.paragraph_format.space_after = Pt(40)
        
    # 4. Details / Metadata Grid (Styled like Details Grid in factuursjabloon.html)
    grid_table = doc.add_table(rows=1, cols=3)
    grid_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    grid_table.autofit = False
    set_table_borders(grid_table, color_hex="E2E8F0")
    
    grid_widths = [Inches(2.15), Inches(2.15), Inches(2.20)]
    for i, cell in enumerate(grid_table.rows[0].cells):
        cell.width = grid_widths[i]
        set_cell_background(cell, COLOR_LIGHT_BG)
        set_cell_margins(cell, top=160, bottom=160, left=160, right=160)
    
    # Column 1: Dienstverlener
    c1 = grid_table.rows[0].cells[0]
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1_h = p1.add_run("DIENSTVERLENER\n")
    r1_h.font.name = "Space Grotesk"
    r1_h.font.size = Pt(8.5)
    r1_h.font.bold = True
    r1_h.font.color.rgb = COLOR_TEXT_MUTED
    r1_b = p1.add_run("Creation+Alt+Fix\nAllard Veldman\nHoogezand, Groningen")
    r1_b.font.name = "Inter"
    r1_b.font.size = Pt(9.5)
    r1_b.font.color.rgb = COLOR_TEXT_MAIN
    
    # Column 2: Juridisch & Fiscaal
    c2 = grid_table.rows[0].cells[1]
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    r2_h = p2.add_run("REGISTRATIE & CONTACT\n")
    r2_h.font.name = "Space Grotesk"
    r2_h.font.size = Pt(8.5)
    r2_h.font.bold = True
    r2_h.font.color.rgb = COLOR_TEXT_MUTED
    r2_b = p2.add_run("KvK: 99986191\nBTW: NL005423147B16\ninfo@creationaltfix.nl")
    r2_b.font.name = "Inter"
    r2_b.font.size = Pt(9.5)
    r2_b.font.color.rgb = COLOR_TEXT_MAIN
    
    # Column 3: Document Status & Dossier
    c3 = grid_table.rows[0].cells[2]
    p3 = c3.paragraphs[0]
    p3.paragraph_format.space_after = Pt(2)
    r3_h = p3.add_run("STATUS & DOSSIER\n")
    r3_h.font.name = "Space Grotesk"
    r3_h.font.size = Pt(8.5)
    r3_h.font.bold = True
    r3_h.font.color.rgb = COLOR_TEXT_MUTED
    r3_b = p3.add_run(f"Dossier: {doc_id}\nStatus: {status}\nDatum: Oktober 2026")
    r3_b.font.name = "Inter"
    r3_b.font.size = Pt(9.5)
    r3_b.font.color.rgb = COLOR_PRIMARY_DARK
    r3_b.font.bold = True

    # 5. Security & Confidentiality Stamp
    p_stamp = doc.add_paragraph()
    p_stamp.paragraph_format.space_before = Pt(45)
    p_stamp.paragraph_format.space_after = Pt(0)
    run_stamp = p_stamp.add_run("🔒 VERTROUWELIJK DIRECTIEDOCUMENT — Bestemd voor geautoriseerde instanties, banken & investeerders.")
    run_stamp.font.name = "Inter"
    run_stamp.font.size = Pt(8.5)
    run_stamp.font.italic = True
    run_stamp.font.color.rgb = COLOR_TEXT_MUTED
    
    # Page break to content
    doc.add_page_break()

def setup_headers_and_footers(doc):
    """Configures running headers and footers with official page numbers."""
    section = doc.sections[0]
    section.different_first_page_header_footer = True
    
    # Running Header
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hp.paragraph_format.space_after = Pt(12)
    hrun = hp.add_run("CREATION+ALT+FIX • OFFICIEEL BEDRIJFSDOSSIER")
    hrun.font.name = "Space Grotesk"
    hrun.font.size = Pt(8)
    hrun.font.bold = True
    hrun.font.color.rgb = COLOR_TEXT_MUTED
    
    # Running Footer
    footer = section.footer
    table = footer.add_table(rows=1, cols=2, width=Inches(6.5))
    make_table_no_borders(table)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.rows[0].cells[0].width = Inches(4.5)
    table.rows[0].cells[1].width = Inches(2.0)
    
    # Left Footer: Legal Identifiers
    fp_left = table.rows[0].cells[0].paragraphs[0]
    fp_left.alignment = WD_ALIGN_PARAGRAPH.LEFT
    fp_left_run = fp_left.add_run("Creation+Alt+Fix • KvK 99986191 • BTW NL005423147B16 • Hoogezand")
    fp_left_run.font.name = "Inter"
    fp_left_run.font.size = Pt(8)
    fp_left_run.font.color.rgb = COLOR_TEXT_MUTED
    
    # Right Footer: Page Numbering
    fp_right = table.rows[0].cells[1].paragraphs[0]
    fp_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_page_number_to_paragraph(fp_right)

def parse_markdown_to_docx(md_path, docx_path):
    """Parses a markdown file and writes an executive docx document."""
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    doc = Document()
    
    # Page Margins: 1 inch (2.54 cm)
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)
        s.page_width = Inches(8.27)  # A4 width
        s.page_height = Inches(11.69) # A4 height
        
    setup_headers_and_footers(doc)
    
    # Extract metadata from top lines
    title = md_path.stem.replace('-', ' ')
    subtitle = ""
    doc_id = "CAB-DOC"
    status = "Definitief"
    
    for line in lines[:15]:
        stripped = line.strip()
        if stripped.startswith('# '):
            title = stripped[2:].strip()
            # Clean emojis from title for cleaner formal cover
            title = re.sub(r'^[^\w\s]+\s*', '', title)
        elif stripped.startswith('### '):
            subtitle = stripped[4:].strip().replace('*', '')
        elif 'Document-ID:' in stripped:
            m = re.search(r'Document-ID:\s*([A-Za-z0-9_-]+)', stripped)
            if m:
                doc_id = m.group(1)
        elif 'Status:' in stripped:
            m = re.search(r'Status:\s*([^>|\n]+)', stripped)
            if m:
                status = m.group(1).strip()
                
    # Add Cover Page
    add_cover_page(doc, title=title, subtitle=subtitle, doc_id=doc_id, status=status)
    
    # Process Body Lines
    in_code_block = False
    code_lines = []
    in_table = False
    table_lines = []
    
    i = 0
    total_lines = len(lines)
    
    while i < total_lines:
        line = lines[i]
        stripped = line.strip()
        
        # Check Code Blocks (```)
        if stripped.startswith('```'):
            if in_code_block:
                # End code block: render box
                in_code_block = False
                render_code_box(doc, "\n".join(code_lines))
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue
            
        if in_code_block:
            code_lines.append(line.rstrip())
            i += 1
            continue
            
        # Check Markdown Tables (| col1 | col2 |)
        if stripped.startswith('|') and stripped.endswith('|'):
            table_lines.append(stripped)
            # Lookahead to see if next line is also table
            if i + 1 < total_lines and lines[i+1].strip().startswith('|'):
                i += 1
                continue
            else:
                # End of table: render table
                render_markdown_table(doc, table_lines)
                table_lines = []
                i += 1
                continue
                
        # Horizontal rule (---)
        if stripped in ['---', '***', '___']:
            p_sep = doc.add_paragraph()
            p_sep.paragraph_format.space_before = Pt(12)
            p_sep.paragraph_format.space_after = Pt(12)
            # Add thin divider
            r_sep = p_sep.add_run("—" * 45)
            r_sep.font.color.rgb = RGBColor(226, 232, 240)
            r_sep.font.size = Pt(8)
            i += 1
            continue
            
        # Callouts / Blockquotes (> text)
        if stripped.startswith('> '):
            callout_text = stripped[2:].strip()
            # Combine multi-line quotes
            while i + 1 < total_lines and lines[i+1].strip().startswith('>'):
                i += 1
                callout_text += " " + lines[i].strip()[1:].strip()
            render_callout_box(doc, callout_text)
            i += 1
            continue
            
        # Headings
        if stripped.startswith('# '):
            # Already used for title, render as large section if inside body
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(20)
            p.paragraph_format.space_after = Pt(6)
            h_text = re.sub(r'^[^\w\s]+\s*', '', stripped[2:])
            format_inline_runs(p, h_text, base_font_size=18, is_bold=True, text_color=COLOR_DARK_NAVY)
        elif stripped.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(4)
            h_text = re.sub(r'^[^\w\s]+\s*', '', stripped[3:])
            format_inline_runs(p, h_text, base_font_size=14, is_bold=True, text_color=COLOR_PRIMARY_DARK)
        elif stripped.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(3)
            h_text = re.sub(r'^[^\w\s]+\s*', '', stripped[4:])
            format_inline_runs(p, h_text, base_font_size=11.5, is_bold=True, text_color=COLOR_DARK_NAVY)
        elif stripped.startswith('#### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            h_text = re.sub(r'^[^\w\s]+\s*', '', stripped[5:])
            format_inline_runs(p, h_text, base_font_size=10.5, is_bold=True, text_color=COLOR_TEXT_MAIN)
            
        # Bullet Lists (- or * or •)
        elif stripped.startswith(('- ', '* ', '• ')):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            list_text = stripped[2:].strip()
            format_inline_runs(p, list_text, base_font_size=10)
            
        # Numbered Lists (1. or 2.)
        elif re.match(r'^\d+\.\s+', stripped):
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            list_text = re.sub(r'^\d+\.\s+', '', stripped).strip()
            format_inline_runs(p, list_text, base_font_size=10)
            
        # Standard Paragraph
        elif stripped:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.15
            format_inline_runs(p, stripped, base_font_size=10)
            
        i += 1
        
    doc.save(docx_path)
    print(f"✅ Opgeslagen: {docx_path.name} ({os.path.getsize(docx_path):,} bytes)")

def render_callout_box(doc, text):
    """Renders a callout box styled like a prominent blockquote in factuursjabloon."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, COLOR_CALLOUT_BG)
    set_cell_left_border(cell, color_hex="2563EB", sz="24") # 3pt blue accent border
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    # Strip alerts marker like [!IMPORTANT]
    clean_text = re.sub(r'\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]', '', text).strip()
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    format_inline_runs(p, clean_text, base_font_size=10, is_italic=True, text_color=COLOR_TEXT_MAIN)
    
    # Add spacing after table
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(4)
    p_after.paragraph_format.space_after = Pt(0)

def render_code_box(doc, text):
    """Renders ASCII diagrams or code in a neat shaded box."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
    
    # Border
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER}"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER}"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER}"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER}"/>
        </w:tcBorders>
    ''')
    cell._tc.get_or_add_tcPr().append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    r.font.color.rgb = COLOR_TEXT_MAIN

def render_markdown_table(doc, lines):
    """Renders a markdown table with dark headers (#0a0e1a) and alternating zebra rows."""
    parsed_rows = []
    for l in lines:
        parts = [p.strip() for p in l.strip().split('|')[1:-1]]
        # Ignore separator row (| :--- | :--- |)
        if all(re.match(r'^:?-+:?$', p) for p in parts if p):
            continue
        parsed_rows.append(parts)
        
    if not parsed_rows:
        return
        
    cols_count = max(len(r) for r in parsed_rows)
    table = doc.add_table(rows=len(parsed_rows), cols=cols_count)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table, color_hex="E2E8F0")
    
    # Distribute column widths across 6.5 inches
    base_width = Inches(6.5 / cols_count)
    
    for r_idx, row_data in enumerate(parsed_rows):
        is_header = (r_idx == 0)
        row = table.rows[r_idx]
        
        # Keep row together
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        if is_header:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
            
        for c_idx in range(cols_count):
            cell = row.cells[c_idx]
            cell.width = base_width
            cell_text = row_data[c_idx] if c_idx < len(row_data) else ""
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            
            if is_header:
                set_cell_background(cell, "0A0E1A") # Signature dark header from factuur
                set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
                format_inline_runs(p, cell_text, base_font_size=9.5, is_bold=True, text_color=RGBColor(255, 255, 255))
            else:
                bg = COLOR_LIGHT_BG if r_idx % 2 == 1 else "FFFFFF" # Zebra striping
                set_cell_background(cell, bg)
                set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                format_inline_runs(p, cell_text, base_font_size=9, is_bold=False, text_color=COLOR_TEXT_MAIN)
                
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(6)
    p_after.paragraph_format.space_after = Pt(0)

def main():
    base_dir = Path(__file__).resolve().parent.parent
    bible_dir = base_dir / "docs" / "startup-bible"
    word_out_dir = bible_dir / "word"
    word_out_dir.mkdir(parents=True, exist_ok=True)
    
    md_files = [
        bible_dir / "01-AI-STARTUP-GROWTH-RESEARCH.md",
        bible_dir / "02-BUSINESS-PLAN-CREATION-ALT-FIX.md",
        bible_dir / "03-FINANCIAL-MODEL-36-MONTHS.md",
        bible_dir / "04-LEGAL-SAAS-AV-SLA-GDPR.md",
        bible_dir / "05-INVESTOR-PITCH-DECK.md",
        bible_dir / "06-WBSO-RVO-INNOVATION-DOSSIER.md",
        bible_dir / "07-90-DAYS-EXECUTION-ROADMAP.md",
        base_dir / "docs" / "CONTINUITY-AND-EMERGENCY-PROTOCOL.md",
    ]
    
    print("\n" + "="*70)
    print("🚀 CREATION+ALT+FIX EXECUTIVE WORD (.DOCX) EXPORT GENERATOR")
    print("="*70)
    
    success_count = 0
    for md_path in md_files:
        if not md_path.exists():
            print(f"⚠️ Bestand niet gevonden: {md_path.name}")
            continue
            
        out_name = md_path.stem + ".docx"
        if md_path.name == "CONTINUITY-AND-EMERGENCY-PROTOCOL.md":
            out_name = "08-CONTINUITY-AND-EMERGENCY-PROTOCOL.docx"
            
        docx_path = word_out_dir / out_name
        try:
            parse_markdown_to_docx(md_path, docx_path)
            success_count += 1
        except Exception as e:
            print(f"❌ Fout bij converteren {md_path.name}: {e}")
            import traceback
            traceback.print_exc()
            
    print("="*70)
    print(f"🏁 VOLTOOID: {success_count} van de {len(md_files)} officiële Word-documenten gereed in:")
    print(f"   {word_out_dir}")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
