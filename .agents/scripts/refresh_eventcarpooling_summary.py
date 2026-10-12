"""Preserve the earlier one-pager and build a dated, self-contained refresh."""
from pathlib import Path
import base64
import subprocess
import sys
import xml.etree.ElementTree as ET

OUT = Path(".local/outputs")
OLD = OUT / "eventcarpooling-one-page-summary-2026-10-10"
NEW = OUT / "eventcarpooling-one-page-summary-2026-10-12"


def render_and_verify(stem, preview, required=()):
    info = subprocess.check_output(["pdfinfo", str(stem) + ".pdf"], text=True)
    metadata = dict(line.split(":", 1) for line in info.splitlines() if ":" in line)
    assert int(metadata["Pages"].strip()) == 1, "Expected exactly one page"
    assert "612 x 792 pts" in metadata["Page size"], "Expected US Letter"
    text = subprocess.check_output(["pdftotext", str(stem) + ".pdf", "-"], text=True)
    for phrase in required:
        assert phrase in text, f"Missing selectable text: {phrase}"
    bbox = subprocess.check_output(["pdftotext", "-bbox", str(stem) + ".pdf", "-"], text=True)
    words = ET.fromstring(bbox).findall(".//{http://www.w3.org/1999/xhtml}word")
    assert words and all(0 <= float(w.attrib["yMin"]) < float(w.attrib["yMax"]) <= 767 for w in words), "Text outside printable page"
    subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-scale-to", "1400", "-png", str(stem) + ".pdf", preview], check=True)
    print(f"Verified one-page PDF and selectable text: {stem}.pdf")


if "--verify" in sys.argv:
    render_and_verify(NEW, "/tmp/eventcarpooling-summary-new", (
        "Spock Assistant", "38,920", "210 tracked", "557", "15",
        "October 12, 2026", "America/Chicago", "not verified successful",
        "Humans review every city request", "AustinCares", "Austin 11",
    ))
    subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-r", "300", "-jpeg", "-jpegopt", "quality=95,optimize=y", str(NEW) + ".pdf", str(NEW)], check=True)
else:
    render_and_verify(OLD, "/tmp/eventcarpooling-summary-old")
    html = Path(str(OLD) + ".html").read_text()
    replacements = {
        "2026-10-10": "2026-10-12",
        "October 10, 2026": "October 12, 2026",
        'class="number">11<': 'class="number">12<',
        "10 city event guides": "11 city event guides",
        "37,416": "38,920",
        "193 tracked source files": "210 tracked source files",
        'class="number">543<': 'class="number">557<',
        'class="number">14<': 'class="number">15<',
        "Austin 10;": "Austin 11;",
        "Recent rebuild · Now live": "Public-page rebuild · Live",
        "Event structured data is emitted where verified dates and venue details are available; coverage is partial.":
            "Event structured data requires verified dates and venue details; not all listings qualify.",
        "The public web service now server-renders <strong>real HTML</strong> instead of an empty JavaScript-only shell. AI tools and search crawlers can read platform, city, digest, event, venue, and About pages without running JavaScript. Event pages include direct answers and FAQs; canonical links, robots files, and XML sitemaps support discovery.":
            "The public service delivers <strong>server-readable HTML</strong> for platform, city, digest, event, venue, and About pages. Direct answers, FAQs, canonical links, robots files, and XML sitemaps support discovery; JavaScript powers interactive features.",
        "Local branding, city onboarding, tenant isolation, and authorized administration.":
            "Local branding, tenant isolation, and authorized administration. Two-field city requests are reviewed manually, with requester acknowledgement emails; no instant city launch.",
        "<strong>OpenAI · Replit AI Integrations</strong><p>AI-assisted event extraction and Japanese translation.</p>":
            "<strong>OpenAI · Replit AI Integrations</strong><p>AI-assisted extraction and Japanese translation; Spock represents the team’s research and drafting assistance.</p>",
        "font-size:33px;line-height:1.15": "font-size:31px;line-height:1.15",
        ".rebuild{padding:14px 17px;margin-bottom:20px": ".rebuild{padding:11px 14px;margin-bottom:12px",
        "li{margin:0 0 9px}": "li{margin:0 0 7px}",
        ".metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:20px 0;padding:14px 0;":
            ".metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:15px 0;padding:11px 0;",
        "footer{margin-top:16px;padding-top:10px": "footer{margin-top:12px;padding-top:8px",
    }
    for old, new in replacements.items():
        assert old in html, f"Earlier source changed: {old}"
        html = html.replace(old, new)
    mascot = base64.b64encode(Path("artifacts/austin-events/public/images/spock-mascot.png").read_bytes()).decode()
    spock = (
        '<section class="rebuild spock"><img alt="Spock Assistant, the EventCarpooling team helper" src="data:image/png;base64,'
        + mascot
        + '"><div><span class="kicker">Human-reviewed AI assistance · Live</span>'
        '<h2>Meet Spock Assistant</h2>'
        '<p>Our behind-the-scenes robot assistant helps the team <strong>research local events, organize city guides, and draft weekly newsletters</strong>. '
        '<strong>Humans review every city request and approve what gets published.</strong></p>'
        '<p class="qualification">A team helper—not a public chatbot, automatic city approver, or guarantee of complete event coverage.</p></div></section>\n'
    )
    html = html.replace('<div class="columns">', spock + '<div class="columns">', 1)
    html = html.replace("</style>", ".spock{display:flex;align-items:center;gap:13px;background:#f2f6fa;border-left-color:#365b78}.spock img{width:62px;height:72px;object-fit:contain;flex-shrink:0}.spock h2{font-size:18px}.spock .qualification{margin-top:5px}\n</style>", 1)
    Path(str(NEW) + ".html").write_text(html)
    print(f"Created self-contained refreshed source: {NEW}.html")
