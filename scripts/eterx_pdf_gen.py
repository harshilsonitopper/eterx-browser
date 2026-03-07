#!/usr/bin/env python3
"""
EterX Professional PDF Generator v2.0
=====================================
Generates stunning, multi-page PDF documents from JSON input using ReportLab.
Supports: cover pages, styled tables, charts (line/bar/pie), callout boxes,
executive summaries, multi-column layouts, headers/footers, watermarks.

Usage:
  python eterx_pdf_gen.py <json_file> [output.pdf]
  python eterx_pdf_gen.py - [output.pdf]      # Read JSON from stdin
"""
import sys, json, os, io, textwrap
from datetime import datetime

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import mm, inch, cm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, HRFlowable, NextPageTemplate, FrameBreak,
    ListFlowable, ListItem
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.piecharts import Pie
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Try importing matplotlib for advanced charts
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.ticker as mticker
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# ─── Color Palette (Premium Dark Corporate Theme) ─────────
C = {
    'navy':       HexColor('#0f172a'),
    'dark_blue':  HexColor('#1e3a5f'),
    'blue':       HexColor('#3b82f6'),
    'light_blue': HexColor('#93c5fd'),
    'sky':        HexColor('#dbeafe'),
    'slate':      HexColor('#334155'),
    'gray':       HexColor('#64748b'),
    'light_gray': HexColor('#f1f5f9'),
    'off_white':  HexColor('#f8fafc'),
    'white':      white,
    'black':      black,
    'green':      HexColor('#10b981'),
    'green_bg':   HexColor('#ecfdf5'),
    'red':        HexColor('#ef4444'),
    'red_bg':     HexColor('#fef2f2'),
    'amber':      HexColor('#f59e0b'),
    'amber_bg':   HexColor('#fffbeb'),
    'purple':     HexColor('#8b5cf6'),
    'teal':       HexColor('#06b6d4'),
    'orange':     HexColor('#f97316'),
}

PAGE_W, PAGE_H = A4
MARGIN_L, MARGIN_R, MARGIN_T, MARGIN_B = 45, 45, 60, 50

# ─── Custom Styles ────────────────────────────────────────
def build_styles():
    s = getSampleStyleSheet()
    
    s.add(ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=22, leading=28,
        textColor=C['navy'], spaceBefore=20, spaceAfter=10))
    s.add(ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=16, leading=22,
        textColor=C['dark_blue'], spaceBefore=16, spaceAfter=8))
    s.add(ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=13, leading=18,
        textColor=C['slate'], spaceBefore=12, spaceAfter=6))
    s.add(ParagraphStyle('Body', fontName='Helvetica', fontSize=10.5, leading=16,
        textColor=C['slate'], alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=6))
    s.add(ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=10.5, leading=16,
        textColor=C['slate'], alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=6))
    s.add(ParagraphStyle('Small', fontName='Helvetica', fontSize=9, leading=13,
        textColor=C['gray'], spaceBefore=2, spaceAfter=4))
    s.add(ParagraphStyle('Caption', fontName='Helvetica-Oblique', fontSize=9, leading=13,
        textColor=C['gray'], alignment=TA_CENTER, spaceBefore=4, spaceAfter=8))
    s.add(ParagraphStyle('BulletBody', fontName='Helvetica', fontSize=10.5, leading=16,
        textColor=C['slate'], leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=3))
    s.add(ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=9.5, leading=13,
        textColor=C['white'], alignment=TA_CENTER))
    s.add(ParagraphStyle('TD', fontName='Helvetica', fontSize=9.5, leading=14,
        textColor=C['slate'], alignment=TA_LEFT))
    s.add(ParagraphStyle('TDCenter', fontName='Helvetica', fontSize=9.5, leading=14,
        textColor=C['slate'], alignment=TA_CENTER))
    s.add(ParagraphStyle('CalloutText', fontName='Helvetica', fontSize=10, leading=15,
        textColor=C['dark_blue'], leftIndent=14, spaceBefore=4, spaceAfter=4))
    s.add(ParagraphStyle('Footer', fontName='Helvetica', fontSize=7.5,
        textColor=C['gray'], alignment=TA_CENTER))
    s.add(ParagraphStyle('ExecSummary', fontName='Helvetica', fontSize=11, leading=17,
        textColor=C['slate'], alignment=TA_JUSTIFY, spaceBefore=4, spaceAfter=8,
        leftIndent=10, rightIndent=10))
    s.add(ParagraphStyle('KPI_Value', fontName='Helvetica-Bold', fontSize=24, leading=28,
        textColor=C['blue'], alignment=TA_CENTER))
    s.add(ParagraphStyle('KPI_Label', fontName='Helvetica', fontSize=9, leading=12,
        textColor=C['gray'], alignment=TA_CENTER))
    return s

