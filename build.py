#!/usr/bin/env python3
"""Build de Añelo Plaza Shopping — genera un ÚNICO HTML autocontenido.

    python3 build.py            -> html/index.html  (noindex: versión de desarrollo)
    python3 build.py --index    -> html/index.html  indexable (usar recién para el lanzamiento)

Fuentes editables:  src/index.html · src/css/styles.css · src/js/app.js · src/data/site.json
Assets:             fotos/ · planos/ · logos/ · iconos/ · fonts/ · brochures/ · vendor/
Todo se embebe en base64 (fotos en WebP). Sin CDN, sin build de npm.
Requiere: Python 3.9+ y Pillow con soporte WebP.
"""
import base64, io, json, os, re, sys, glob
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
INDEX = "--index" in sys.argv
read = lambda p, m="r": open(P(p), m, **({} if "b" in m else {"encoding": "utf-8"})).read()

def b64(data, mime): return "data:%s;base64,%s" % (mime, base64.b64encode(data).decode())

def webp(path, maxs=1500, q=74):
    im = Image.open(P(path)); alpha = im.mode in ("RGBA", "LA", "P")
    im = im.convert("RGBA" if alpha else "RGB"); im.thumbnail((maxs, maxs), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=90 if alpha else q, method=6)
    return b64(buf.getvalue(), "image/webp")

def file_uri(path):
    ext = path.rsplit(".", 1)[-1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "svg": "image/svg+xml", "woff2": "font/woff2", "webp": "image/webp"}[ext]
    return b64(read(path, "rb"), mime)

# ---------------- Logos: un <symbol> por archivo + variantes por viewBox ----------------
LOGOS = {  # id: (archivo, ancho, alto, [viewBox por variante])
    "op1": ("logos/aps-logo.svg", 2732.9, 3623.1, ["600 272 1492 612", "600 1118 1492 614", "600 1963 1492 614", "600 2810 1492 612"]),
    "op2": ("logos/aps-logo-horizontal.svg", 8102.8, 5624.21, ["860 -20 5906 733", "860 795 5906 734", "860 1757 5906 739", "860 2577 5906 739",
             "860 -20 5906 520", "860 795 5906 520", "860 1757 5906 520", "860 2577 5906 520"]),  # 4-7: sin tagline (barra)
    "op3": ("logos/aps-logo-simbolo.svg", 7852.61, 7936.59, ["1440 -30 4972 1420", "1440 1889 4972 1434", "1440 3813 4972 1434", "1440 5732 4972 1439"]),
    "sim": ("logos/aps-simbolo.svg", 922.8, 3623.1, ["195 348 438 324", "195 1138 438 325", "195 2152 438 325", "195 2929 438 325"]),
}
# variantes: op1/op2/op3 -> 0 negro · 1 gris · 2 blanco · 3 crema | sim -> 0 blanco · 1 crema · 2 negro · 3 gris
def svg_inner(path, pid):
    s = read(path)
    s = re.sub(r"<\?xml.*?\?>|<!--.*?-->", "", s, flags=re.S)
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    inner = re.sub(r"\.st(\d)", r".%s-st\1" % pid, inner)
    inner = re.sub(r'class="st(\d)"', r'class="%s-st\1"' % pid, inner)
    inner = inner.replace("<text/>", "")
    return re.sub(r">\s+<", "><", inner).strip()

sprites = ['<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>']
for pid, (f, w, h, _) in LOGOS.items():
    sprites.append('<symbol id="lg-%s" viewBox="0 0 %s %s">%s</symbol>' % (pid, w, h, svg_inner(f, pid)))
ico = svg_inner("iconos/ui/iconos-ui.svg", "ico").replace("fill: #606060", "fill: currentColor")
sprites.append('<symbol id="ico-ui" viewBox="0 0 768 768">%s</symbol>' % ico)
sprites.append("</defs></svg>")

def logo(pid, var, cls=""):
    f, w, h, vbs = LOGOS[pid]
    return ('<svg class="%s" viewBox="%s" role="img" aria-label="Añelo Plaza Shopping"><use href="#lg-%s" width="%s" height="%s"/></svg>'
            % (cls, vbs[int(var)], pid, w, h))
