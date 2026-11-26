#!/usr/bin/env python3
"""Build index.html and assets/js/i18n.js from src/.

English lives in the HTML template (single source). Bangla lives in src/i18n/bn.json.
Strings that are not in the DOM (terminal answers, date labels) live in src/i18n/en.extra.json
and must also exist in bn.json. The build fails if any key is missing or empty in either language.

Usage: python3 scripts/build.py [--check]
"""
import html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
VOID = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr","use","path","rect","circle"}


class Extract(HTMLParser):
    """Collect English text for every data-i18n / data-i18n-html / data-i18n-attr key."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack = []  # [tag, key, mode, buffer]
        self.found = {}
        self.errors = []

    def add(self, key, val):
        val = val.strip()
        if key in self.found and self.found[key] != val:
            self.errors.append(f"key {key!r} has two different English texts:\n  {self.found[key]!r}\n  {val!r}")
        self.found[key] = val

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for frame in self.stack:
            if frame[2] == "html":
                frame[3].append(self.get_starttag_text())
        if "data-i18n-attr" in a:
            for pair in a["data-i18n-attr"].split(";"):
                attr, key = pair.split(":")
                self.add(key, html.unescape(a.get(attr, "")))
        if tag in VOID:
            return
        key = a.get("data-i18n") or a.get("data-i18n-html")
        mode = "text" if "data-i18n" in a else ("html" if "data-i18n-html" in a else None)
        self.stack.append([tag, key, mode, []])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            t, key, mode, buf = self.stack.pop()
            if mode:
                raw = "".join(buf)
                if mode == "text":
                    if "<" in raw:
                        self.errors.append(f"data-i18n {key!r} contains markup; use data-i18n-html")
                    raw = html.unescape(raw)
                self.add(key, re.sub(r"\s+", " ", raw))
            if t == tag:
                for frame in self.stack:
                    if frame[2] == "html":
                        frame[3].append(f"</{tag}>")
                break

    def handle_data(self, data):
        for frame in self.stack:
            if frame[2]:
                frame[3].append(data)

    def handle_entityref(self, name):
        self.handle_data(f"&{name};")

    def handle_charref(self, name):
        self.handle_data(f"&#{name};")


def cert_html(certs):
    def group(c):
        u = c["url"]
        if "academy.claude.com" in u: return "anthropic"
        if "linkedin.com" in u: return "linkedin"
        if "coursera.org" in u: return "coursera"
        return "other"
    months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    certs = sorted(certs, key=lambda c: c["date"], reverse=True)
    out = []
    for c in certs:
        y, m = c["date"].split("-")
        e = html.escape
        cid = c["id"].replace("ID: ", "").replace("Issuer: ", "")
        out.append(
            f'      <a class="cert" href="{e(c["url"])}" target="_blank" rel="noopener" data-g="{group(c)}">'
            f'<span class="c-meta"><span>{e(c["issuer"])}</span><time class="c-date" datetime="{c["date"]}">{months[int(m)-1]} {y}</time></span>'
            f'<span class="c-title">{e(c["title"])}</span>' +
            (f'<span class="c-meta"><span class="mono">{e(cid)}</span></span>' if c["id"].startswith("ID") else "") +
            (f'<span class="c-verify"><span data-i18n="cr.verify">Verify credential</span>' if "verify" in c["url"] else f'<span class="c-verify"><span data-i18n="cr.site">Issuer website</span>')+
            f'<svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a>'
        )
    return "\n".join(out), len(certs)


def main():
    check_only = "--check" in sys.argv
    tpl = (SRC / "index.template.html").read_text(encoding="utf-8")
    certs = json.loads((SRC / "data/certs.json").read_text(encoding="utf-8"))
    block, n = cert_html(certs)
    page = tpl.replace("<!--CERTS-->", block)

    # Company logos: drop a file at assets/img/logos/<key>.svg|png|webp|jpg and rebuild.
    # Without a file, a monogram tile is shown instead.
    def logo(m):
        key, mono = m.group(1), m.group(2)
        for ext in ("svg", "png", "webp", "jpg"):
            if (ROOT / f"assets/img/logos/{key}.{ext}").exists():
                return f'<span class="logo" aria-hidden="true"><img src="assets/img/logos/{key}.{ext}" alt="" width="40" height="40" loading="lazy"></span>'
        return f'<span class="logo mono-l" aria-hidden="true">{mono}</span>'
    page = re.sub(r"<!--LOGO:([a-z0-9-]+)\|([^>]+?)-->", logo, page)

    ex = Extract()
    ex.feed(page)
    en = dict(ex.found)
    extra = json.loads((SRC / "i18n/en.extra.json").read_text(encoding="utf-8"))
    for k, v in extra.items():
        if k in en:
            ex.errors.append(f"extra key {k!r} duplicates a DOM key")
        en[k] = v
    bn = json.loads((SRC / "i18n/bn.json").read_text(encoding="utf-8"))

    errors = list(ex.errors)
    for k, v in en.items():
        if not v:
            errors.append(f"empty English text for {k!r}")
        if not str(bn.get(k, "")).strip():
            errors.append(f"missing Bangla for {k!r}: {v!r}")
    for k in bn:
        if k not in en:
            errors.append(f"unused Bangla key {k!r}")
    # html keys must keep the same tags in both languages
    for k in [k for k in en if re.search(r"<\w", en[k])]:
        if sorted(re.findall(r"</?\w+", en[k])) != sorted(re.findall(r"</?\w+", bn.get(k, ""))):
            errors.append(f"markup differs between languages for {k!r}")
    if str(n) not in en.get("cr.h", "") or str(n) not in en.get("cr.more", ""):
        errors.append("certificate count in credentials heading does not match data")

    if errors:
        print("i18n check FAILED:\n- " + "\n- ".join(errors))
        sys.exit(1)
    print(f"i18n OK: {len(en)} keys, English and Bangla complete; {n} certifications")
    if check_only:
        return
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    js = "/* Generated by scripts/build.py. Edit src/index.template.html and src/i18n/*.json instead. */\n"
    js += "window.I18N = " + json.dumps({"en": en, "bn": bn}, ensure_ascii=False, indent=0, sort_keys=True) + ";\n"
    (ROOT / "assets/js/i18n.js").write_text(js, encoding="utf-8")
    glsl = (SRC / "shader/hero.bundled.glsl").read_text(encoding="utf-8")
    shader_js = (SRC / "hero-shader.template.js").read_text(encoding="utf-8").replace("/*GLSL*/", json.dumps(glsl))
    (ROOT / "assets/js/hero-shader.js").write_text(shader_js, encoding="utf-8")
    print("wrote index.html, assets/js/i18n.js and assets/js/hero-shader.js")


if __name__ == "__main__":
    main()