STYLES = build_styles()

# ─── Cover Page ───────────────────────────────────────────
def draw_cover(canvas, doc, meta):
    canvas.saveState()
    w, h = PAGE_W, PAGE_H
    
    # Full navy background
    canvas.setFillColor(C['navy'])
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    
    # Top accent bar
    canvas.setFillColor(C['blue'])
    canvas.rect(0, h - 10*mm, w, 10*mm, fill=1, stroke=0)
    
    # Large decorative circle (top-right)
    canvas.setFillColor(HexColor('#1e3a5f'))
    canvas.circle(w - 60, h - 120, 180, fill=1, stroke=0)
    
    # Subtle grid lines for texture
    canvas.setStrokeColor(HexColor('#1a2744'))
    canvas.setLineWidth(0.3)
    for y in range(0, int(h), 40):
        canvas.line(0, y, w, y)
    
    # Title
    title = meta.get('title', 'Report')
    canvas.setFillColor(C['white'])
    canvas.setFont('Helvetica-Bold', 36)
    
    # Word wrap title
    max_w = w - 120
    words = title.split()
    lines, cur = [], ''
    for word in words:
        test = f'{cur} {word}'.strip()
        if canvas.stringWidth(test, 'Helvetica-Bold', 36) < max_w:
            cur = test
        else:
            if cur: lines.append(cur)
            cur = word
    if cur: lines.append(cur)
    
    y_start = h - 180
    for line in lines:
        canvas.drawString(55, y_start, line)
        y_start -= 48
    
    # Subtitle
    subtitle = meta.get('subtitle', '')
    if subtitle:
        canvas.setFillColor(C['light_blue'])
        canvas.setFont('Helvetica', 15)
        canvas.drawString(55, y_start - 10, subtitle)
    
    # Divider line
    canvas.setStrokeColor(C['blue'])
    canvas.setLineWidth(2)
    canvas.line(55, y_start - 35, 250, y_start - 35)
    
    # Author / Date info
    canvas.setFillColor(C['gray'])
    canvas.setFont('Helvetica', 11)
    author = meta.get('author', 'EterX Intelligence')
    canvas.drawString(55, y_start - 60, f'Prepared by: {author}')
    canvas.drawString(55, y_start - 78, datetime.now().strftime('%B %d, %Y'))
    
    # Bottom bar
    canvas.setFillColor(C['blue'])
    canvas.rect(0, 0, w, 45, fill=1, stroke=0)
    canvas.setFillColor(C['white'])
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(55, 22, 'CONFIDENTIAL')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(w - 55, 22, 'Generated by EterX Intelligence Platform')
    
    canvas.restoreState()