sprites.append('<div id="pinLeaf" hidden>%s</div>' % logo("sim", 3))

ICO = {"bag": (0, 0), "phone": (1, 0), "wifi": (2, 0), "cal": (3, 0), "cam": (0, 1), "img": (1, 1), "pin": (2, 1), "tag": (3, 1),
       "clock": (0, 2), "stairs": (1, 2), "car": (2, 2), "wc": (3, 2), "chat": (0, 3), "info": (1, 3), "arrow": (2, 3), "exit": (3, 3)}
def icon(name):
    if name == "wa": return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>'
    c, r = ICO[name]
    return '<svg class="ico" viewBox="%d %d 112 112" aria-hidden="true"><use href="#ico-ui" width="768" height="768"/></svg>' % (c * 192 + 40, r * 192 + 40)

# ---------------- Contenido generado ----------------
site = json.loads(read("src/data/site.json"))
RUBROS = [("cafeterias", "Cafeterías", "Cafés"), ("supermercado", "Supermercado", "Supermarket"), ("indumentaria", "Indumentaria", "Apparel"),
          ("coworking", "Co-working", "Co-working"), ("farmacias", "Farmacias", "Pharmacies"), ("librerias", "Librerías", "Bookstores"),
          ("rentcar", "Rent a car", "Car rental"), ("perfumerias", "Perfumerías", "Beauty"), ("tecnologia", "Tecnología", "Technology"),
          ("electrodomesticos", "Electrodomésticos", "Appliances"), ("gimnasios", "Gimnasios", "Gyms"), ("restaurantes", "Restaurantes", "Restaurants"),
          ("opticas", "Ópticas", "Optics"), ("turismo", "Turismo", "Travel")]
rubros = "".join('<div class="rubro"><img src="%s" alt="" width="56" height="56"><span><span class="l-es">%s</span><span class="l-en">%s</span></span></div>'
                 % (webp("iconos/rubros/%s.png" % k, 160), es, en) for k, es, en in RUBROS)
SERV = [("wifi", "Wifi", "Wi-Fi"), ("parking", "Estacionamiento", "Parking"), ("ubicacion", "Ubicación estratégica", "Strategic location"),
        ("vigilancia", "Vigilancia", "CCTV surveillance"), ("seguridad", "Seguridad", "Security staff")]
servicios = "".join('<div class="serv"><img src="%s" alt="" width="46" height="46"><span><span class="l-es">%s</span><span class="l-en">%s</span></span></div>'
                    % (webp("iconos/servicios/%s.png" % k, 140), es, en) for k, es, en in SERV)

obra = sorted(glob.glob(P("fotos", "obra", "*.jpg")), reverse=True)
obra_html = "".join('<figure data-date="%s"><img data-img="obra/%s" alt="Avance de obra · %s" loading="lazy"></figure>'
                    % (os.path.basename(f)[:10], os.path.basename(f)[:-4], os.path.basename(f)[:10]) for f in obra)

L = site["links"]
yt = lambda vid: "https://www.youtube.com/watch?v=" + vid
PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
btn_video = ('<a class="btn btn-ghost" href="%s" target="_blank" rel="noopener">%s<span class="l-es">Video oficial</span><span class="l-en">Official video</span></a>'
             % (yt(L["video_oficial_youtube_id"]), PLAY)) if L.get("video_oficial_youtube_id") else ""
btn_avance = ('<div class="btns" style="margin-top:24px"><a class="btn btn-ghost on-dark" href="%s" target="_blank" rel="noopener">%s<span class="l-es">Ver video de avance de obra</span><span class="l-en">Watch construction video</span></a></div>'
              % (yt(L["avance_obra_youtube_id"]), PLAY)) if L.get("avance_obra_youtube_id") else ""

# ---------------- Base de imágenes (una sola copia en base64) ----------------
imgdb = {}
for f in sorted(glob.glob(P("fotos", "renders", "*.jpg"))):
    imgdb["renders/" + os.path.basename(f)[:-4]] = webp(os.path.relpath(f, ROOT), 1800 if "aerea" in f or "ext-5" in f else 1500)
