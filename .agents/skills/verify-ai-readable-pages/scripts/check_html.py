"""Read public HTML without JavaScript; no dependencies or signed-link crawling."""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


class PublicBody(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_body = False
        self.hidden = 0
        self.text = []
        self.headings = 0
        self.links = 0
        self.schema_types = set()
        self.schema_errors = 0
        self.schema_chunks = None

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.in_body = True
        if tag in ("script", "style", "template"):
            self.hidden += 1
        if tag == "script" and dict(attrs).get("type") == "application/ld+json":
            self.schema_chunks = []
        if self.in_body and not self.hidden:
            self.headings += tag == "h1"
            self.links += tag == "a" and any(key == "href" for key, _ in attrs)

    def handle_endtag(self, tag):
        if tag == "script" and self.schema_chunks is not None:
            try:
                schema = json.loads("".join(self.schema_chunks))
                records = schema if isinstance(schema, list) else [schema]
                for record in list(records):
                    if isinstance(record, dict) and isinstance(record.get("@graph"), list):
                        records.extend(record["@graph"])
                for record in records:
                    if not isinstance(record, dict):
                        continue
                    types = record.get("@type", [])
                    if isinstance(types, str):
                        types = [types]
                    if isinstance(types, list):
                        self.schema_types.update(t for t in types if isinstance(t, str))
            except json.JSONDecodeError:
                self.schema_errors += 1
            self.schema_chunks = None
        if tag in ("script", "style", "template"):
            self.hidden = max(0, self.hidden - 1)
        if tag == "body":
            self.in_body = False

    def handle_data(self, data):
        if self.schema_chunks is not None:
            self.schema_chunks.append(data)
        if self.in_body and not self.hidden:
            self.text.append(data)


def inspect(url, user_agent):
    request = Request(url, headers={
        "User-Agent": user_agent, "Cache-Control": "no-cache",
    })
    try:
        response = urlopen(request, timeout=40)
    except HTTPError as error:
        response = error
    with response:
        data = response.read(2 * 1024 * 1024 + 1)
        if len(data) > 2 * 1024 * 1024:
            raise ValueError("Document exceeds the 2 MiB audit limit")
        body = data.decode("utf-8", errors="replace")
        parser = PublicBody()
        parser.feed(body)
        text = " ".join(" ".join(parser.text).split())
        return {
            "userAgent": user_agent,
            "status": response.status,
            "responseDate": response.headers.get("Date"),
            "contentType": response.headers.get("Content-Type"),
            "bodyWords": len(text.split()),
            "h1Count": parser.headings,
            "linkCount": parser.links,
            "schemaTypes": sorted(parser.schema_types),
            "invalidSchemaBlocks": parser.schema_errors,
            "bodyTextHash": hashlib.sha256(text.encode()).hexdigest(),
            "bodyTextSample": text[:1800],
        }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check_html.py https://published-public-url/")
    url = sys.argv[1]
    parsed = urlsplit(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise SystemExit("Provide an HTTP(S) public URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SystemExit("Use a public URL without credentials, query strings, or fragments")
    agents = ["Mozilla/5.0", "ClaudeBot", "GPTBot", "Googlebot"]
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda agent: inspect(url, agent), agents))
    except Exception as error:
        raise SystemExit(f"HTTP audit failed ({type(error).__name__}); check connectivity/status")
    print(json.dumps({
        "url": url,
        "sameBodyTextAcrossHeaders": len({r["bodyTextHash"] for r in results}) == 1,
        "requests": results,
        "limitation": "Crawler-header tests do not establish actual crawler visits or indexing.",
    }, indent=2))
    if any(r["status"] != 200 for r in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