# ─── Header / Footer ─────────────────────────────────────
def draw_header_footer(canvas, doc, meta):
    canvas.saveState()
    w = PAGE_W
    title = meta.get('title', 'Report')
    
    # Header - thin blue line + title
    canvas.setStrokeColor(C['blue'])
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN_L, PAGE_H - 38, w - MARGIN_R, PAGE_H - 38)
    
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(C['gray'])
    canvas.drawString(MARGIN_L, PAGE_H - 33, title[:60])
    canvas.drawRightString(w - MARGIN_R, PAGE_H - 33, datetime.now().strftime('%b %d, %Y'))
    
    # Footer - page number + thin line
    canvas.setStrokeColor(HexColor('#e2e8f0'))
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_L, MARGIN_B - 10, w - MARGIN_R, MARGIN_B - 10)
    
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(C['gray'])
    canvas.drawCentredString(w / 2, MARGIN_B - 25, f'— {doc.page} —')
    canvas.drawString(MARGIN_L, MARGIN_B - 25, 'EterX Intelligence')
    canvas.drawRightString(w - MARGIN_R, MARGIN_B - 25, 'Confidential')
    
    canvas.restoreState()

# ─── Section Heading with accent bar ─────────────────────
def make_heading(text, level=1):
    elements = []
    style = STYLES['H1'] if level == 1 else STYLES['H2'] if level == 2 else STYLES['H3']
    elements.append(Paragraph(text, style))
    if level <= 2:
        elements.append(HRFlowable(width='25%', thickness=2.5, color=C['blue'],
                                    spaceBefore=1, spaceAfter=10))
    return elements

# ─── Text Content ─────────────────────────────────────────
def make_text_content(text):
    elements = []
    for para in text.split('\n'):
        para = para.strip()
        if not para:
            elements.append(Spacer(1, 6))
            continue
        if para.startswith('### '):
            elements.extend(make_heading(para[4:], 3))
        elif para.startswith('## '):
            elements.extend(make_heading(para[3:], 2))
        elif para.startswith('# '):
            elements.extend(make_heading(para[2:], 1))
        elif para.startswith('- ') or para.startswith('• '):
            bullet_text = para[2:]
            # Convert **bold** markers
            bullet_text = bullet_text.replace('**', '<b>', 1).replace('**', '</b>', 1)
            elements.append(Paragraph(f'• {bullet_text}', STYLES['BulletBody']))
        elif para.startswith('**') and para.endswith('**'):
            elements.append(Paragraph(f'<b>{para[2:-2]}</b>', STYLES['BodyBold']))
        else:
            # Convert inline **bold** and *italic*
            formatted = para
            while '**' in formatted:
                formatted = formatted.replace('**', '<b>', 1).replace('**', '</b>', 1)
            while '*' in formatted:
                formatted = formatted.replace('*', '<i>', 1).replace('*', '</i>', 1)
            elements.append(Paragraph(formatted, STYLES['Body']))
    return elements

# ─── Premium Table ────────────────────────────────────────
def make_table(data, caption=None):
    if not data or len(data) < 2:
        return []
    
    num_cols = len(data[0])
    avail_w = PAGE_W - MARGIN_L - MARGIN_R - 10
    col_widths = [avail_w / num_cols] * num_cols
    
    # Build table data with Paragraph elements
    table_data = []
    for i, row in enumerate(data):
        styled_row = []
        for j, cell in enumerate(row):
            cell_str = str(cell) if cell is not None else ''
            if i == 0:
                styled_row.append(Paragraph(cell_str, STYLES['TH']))
            else:
                # Detect numeric values and center them
                try:
                    float(cell_str.replace(',', '').replace('$', '').replace('%', '').replace('+', '').replace('-', ''))
                    styled_row.append(Paragraph(cell_str, STYLES['TDCenter']))
                except (ValueError, AttributeError):
                    styled_row.append(Paragraph(cell_str, STYLES['TD']))
        table_data.append(styled_row)
    
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    style_cmds = [
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), C['dark_blue']),
        ('TEXTCOLOR', (0, 0), (-1, 0), C['white']),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 2, C['blue']),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, HexColor('#e2e8f0')),
        ('LINEBELOW', (0, -1), (-1, -1), 1, HexColor('#cbd5e1')),
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Rounded feel
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]
    
    # Alternating row colors
    for i in range(1, len(table_data)):
        bg = C['off_white'] if i % 2 == 0 else C['white']
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    
    t.setStyle(TableStyle(style_cmds))
    
    elements = [Spacer(1, 8), t]
    if caption:
        elements.append(Paragraph(caption, STYLES['Caption']))
    elements.append(Spacer(1, 10))
    return elements