for f in obra:
    imgdb["obra/" + os.path.basename(f)[:-4]] = webp(os.path.relpath(f, ROOT), 1200, 70)
for f in sorted(glob.glob(P("planos", "*.png"))):
    imgdb["planos/" + os.path.basename(f)[:-4]] = webp(os.path.relpath(f, ROOT), 1400)

imgdb["brochure/portada"] = webp("brochures/portada.jpg", 1200)
bro_path = "brochures/Anelo_Plaza_Shopping_Comercial_2026.pdf"
bro = read(bro_path, "rb")

jsonld = {"@context": "https://schema.org", "@type": "ShoppingCenter", "name": "Añelo Plaza Shopping",
          "slogan": "Un paseo, mil experiencias", "url": "https://" + site["contacto"]["dominio"],
          "telephone": site["contacto"]["telefonos"][0], "email": site["contacto"]["email"],
          "address": {"@type": "PostalAddress", "addressLocality": "Añelo", "addressRegion": "Neuquén", "addressCountry": "AR"},
          "geo": {"@type": "GeoCoordinates", "latitude": site["ubicacion"]["lat"], "longitude": site["ubicacion"]["lng"]}}

leaf_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" fill="#606060">%s</svg>' % (
    LOGOS["sim"][3][3], re.sub(r'class="sim-st\d"', "", svg_inner("logos/aps-simbolo.svg", "sim")).split("</defs>")[-1])
css = read("src/css/styles.css")
css = re.sub(r"\{\{font:([^}]+)\}\}", lambda m: file_uri(m.group(1)), css)
css += "\n:root{--leaf:url(\"%s\")}\n.leaf-bg::before{opacity:.05}\n.sec.dark.leaf-bg::before{opacity:.04}\n" % b64(leaf_svg.encode(), "image/svg+xml")

tok = {
    "css": css, "js": read("src/js/app.js"), "sprites": "".join(sprites),
    "leaflet_css": read("vendor/leaflet.css"), "leaflet_js": read("vendor/leaflet.js"),
    "site": json.dumps(site, ensure_ascii=False).replace("</", "<\\/"), "imgdb": json.dumps(imgdb),
    "brochure": base64.b64encode(bro).decode(), "bro_size": "%.1f MB" % (len(bro) / 1048576),
    "rubros": rubros, "servicios": servicios, "obra_fotos": obra_html, "btn_video": btn_video, "btn_avance": btn_avance,
    "meta_robots": "" if INDEX else '<meta name="robots" content="noindex,nofollow">',
    "jsonld": json.dumps(jsonld, ensure_ascii=False), "favicon": b64(leaf_svg.encode(), "image/svg+xml"),
}
html = read("src/index.html")
html = re.sub(r"\{\{logo:(\w+):(\d)(?::([^}]*))?\}\}", lambda m: logo(m.group(1), m.group(2), m.group(3) or ""), html)
html = re.sub(r"\{\{ico:(\w+)\}\}", lambda m: icon(m.group(1)), html)
html = re.sub(r"\{\{img:([^}]+)\}\}", lambda m: webp(m.group(1), 600), html)
missing = []
def sub(m):
    k = m.group(1)
    if k not in tok: missing.append(k); return m.group(0)
    return tok[k]
html = re.sub(r"\{\{(\w+)\}\}", sub, html)
if missing: sys.exit("Tokens sin resolver: %s" % missing)
# chequeo: toda data-img referenciada existe
refs = set(re.findall(r'data-img="([^"]+)"', html)); falt = refs - set(imgdb)
if falt: sys.exit("Imágenes faltantes: %s" % falt)

os.makedirs(P("html"), exist_ok=True)
open(P("html", "index.html"), "w", encoding="utf-8").write(html)
mb = os.path.getsize(P("html", "index.html")) / 1048576
print("html/index.html  %.1f MB  (%s)  · %d imágenes" % (mb, "indexable" if INDEX else "noindex", len(imgdb)))
if mb > 30: print("! Supera 30 MiB: bajar calidad WebP")
