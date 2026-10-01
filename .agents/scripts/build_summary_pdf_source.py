"""Generate the PDF-only summary variant without changing the other formats."""
from pathlib import Path
import re

output_dir = Path(".local/outputs")
source = (output_dir / "eventcarpooling-project-one-pager-image-source.html").read_text()
updated, count = re.subn(
    r'\s*<section class="newsletter" aria-labelledby="newsletter-title">.*?</section>',
    "",
    source,
    flags=re.DOTALL,
)
assert count == 1, "Expected exactly one subscriber-sent editions section"
assert "Recorded subscriber-sent newsletter editions" not in updated
(output_dir / "eventcarpooling-project-one-pager-pdf-source.html").write_text(updated)
print("Generated PDF-only source without the subscriber-sent editions breakdown")