# ─── Matplotlib Charts (High Quality) ────────────────────
def make_chart_matplotlib(chart_data, chart_type='bar', width=6.5, height=3.2):
    """Generate chart as image using matplotlib for premium quality."""
    if not HAS_MATPLOTLIB:
        return make_chart_reportlab(chart_data, chart_type)
    
    labels = chart_data.get('labels', [])
    datasets = chart_data.get('datasets', [])
    
    if not datasets and chart_type != 'pie':
        return []
    
    fig, ax = plt.subplots(1, 1, figsize=(width, height), dpi=150)
    fig.patch.set_facecolor('#fafbfc')
    ax.set_facecolor('#fafbfc')
    
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']
    
    if chart_type == 'bar':
        data_vals = datasets[0].get('data', []) if datasets else []
        x = range(len(labels))
        bars = ax.bar(x, data_vals, color=colors[:len(data_vals)], width=0.6, 
                       edgecolor='white', linewidth=0.5, zorder=3)
        ax.set_xticks(x)
        ax.set_xticklabels(labels, fontsize=8, color='#475569')
        
        # Add value labels on bars
        for bar, val in zip(bars, data_vals):
            ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + max(data_vals)*0.02,
                    f'{val:,.0f}' if isinstance(val, (int, float)) else str(val),
                    ha='center', va='bottom', fontsize=7.5, color='#334155', fontweight='bold')
    
    elif chart_type == 'line':
        for i, ds in enumerate(datasets):
            data_vals = ds.get('data', [])
            label = ds.get('label', f'Series {i+1}')
            ax.plot(range(len(data_vals)), data_vals, color=colors[i % len(colors)],
                    linewidth=2.5, marker='o', markersize=5, label=label, zorder=3)
            # Fill under line
            ax.fill_between(range(len(data_vals)), data_vals, alpha=0.08, color=colors[i % len(colors)])
        if labels:
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(labels, fontsize=8, color='#475569')
        if len(datasets) > 1:
            ax.legend(fontsize=8, framealpha=0.9, edgecolor='#e2e8f0')
    
    elif chart_type == 'pie':
        data_vals = chart_data.get('data', datasets[0].get('data', []) if datasets else [])
        pie_labels = labels or [f'Slice {i+1}' for i in range(len(data_vals))]
        wedges, texts, autotexts = ax.pie(
            data_vals, labels=pie_labels, colors=colors[:len(data_vals)],
            autopct='%1.1f%%', startangle=90, pctdistance=0.75,
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2)
        )
        for t in texts: t.set_fontsize(8); t.set_color('#475569')
        for t in autotexts: t.set_fontsize(7); t.set_color('#ffffff'); t.set_fontweight('bold')
    
    # Style axes
    if chart_type != 'pie':
        ax.tick_params(axis='y', labelsize=8, colors='#64748b')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        ax.grid(axis='y', alpha=0.3, color='#cbd5e1', linestyle='--', zorder=0)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'{x:,.0f}'))
    
    plt.tight_layout(pad=1.0)
    
    # Save to buffer
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#fafbfc')
    plt.close(fig)
    buf.seek(0)
    
    img = Image(buf, width=width * 72, height=height * 72)
    return [Spacer(1, 6), img, Spacer(1, 8)]

