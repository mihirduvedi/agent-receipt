#!/usr/bin/env python3
"""Build the Agent Receipt project guide PDF from its editable Markdown source."""

from __future__ import annotations

import html
import re
from functools import partial
from pathlib import Path
from typing import Iterable

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    HRFlowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PROJECT_GUIDE.md"
OUTPUT = ROOT / "output" / "pdf" / "agent-receipt-complete-project-guide.pdf"

PAGE_W, PAGE_H = LETTER
LEFT = 0.74 * inch
RIGHT = 0.62 * inch
TOP = 0.72 * inch
BOTTOM = 0.66 * inch
CONTENT_W = PAGE_W - LEFT - RIGHT

INK = colors.HexColor("#171C1A")
PAPER = colors.HexColor("#FBFAF5")
CANVAS = colors.HexColor("#EEECE3")
MUTED = colors.HexColor("#59605B")
LINE = colors.HexColor("#C9CCC5")
LINE_STRONG = colors.HexColor("#747B75")
SIGNAL = colors.HexColor("#C8F23F")
SIGNAL_DARK = colors.HexColor("#283400")
RED = colors.HexColor("#C94330")
RED_SOFT = colors.HexColor("#F7DED8")
GREEN = colors.HexColor("#27714A")
GREEN_SOFT = colors.HexColor("#DCEFE3")
AMBER_SOFT = colors.HexColor("#F7E8BF")


