"""Dependency-free checks for the local booking-site changes."""
from html.parser import HTMLParser
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.anchors = []
        self.assets = []
        self.images = []
        self.json_script = False
        self.json_text = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f"Duplicate ID: {a['id']}"
            self.ids.add(a['id'])
        for key in ('src', 'href'):
            value = a.get(key, '')
            if value.startswith('#'):
                self.anchors.append(value[1:])
            elif value and not value.startswith(('https:', 'http:', 'mailto:', 'tel:')):
                self.assets.append(value)
        for key in ('srcset', 'imagesrcset'):
            for candidate in a.get(key, '').split(','):
                if candidate.strip():
                    self.assets.append(candidate.strip().split()[0])
        if tag == 'img':
            assert a.get('alt'), 'Image needs descriptive alternative text'
            self.images.append(a)
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.json_script = True
            self.json_text = ''

    def handle_data(self, data):
        if self.json_script:
            self.json_text += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.json_script:
            json.loads(self.json_text)
            self.json_script = False

html = (ROOT / 'index.html').read_text()
p = Page()
p.feed(html)
assert all(anchor in p.ids for anchor in p.anchors), set(p.anchors) - p.ids
assert all((ROOT / asset).is_file() for asset in p.assets)
assert html.count('https://www.bentral.com/service/embed/') == 10
assert html.count('/embed/booking.js?') == 1
assert html.index('id="book"') < html.index('id="hotel"'), 'Booking form should precede brochure content'
assert 'best rates' not in html.lower() and 'best available rates' not in html.lower()
assert html.count('class="mobile-book"') == 1
room_images = [image for image in p.images if '/optimized/' in image['src'] and '-suite.webp' in image['src']]
assert len(room_images) == 8
for image in room_images:
    data = (ROOT / image['src']).read_bytes()
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    assert len(data) < 150_000, image['src']
    assert int(image['width']) == 800 and int(image['height']) > 0
assert 'upload-key' not in html.lower(), 'Never expose the tour upload credential'
assert 'kuula.co' not in html, 'Do not promote the inaccessible private tour'
new_photos = [image for image in p.images if '/images/new/' in image['src']]
assert len(new_photos) == 3
assert {Path(image['src']).stem.split('-')[0] for image in new_photos} == {'NZR_1771', 'NZR_1792', 'NZR_1807'}, 'Keep the reviewed overview, window/view and bathroom selection; no repeated close-up'
assert html.index('src="theme.js"') < html.index('href="styles.css"'), 'Apply theme before styles paint'
assert 'role="switch" aria-checked="false" aria-label="Night mode"' in html
print('PASS: unique IDs, anchors, responsive image paths, alt text, JSON-LD, HTTPS embeds, early booking form, truthful rates, mobile CTA, 8 small room images, 3 new photos, pre-paint theme switch and credential-free public tour.')