# ─── Fallback ReportLab Charts ───────────────────────────
def make_chart_reportlab(chart_data, chart_type='bar'):
    labels = chart_data.get('labels', [])
    datasets = chart_data.get('datasets', [])
    if not datasets and chart_type != 'pie':
        return []
    
    w, h = 420, 200
    drawing = Drawing(w, h)
    rlab_colors = [C['blue'], C['green'], C['amber'], C['red'], C['purple'], C['teal']]
    
    if chart_type == 'bar':
        chart = VerticalBarChart()
        chart.x, chart.y, chart.width, chart.height = 45, 25, w - 70, h - 50
        chart.data = [ds.get('data', []) for ds in datasets]
        chart.categoryAxis.categoryNames = labels
        chart.categoryAxis.labels.fontSize = 8
        chart.valueAxis.labels.fontSize = 8
        chart.valueAxis.valueMin = 0
        for i in range(len(datasets)):
            chart.bars[i].fillColor = rlab_colors[i % len(rlab_colors)]
        drawing.add(chart)
    elif chart_type == 'line':
        chart = LinePlot()
        chart.x, chart.y, chart.width, chart.height = 45, 25, w - 70, h - 50
        chart.data = [list(enumerate(ds.get('data', []))) for ds in datasets]
        for i in range(len(datasets)):
            chart.lines[i].strokeColor = rlab_colors[i % len(rlab_colors)]
            chart.lines[i].strokeWidth = 2
        drawing.add(chart)
    elif chart_type == 'pie':
        pie = Pie()
        pie.x, pie.y, pie.width, pie.height = w//2 - 70, 20, 140, 140
        pie.data = chart_data.get('data', datasets[0].get('data', []) if datasets else [])
        pie.labels = labels
        for i in range(len(pie.data)):
            pie.slices[i].fillColor = rlab_colors[i % len(rlab_colors)]
            pie.slices[i].strokeColor = C['white']
        drawing.add(pie)
    
    return [Spacer(1, 6), drawing, Spacer(1, 8)]

# ─── Callout / Alert Box ─────────────────────────────────
def make_callout(text, callout_type='info'):
    color_map = {
        'info':    (C['blue'],  C['sky']),
        'success': (C['green'], C['green_bg']),
        'warning': (C['amber'], C['amber_bg']),
        'danger':  (C['red'],   C['red_bg']),
    }
    accent, bg = color_map.get(callout_type, color_map['info'])
    
    # Icon prefix
    icon_map = {'info': 'ℹ️', 'success': '✅', 'warning': '⚠️', 'danger': '❌'}
    icon = icon_map.get(callout_type, 'ℹ️')
    
    inner = Paragraph(f'{icon}  {text}', STYLES['CalloutText'])
    
    t = Table([[inner]], colWidths=[PAGE_W - MARGIN_L - MARGIN_R - 20])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LINEBEFORE', (0, 0), (0, -1), 4, accent),
        ('ROUNDEDCORNERS', [0, 4, 4, 0]),
    ]))
    return [Spacer(1, 6), t, Spacer(1, 8)]

# ─── KPI Cards Row ───────────────────────────────────────
def make_kpi_cards(kpis):
    """kpis = [{"value": "1,234", "label": "Total Users"}, ...]"""
    if not kpis:
        return []
    
    n = len(kpis)
    card_w = (PAGE_W - MARGIN_L - MARGIN_R - (n-1) * 8) / n
    
    cards = []
    for kpi in kpis:
        val = Paragraph(str(kpi.get('value', '—')), STYLES['KPI_Value'])
        lbl = Paragraph(str(kpi.get('label', '')), STYLES['KPI_Label'])
        card = Table([[val], [lbl]], colWidths=[card_w])
        card.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), C['off_white']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, 0), (-1, 0), 3, C['blue']),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        cards.append(card)
    
    row = Table([cards], colWidths=[card_w] * n)
    row.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    return [Spacer(1, 8), row, Spacer(1, 12)]

# ─── Executive Summary Box ───────────────────────────────
def make_exec_summary(text):
    inner = Paragraph(text, STYLES['ExecSummary'])
    t = Table([[inner]], colWidths=[PAGE_W - MARGIN_L - MARGIN_R - 20])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C['sky']),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('LINEBEFORE', (0, 0), (0, -1), 5, C['blue']),
        ('ROUNDEDCORNERS', [0, 6, 6, 0]),
    ]))
    return [Spacer(1, 10), t, Spacer(1, 14)]