def register_fonts() -> None:
    georgia = Path("/System/Library/Fonts/Supplemental")
    arial = georgia
    pdfmetrics.registerFont(TTFont("Georgia", str(georgia / "Georgia.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", str(georgia / "Georgia Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Italic", str(georgia / "Georgia Italic.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-BoldItalic", str(georgia / "Georgia Bold Italic.ttf")))
    pdfmetrics.registerFont(TTFont("Arial", str(arial / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(arial / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(arial / "Arial Italic.ttf")))
    pdfmetrics.registerFont(TTFont("AndaleMono", str(arial / "Andale Mono.ttf")))
    pdfmetrics.registerFontFamily(
        "Georgia",
        normal="Georgia",
        bold="Georgia-Bold",
        italic="Georgia-Italic",
        boldItalic="Georgia-BoldItalic",
    )
    pdfmetrics.registerFontFamily(
        "Arial",
        normal="Arial",
        bold="Arial-Bold",
        italic="Arial-Italic",
        boldItalic="Arial-Italic",
    )


register_fonts()


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=LETTER,
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="Agent Receipt: The Complete Project Guide",
            author="Agent Receipt Authors",
            subject="Architecture, trust model, implementation, testing, and deployment",
            creator="Agent Receipt guide builder",
        )
        self.current_section = "Complete project guide"
        self._bookmark_id = 0
        # onPage draws the header before that page's flowables run, so the
        # live self.current_section is always one section stale for the
        # first page of a new Part/Appendix. Instead, look up each page's
        # header from the (page -> title) events recorded during the prior
        # multiBuild pass, the same stabilize-over-passes trick the TOC uses.
        self._section_events: list[tuple[int, str]] = []
        self._section_events_next: list[tuple[int, str]] = []

        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover-frame", showBoundary=0)
        body_frame = Frame(
            LEFT,
            BOTTOM,
            CONTENT_W,
            PAGE_H - TOP - BOTTOM,
            id="body-frame",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            showBoundary=0,
        )
        self.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover),
                PageTemplate(id="Body", frames=[body_frame], onPage=draw_body_chrome),
            ]
        )

    def beforeDocument(self) -> None:
        """Reset per-pass state so multiBuild can stabilize the TOC and headers."""
        self.current_section = "Complete project guide"
        self._bookmark_id = 0
        self._section_events = self._section_events_next or self._section_events
        self._section_events_next = []

    def section_title_for_page(self, page: int) -> str:
        title = "Complete project guide"
        for event_page, text in self._section_events:
            if event_page > page:
                break
            title = text
        return title

    def afterFlowable(self, flowable: Flowable) -> None:
        if not isinstance(flowable, Paragraph):
            return
        style_name = flowable.style.name
        if style_name not in {"PartMarker", "H2"}:
            return

        text = flowable.getPlainText()
        level = 0 if style_name == "PartMarker" else 1
        if level == 0:
            self.current_section = text
        elif self.current_section == "Complete project guide":
            self.current_section = text
        self._section_events_next.append((self.page, self.current_section))

        self._bookmark_id += 1
        key = f"section-{self._bookmark_id}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=False)
        if level == 1 and self.current_section.startswith("Appendix "):
            return
        self.notify("TOCEntry", (level, text, self.page, key))


def draw_cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setFillColor(SIGNAL)
    canvas.rect(42, PAGE_H - 78, 34, 34, fill=1, stroke=0)
    canvas.setFillColor(SIGNAL_DARK)
    canvas.setFont("Arial-Bold", 10)
    canvas.drawCentredString(59, PAGE_H - 66, "AR")

    canvas.setFillColor(SIGNAL)
    canvas.setFont("Arial-Bold", 8.2)
    canvas.drawString(88, PAGE_H - 55, "COMPLETE PROJECT GUIDE")
    canvas.setFillColor(colors.white)
    canvas.setFont("Georgia-Bold", 45)
    canvas.drawString(42, PAGE_H - 142, "Agent Receipt")
    canvas.setFont("Georgia", 19)
    canvas.drawString(44, PAGE_H - 178, "From first principles to architecture,")
    canvas.drawString(44, PAGE_H - 202, "trust, code, testing, and deployment")

    canvas.setStrokeColor(SIGNAL)
    canvas.setLineWidth(5)
    canvas.line(42, PAGE_H - 232, 122, PAGE_H - 232)
    canvas.setFillColor(colors.HexColor("#DADFD9"))
    canvas.setFont("Arial", 10.4)
    pitch = (
        "An evidence-linked receipt for what an AI agent did relative to "
        "what it was allowed to do."
    )
    Paragraph(
        html.escape(pitch),
        ParagraphStyle(
            "CoverPitch",
            fontName="Arial",
            fontSize=10.4,
            leading=15,
            textColor=colors.HexColor("#DADFD9"),
        ),
    ).wrapOn(canvas, 420, 70)
    p = Paragraph(
        html.escape(pitch),
        ParagraphStyle(
            "CoverPitch2",
            fontName="Arial",
            fontSize=10.4,
            leading=15,
            textColor=colors.HexColor("#DADFD9"),
        ),
    )
    p.wrapOn(canvas, 420, 70)
    p.drawOn(canvas, 44, PAGE_H - 294)

    screenshot = ROOT / "docs" / "screenshots" / "agent-receipt-overview.jpg"
    image = PILImage.open(screenshot)
    iw, ih = image.size
    box_w = PAGE_W - 84
    box_h = box_w * ih / iw
    y = 122
    canvas.setFillColor(PAPER)
    canvas.rect(38, y - 4, box_w + 8, box_h + 8, fill=1, stroke=0)
    canvas.drawImage(str(screenshot), 42, y, width=box_w, height=box_h, mask="auto")

    canvas.setFillColor(SIGNAL)
    canvas.rect(0, 0, PAGE_W, 16, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Arial", 7.8)
    canvas.drawString(42, 58, "VERSION 1.6  |  AUGUST 28, 2026")
    canvas.drawRightString(PAGE_W - 42, 58, "EDITABLE SOURCE: docs/PROJECT_GUIDE.md")
    canvas.restoreState()


def draw_body_chrome(canvas, doc: GuideDocTemplate) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setFillColor(INK)
    canvas.rect(0, PAGE_H - 29, PAGE_W, 29, fill=1, stroke=0)
    canvas.setFillColor(SIGNAL)
    canvas.setFont("Arial-Bold", 6.4)
    canvas.drawString(LEFT, PAGE_H - 24, "AGENT RECEIPT")
    canvas.setFillColor(colors.HexColor("#D8DDD8"))
    canvas.setFont("Arial", 6.4)
    section = doc.section_title_for_page(doc.page)
    if len(section) > 72:
        section = section[:69] + "..."
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 24, section.upper())

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, 39, PAGE_W - RIGHT, 39)
    canvas.setFillColor(MUTED)
    canvas.setFont("Arial", 6.7)
    canvas.drawString(LEFT, 25, "COMPLETE PROJECT GUIDE")
    canvas.setFont("Arial-Bold", 7.1)
    canvas.drawRightString(PAGE_W - RIGHT, 25, f"{doc.page:02d}")
    canvas.restoreState()


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=9.8,
            leading=14.0,
            textColor=INK,
            spaceAfter=6.0,
            allowWidows=0,
            allowOrphans=0,
        ),
        "Lead": ParagraphStyle(
            "Lead",
            fontName="Georgia",
            fontSize=12.2,
            leading=17.2,
            textColor=INK,
            spaceAfter=14,
        ),
        "Part": ParagraphStyle(
            "Part",
            fontName="Georgia-Bold",
            fontSize=28,
            leading=32,
            textColor=colors.white,
            leftIndent=18,
            rightIndent=18,
            spaceBefore=0,
            spaceAfter=0,
            keepWithNext=1,
        ),
        "PartMarker": ParagraphStyle(
            "PartMarker",
            fontName="Arial",
            fontSize=0.1,
            leading=0.1,
            textColor=PAPER,
            spaceBefore=0,
            spaceAfter=0,
            keepWithNext=1,
        ),
        "H2": ParagraphStyle(
            "H2",
            fontName="Georgia-Bold",
            fontSize=20,
            leading=24,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=8,
            # Not keepWithNext: several H2 sections are immediately followed
            # by a near-full-page table or diagram, and keepWithNext would
            # force that entire block to fit before the heading is allowed
            # to render, stranding the prior page mostly blank. A
            # CondPageBreak before the heading (see parse_markdown) gives
            # the same "don't orphan the heading" protection without that
            # all-or-nothing coupling.
            keepWithNext=0,
        ),
        "ClosingH2": ParagraphStyle(
            "H2",
            fontName="Georgia-Bold",
            fontSize=27,
            leading=31,
            textColor=colors.white,
            backColor=INK,
            borderPadding=(16, 18, 17, 18),
            spaceBefore=0,
            spaceAfter=16,
            keepWithNext=0,
        ),
        "H3": ParagraphStyle(
            "H3",
            fontName="Arial-Bold",
            fontSize=11.3,
            leading=14,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=1,
        ),
        "FAQQuestion": ParagraphStyle(
            "FAQQuestion",
            fontName="Georgia-Bold",
            fontSize=13.5,
            leading=16.5,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=2,
            keepWithNext=1,
        ),
        "H4": ParagraphStyle(
            "H4",
            fontName="Arial-Bold",
            fontSize=9.2,
            leading=12,
            textColor=GREEN,
            spaceBefore=7,
            spaceAfter=3,
            keepWithNext=1,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            fontName="Georgia",
            fontSize=9.8,
            leading=13.5,
            textColor=INK,
            leftIndent=2,
            spaceAfter=1.5,
        ),
        "Callout": ParagraphStyle(
            "Callout",
            fontName="Georgia-Italic",
            fontSize=9.8,
            leading=14.0,
            textColor=colors.white,
            spaceBefore=0,
            spaceAfter=0,
        ),
        "Code": ParagraphStyle(
            "Code",
            fontName="AndaleMono",
            fontSize=6.8,
            leading=9.3,
            textColor=colors.HexColor("#EFF3EF"),
            backColor=None,
            borderColor=None,
            borderPadding=0,
            leftIndent=0,
            rightIndent=0,
            spaceBefore=0,
            spaceAfter=0,
        ),
        "Caption": ParagraphStyle(
            "Caption",
            fontName="Arial",
            fontSize=7.2,
            leading=10,
            textColor=MUTED,
            spaceBefore=4,
            spaceAfter=10,
        ),
        "UtilityNote": ParagraphStyle(
            "UtilityNote",
            fontName="Georgia",
            fontSize=9.2,
            leading=12.6,
            textColor=INK,
            spaceBefore=0,
            spaceAfter=0,
            allowWidows=0,
            allowOrphans=0,
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            fontName="Arial-Bold",
            fontSize=7.2,
            leading=9,
            textColor=colors.white,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            fontName="Arial",
            fontSize=7.2,
            leading=9.5,
            textColor=INK,
        ),
        "TOCTitle": ParagraphStyle(
            "TOCTitle",
            fontName="Georgia-Bold",
            fontSize=30,
            leading=34,
            textColor=INK,
            spaceAfter=18,
        ),
    }


