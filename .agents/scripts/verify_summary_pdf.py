"""Check the summary PDF and render a preview for visual inspection."""
from pathlib import Path
import subprocess

try:
    import fitz
except ModuleNotFoundError:
    fitz = None

pdf_path = Path(".local/outputs/eventcarpooling-project-one-pager.pdf")
if fitz:
    with fitz.open(pdf_path) as document:
        assert document.page_count == 1, "Summary must fit on one page"
        page = document[0]
        assert tuple(page.rect)[2:] == (612.0, 792.0), "Expected US Letter size"
        text = page.get_text()
        page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6)).save("/tmp/eventcarpooling-pdf-preview.png")
else:
    # Use existing system tools rather than installing report-only app dependencies.
    info = subprocess.check_output(["pdfinfo", str(pdf_path)], text=True)
    metadata = dict(line.split(":", 1) for line in info.splitlines() if ":" in line)
    assert int(metadata["Pages"].strip()) == 1, "Summary must fit on one page"
    assert "612 x 792 pts" in metadata["Page size"], "Expected US Letter size"
    text = subprocess.check_output(["pdftotext", str(pdf_path), "-"], text=True)
    subprocess.run([
        "pdftoppm", "-f", "1", "-singlefile", "-scale-to", "1300", "-png",
        str(pdf_path), "/tmp/eventcarpooling-pdf-preview",
    ], check=True)
for value in (
    "austincares.eventcarpooling.com", "34,314", "535", "82",
    "Plus 7", "13", "Sources", "October 1, 2026", "America/Chicago",
    "not verified successful", "not a strict count",
):
    assert value.lower() in text.lower(), f"Missing content: {value}"
print(f"Verified one-page US Letter PDF with selectable text: {pdf_path.stat().st_size:,} bytes")