# ─── Main Document Builder ────────────────────────────────
def build_pdf(json_data, output_path):
    meta = {
        'title': json_data.get('title', 'EterX Report'),
        'subtitle': json_data.get('subtitle', ''),
        'author': json_data.get('author', 'EterX Intelligence'),
    }
    sections = json_data.get('sections', [])
    
    # Build document with cover page template
    def on_cover(canvas, doc):
        draw_cover(canvas, doc, meta)
    
    def on_content(canvas, doc):
        draw_header_footer(canvas, doc, meta)
    
    content_frame = Frame(MARGIN_L, MARGIN_B, PAGE_W - MARGIN_L - MARGIN_R,
                          PAGE_H - MARGIN_T - MARGIN_B, id='content')
    
    doc = BaseDocTemplate(output_path, pagesize=A4,
        title=meta['title'], author=meta['author'])
    
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[Frame(0, 0, PAGE_W, PAGE_H, id='cover_frame')],
                     onPage=on_cover),
        PageTemplate(id='content', frames=[content_frame], onPage=on_content),
    ])
    
    # Build story
    story = []
    
    # Cover page (empty frame, drawn by onPage)
    story.append(NextPageTemplate('content'))
    story.append(PageBreak())
    
    # Process sections
    for section in sections:
        sec_type = section.get('type', 'text')
        heading = section.get('heading', '')
        
        if heading:
            level = section.get('level', 1)
            story.extend(make_heading(heading, level))
        
        if sec_type == 'text':
            content = section.get('content', '')
            story.extend(make_text_content(content))
        
        elif sec_type == 'table':
            data = section.get('data', [])
            caption = section.get('caption', None)
            story.extend(make_table(data, caption))
        
        elif sec_type == 'chart':
            chart_type = section.get('chart_type', 'bar')
            chart_data = section.get('chart_data', {})
            story.extend(make_chart_matplotlib(chart_data, chart_type))
        
        elif sec_type == 'callout':
            content = section.get('content', '')
            ct = section.get('callout_type', 'info')
            story.extend(make_callout(content, ct))
        
        elif sec_type == 'kpi':
            kpis = section.get('kpis', [])
            story.extend(make_kpi_cards(kpis))
        
        elif sec_type == 'summary' or sec_type == 'executive_summary':
            content = section.get('content', '')
            story.extend(make_exec_summary(content))
        
        elif sec_type == 'page_break':
            story.append(PageBreak())
        
        elif sec_type == 'spacer':
            story.append(Spacer(1, section.get('height', 20)))
    
    doc.build(story)
    
    abs_path = os.path.abspath(output_path)
    print(f'PDF_OUTPUT:{abs_path}', flush=True)
    print(f'PDF_PAGES:{doc.page}', flush=True)
    print(f'PDF_SIZE:{os.path.getsize(abs_path)}', flush=True)
    return abs_path

# ─── CLI ──────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        if len(sys.argv) < 2:
            print('Usage: python eterx_pdf_gen.py <json_file_or_-_for_stdin> [output.pdf]', flush=True)
            sys.exit(1)
        
        source = sys.argv[1]
        output = sys.argv[2] if len(sys.argv) > 2 else 'report.pdf'
        
        if source == '-':
            raw = sys.stdin.read()
        elif os.path.isfile(source):
            with open(source, 'r', encoding='utf-8') as f:
                raw = f.read()
        else:
            raw = source  # Direct JSON string
        
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f'ERROR: Invalid JSON: {e}', flush=True)
            sys.exit(1)
        
        build_pdf(data, output)
        print(f'SUCCESS: Generated {output}', flush=True)
    except Exception as e:
        import traceback
        print(f'FATAL_ERROR: {type(e).__name__}: {e}', flush=True)
        traceback.print_exc()
        sys.exit(1)