STYLES = make_styles()


def inline_markup(text: str, *, table_cell: bool = False) -> str:
    placeholders: dict[str, str] = {}

    def stash(value: str) -> str:
        key = f"@@PH{len(placeholders)}@@"
        placeholders[key] = value
        return key

    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        lambda m: stash(
            f'<link href="{html.escape(m.group(2), quote=True)}" color="#236BA2">'
            f'{html.escape(m.group(1))}</link>'
        ),
        text,
    )
    text = re.sub(
        r"`([^`]+)`",
        lambda m: stash(
            f'<font name="AndaleMono" color="#236BA2">{html.escape(m.group(1))}</font>'
        ),
        text,
    )
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(
        r"(?<![\"'=])(https://[^\s<]+)",
        lambda m: stash(
            f'<link href="{html.escape(m.group(1).rstrip(".,;"), quote=True)}" '
            f'color="#236BA2">{html.escape(m.group(1).rstrip(".,;"))}</link>'
        ),
        text,
    )
    for key, value in placeholders.items():
        text = text.replace(html.escape(key), value)
    if table_cell:
        text = text.replace("<br />", "<br/>")
    return text


def part_block(title: str) -> list[Flowable]:
    number_match = re.match(r"(Part\s+[IVX]+|Appendix\s+[A-Z])\s+-\s+(.*)", title)
    label = number_match.group(1).upper() if number_match else "SECTION"
    name = number_match.group(2) if number_match else title
    label_p = Paragraph(
        label,
        ParagraphStyle(
            "PartLabel",
            fontName="Arial-Bold",
            fontSize=7.5,
            leading=9,
            textColor=SIGNAL,
            leftIndent=18,
        ),
    )
    title_p = Paragraph(inline_markup(name), STYLES["Part"])
    block = Table(
        [[label_p], [title_p]],
        colWidths=[CONTENT_W],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), INK),
                ("TOPPADDING", (0, 0), (-1, 0), 16),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
                ("TOPPADDING", (0, 1), (-1, 1), 0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 18),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        ),
    )
    return [block, Spacer(1, 16)]


def markdown_table(rows: list[list[str]]) -> Table:
    cols = max(len(row) for row in rows)
    normalized = [row + [""] * (cols - len(row)) for row in rows]
    if len(normalized) > 1 and all(re.fullmatch(r"\s*:?-{3,}:?\s*", c) for c in normalized[1]):
        normalized.pop(1)

    lengths = [max(7, max(len(row[i]) for row in normalized)) for i in range(cols)]
    if cols == 2:
        total = sum(lengths)
        first = min(max(lengths[0] / total, 0.27), 0.44)
        widths = [CONTENT_W * first, CONTENT_W * (1 - first)]
    elif cols == 3:
        total = sum(lengths)
        shares = [max(0.20, min(0.48, value / total)) for value in lengths]
        scale = sum(shares)
        widths = [CONTENT_W * value / scale for value in shares]
    else:
        min_share = 0.12 if cols >= 6 else 0.16
        shares = [max(min_share, value / sum(lengths)) for value in lengths]
        scale = sum(shares)
        widths = [CONTENT_W * value / scale for value in shares]

    data = []
    for row_index, row in enumerate(normalized):
        style = STYLES["TableHeader"] if row_index == 0 else STYLES["TableCell"]
        data.append([Paragraph(inline_markup(cell, table_cell=True), style) for cell in row])

    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, colors.HexColor("#F2F0E8")]),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE_STRONG),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def image_flowables(src: str, alt: str) -> list[Flowable]:
    path = (SOURCE.parent / src).resolve()
    if not path.exists():
        return [Paragraph(f"[Missing image: {html.escape(src)}]", STYLES["Caption"])]
    with PILImage.open(path) as image:
        iw, ih = image.size
    width = CONTENT_W
    height = width * ih / iw
    if height > 4.25 * inch:
        height = 4.25 * inch
        width = height * iw / ih
    img = Image(str(path), width=width, height=height)
    img.hAlign = "CENTER"
    caption = Paragraph(f"FIGURE. {inline_markup(alt)}", STYLES["Caption"])
    return [KeepTogether([img, caption])]


def soft_wrap_code(code: str, width: int = 92) -> str:
    wrapped: list[str] = []
    for line in code.splitlines():
        if len(line) <= width:
            wrapped.append(line)
            continue
        indent = re.match(r"\s*", line).group(0)
        rest = line
        first = True
        while len(rest) > width:
            cut = rest.rfind(" ", 0, width)
            if cut <= len(indent) + 8:
                cut = width
            wrapped.append(rest[:cut])
            rest = indent + "  " + rest[cut:].lstrip()
            first = False
        if rest or first:
            wrapped.append(rest)
    return "\n".join(wrapped)


def code_block(code: str) -> Flowable:
    # Preformatted.draw() ignores style.backColor entirely, so the ink
    # background has to come from the wrapping Table instead.
    pre = Preformatted(soft_wrap_code(code), STYLES["Code"], maxLineLength=100)
    table = Table(
        [[pre]],
        colWidths=[CONTENT_W],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        ),
        hAlign="LEFT",
    )
    return [table, Spacer(1, 7)]


def callout_block(text: str) -> list[Flowable]:
    """Render a padded callout whose measured height includes its background."""
    paragraph = Paragraph(inline_markup(text), STYLES["Callout"])
    table = Table(
        [[paragraph]],
        colWidths=[CONTENT_W],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 13),
                ("RIGHTPADDING", (0, 0), (-1, -1), 13),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        ),
        hAlign="LEFT",
    )
    return [Spacer(1, 5), table, Spacer(1, 10)]


def operational_notes_block(codespaces_text: str, nextjs_text: str) -> list[Flowable]:
    """Keep the two short end-of-part implementation notes together."""
    cells = [
        Paragraph(f"<b>Codespaces.</b> {inline_markup(codespaces_text)}", STYLES["UtilityNote"]),
        Paragraph(f"<b>Next.js version warning.</b> {inline_markup(nextjs_text)}", STYLES["UtilityNote"]),
    ]
    table = Table(
        [cells],
        colWidths=[CONTENT_W * 0.62, CONTENT_W * 0.38],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F2F0E8")),
                ("BACKGROUND", (1, 0), (1, 0), GREEN_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.55, LINE_STRONG),
                ("INNERGRID", (0, 0), (-1, -1), 0.55, LINE_STRONG),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        ),
        hAlign="LEFT",
    )
    return [Spacer(1, 6), KeepTogether([table]), Spacer(1, 8)]


def section_keep_height(lines: list[str], next_index: int, title: str) -> float:
    """Reserve enough room for a heading and a meaningful section opening."""
    if title == "Closing perspective":
        return 390.0
    if title.startswith("42. Post-hackathon roadmap"):
        return 300.0
    if title.startswith("40. Security and privacy review model"):
        return 180.0
    if title.startswith("41. What remains before the hackathon release"):
        return 400.0
    if title.startswith("34. Testing live Granite safely"):
        return 210.0
    if title.startswith("33. Input format by example"):
        return 500.0
    if title.startswith("35. Daily development commands"):
        return 320.0
    if title.startswith("23. Visual and accessibility system"):
        return 280.0
    if title.startswith("18. Receipt orchestration"):
        return 170.0
    if title.startswith("5. The two synthetic stories"):
        return 210.0
    if title.startswith("7. Trust is divided across layers"):
        return 400.0

    index = next_index
    while index < len(lines) and not lines[index].strip():
        index += 1

    baseline = 104.0
    if index >= len(lines) or not lines[index].strip().startswith("```"):
        return baseline

    code_lines = 0
    index += 1
    while index < len(lines) and not lines[index].strip().startswith("```"):
        code_lines += 1
        index += 1
    return min(430.0, 60.0 + code_lines * STYLES["Code"].leading)


def parse_markdown(lines: list[str]) -> list[Flowable]:
    story: list[Flowable] = []
    index = 0
    # The introductory "How to use" section is a real preface, so every
    # numbered part should begin on a fresh page.
    first_part = False
    current_part = ""

    while index < len(lines):
        line = lines[index].rstrip("\n")
        stripped = line.strip()

        if not stripped:
            index += 1
            continue

        if stripped.startswith("```"):
            code_lines: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index].rstrip("\n"))
                index += 1
            index += 1
            story.extend(code_block("\n".join(code_lines)))
            continue

        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if image_match:
            story.extend(image_flowables(image_match.group(2), image_match.group(1)))
            index += 1
            continue

        if stripped == "---":
            # A rule immediately before a Part/Appendix heading is redundant:
            # that heading already forces its own page break, so drawing the
            # rule too can strand it alone on a near-blank page.
            next_stripped = next(
                (candidate.strip() for candidate in lines[index + 1 :] if candidate.strip()),
                "",
            )
            if not re.match(r"^#\s+", next_stripped):
                story.append(Spacer(1, 4))
                story.append(HRFlowable(width="100%", thickness=0.6, color=LINE_STRONG, spaceBefore=4, spaceAfter=10))
            index += 1
            continue

        heading = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            title = heading.group(2)
            if level == 3 and title == "Codespaces":
                note_index = index + 1
                while note_index < len(lines) and not lines[note_index].strip():
                    note_index += 1
                codespaces_lines: list[str] = []
                while note_index < len(lines) and lines[note_index].strip():
                    codespaces_lines.append(lines[note_index].strip())
                    note_index += 1
                while note_index < len(lines) and not lines[note_index].strip():
                    note_index += 1
                if note_index >= len(lines) or lines[note_index].strip() != "### Next.js version warning":
                    raise RuntimeError("Codespaces note is no longer followed by the Next.js version warning")
                note_index += 1
                while note_index < len(lines) and not lines[note_index].strip():
                    note_index += 1
                nextjs_lines: list[str] = []
                while note_index < len(lines) and lines[note_index].strip():
                    nextjs_lines.append(lines[note_index].strip())
                    note_index += 1
                story.extend(
                    operational_notes_block(
                        " ".join(codespaces_lines),
                        " ".join(nextjs_lines),
                    )
                )
                index = note_index
                continue
            if level == 1:
                if not first_part:
                    # Start every Part/Appendix on a fresh body page without
                    # emitting an extra blank page when the preceding block
                    # has already filled its frame exactly.
                    story.append(CondPageBreak(650))
                first_part = False
                current_part = title
                part_items = part_block(title)
                # The hidden paragraph carries bookmarks and TOC data.
                story.append(Paragraph(inline_markup(title), STYLES["PartMarker"]))
                story.extend(part_items)
            elif level == 2:
                if current_part.startswith("Appendix D"):
                    style = STYLES["FAQQuestion"]
                else:
                    story.append(CondPageBreak(section_keep_height(lines, index + 1, title)))
                    style = STYLES["ClosingH2"] if title == "Closing perspective" else STYLES["H2"]
                story.append(Paragraph(inline_markup(title), style))
                if title == "Closing perspective":
                    story.append(Spacer(1, 9))
            elif level == 3:
                if title == "Fixture B: Overreaching run":
                    story.append(CondPageBreak(360))
                style = STYLES["H4"] if title == "Next.js version warning" else STYLES["H3"]
                story.append(Paragraph(inline_markup(title), style))
            else:
                story.append(Paragraph(inline_markup(title), STYLES["H4"]))
            index += 1
            continue

        if stripped.startswith(">"):
            quote_lines = []
            while index < len(lines) and lines[index].lstrip().startswith(">"):
                quote_lines.append(lines[index].lstrip()[1:].strip())
                index += 1
            story.extend(callout_block(" ".join(quote_lines)))
            continue

        if stripped.startswith("|") and stripped.endswith("|"):
            rows: list[list[str]] = []
            while index < len(lines):
                candidate = lines[index].strip()
                if not (candidate.startswith("|") and candidate.endswith("|")):
                    break
                rows.append([cell.strip() for cell in candidate[1:-1].split("|")])
                index += 1
            story.append(markdown_table(rows))
            story.append(Spacer(1, 9))
            continue

        if re.match(r"^[-*]\s+", stripped):
            items: list[ListItem] = []
            while index < len(lines):
                candidate = lines[index].strip()
                match = re.match(r"^[-*]\s+(.*)$", candidate)
                if not match:
                    break
                items.append(ListItem(Paragraph(inline_markup(match.group(1)), STYLES["Bullet"]), leftIndent=14))
                index += 1
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    start="circle",
                    leftIndent=18,
                    bulletFontName="Arial-Bold",
                    bulletFontSize=7,
                    bulletColor=GREEN,
                    spaceAfter=6,
                )
            )
            continue

        if re.match(r"^\d+\.\s+", stripped):
            items = []
            start_number = int(re.match(r"^(\d+)\.", stripped).group(1))
            while index < len(lines):
                candidate = lines[index].strip()
                match = re.match(r"^\d+\.\s+(.*)$", candidate)
                if not match:
                    break
                items.append(ListItem(Paragraph(inline_markup(match.group(1)), STYLES["Bullet"]), leftIndent=17))
                index += 1
            story.append(
                ListFlowable(
                    items,
                    bulletType="1",
                    start=start_number,
                    leftIndent=21,
                    bulletFontName="Arial-Bold",
                    bulletFontSize=7.6,
                    bulletColor=GREEN,
                    spaceAfter=6,
                )
            )
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate:
                break
            if (
                candidate.startswith("#")
                or candidate.startswith("```")
                or candidate.startswith(">")
                or candidate == "---"
                or re.match(r"^[-*]\s+", candidate)
                or re.match(r"^\d+\.\s+", candidate)
                or (candidate.startswith("|") and candidate.endswith("|"))
                or re.fullmatch(r"!\[[^\]]*\]\([^)]+\)", candidate)
            ):
                break
            paragraph_lines.append(candidate)
            index += 1
        text = " ".join(paragraph_lines)
        style = STYLES["Lead"] if len(story) < 8 else STYLES["Body"]
        story.append(Paragraph(inline_markup(text), style))

    return story


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    source_lines = SOURCE.read_text(encoding="utf-8").splitlines()

    # The custom cover already renders the source title block and first screenshot.
    try:
        content_start = source_lines.index("## How to use this guide")
    except ValueError as exc:
        raise RuntimeError("Could not find guide content start") from exc
    content_lines = source_lines[content_start:]

    story: list[Flowable] = [NextPageTemplate("Body"), PageBreak()]
    story.append(Paragraph("Contents", STYLES["TOCTitle"]))
    story.append(
        Paragraph(
            "A layered route from the product idea to the complete technical reference.",
            STYLES["Lead"],
        )
    )
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "TOCPart",
            fontName="Arial-Bold",
            fontSize=7.8,
            leading=10.2,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
            spaceBefore=4.5,
        ),
        ParagraphStyle(
            "TOCChapter",
            fontName="Arial",
            fontSize=7.1,
            leading=9.2,
            leftIndent=14,
            firstLineIndent=0,
            textColor=MUTED,
        ),
    ]
    story.append(toc)
    story.append(PageBreak())
    story.append(Paragraph("Preface", STYLES["PartMarker"]))
    story.extend(parse_markdown(content_lines))

    doc = GuideDocTemplate(str(OUTPUT))
    doc.multiBuild(story, canvasmaker=partial(Canvas, initialFontName="Arial"))
    print(OUTPUT)


if __name__ == "__main__":
    build()
