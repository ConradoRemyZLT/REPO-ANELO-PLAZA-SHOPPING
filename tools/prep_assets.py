#!/usr/bin/env python3
"""Prepara los assets del sitio a partir de la carpeta de Marketing y Diseño de APS.

Uso:  python3 tools/prep_assets.py "<ruta a Añelo-Plaza-Shopping>"

Genera (dentro del repo):
  fotos/renders/*.jpg   renders exteriores e interiores (máx. 1500 px, q82)
  fotos/obra/*.jpg      fotos de avance de obra, nombradas por fecha
  planos/*.png          plantas por lote recortadas del brochure comercial 2026
  iconos/rubros, iconos/servicios  íconos con alfa (para usar como máscara CSS)
  logos/*.svg           logos oficiales sin el fondo del artboard
  brochures/*.pdf       brochure comercial vigente

Reglas: exif_transpose antes de escalar, LANCZOS, nunca deformar (solo recortes),
PNG con alfa SIN optimize=True.
Requiere: pillow, pillow-heif, numpy, poppler-utils (pdfimages).
"""
import sys, os, re, shutil, subprocess, glob, tempfile
from PIL import Image, ImageOps
import numpy as np

try:
    import pillow_heif; pillow_heif.register_heif_opener()
except ImportError:
    print("! pillow-heif no instalado: se saltean los HEIC")

SRC = sys.argv[1] if len(sys.argv) > 1 else "../Añelo-Plaza-Shopping"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRO = os.path.join(SRC, "Añelo_Plaza_Shopping_Comercial_2026_comp.pdf")
MAXS = 1500

def out(*p):
    path = os.path.join(REPO, *p); os.makedirs(os.path.dirname(path), exist_ok=True); return path

def save_jpg(im, path, maxs=MAXS):
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((maxs, maxs), Image.LANCZOS)
    im.save(path, "JPEG", quality=82, progressive=True)

# ---------- Brochure: extraer las páginas (son imágenes 3000x1687) ----------
tmp = tempfile.mkdtemp()
subprocess.run(["pdfimages", "-j", BRO, os.path.join(tmp, "p")], check=True)
page = lambda n: Image.open(os.path.join(tmp, "p-%03d.jpg" % (n - 1)))
shutil.copy(BRO, out("brochures", "Anelo_Plaza_Shopping_Comercial_2026.pdf"))

# Renders del brochure: se recorta la franja inferior (logo + url sobreimpresos)
BRO_RENDERS = {2: "aerea-conjunto", 5: "fachada-ciclovia", 7: "gastronomia-exterior",
               9: "interior-fitness", 15: "interior-oficina", 16: "interior-libreria"}
for n, name in BRO_RENDERS.items():
    im = page(n); w, h = im.size
    save_jpg(im.crop((0, 0, w, int(h * 0.885))), out("fotos", "renders", name + ".jpg"))
# Portada del brochure (para la sección de descarga)
save_jpg(page(1), out("brochures", "portada.jpg"), 1400)
# Vista aérea con pines (ubicación) — se conserva completa
im = page(11); save_jpg(im, out("fotos", "renders", "ubicacion-aerea.jpg"), 1800)

# Renders sueltos
for f in sorted(glob.glob(os.path.join(SRC, "Renders", "*.png"))):
    save_jpg(Image.open(f), out("fotos", "renders", "ext-%s.jpg" % os.path.splitext(os.path.basename(f))[0]))

# ---------- Fotos de obra (nombradas por fecha) ----------
def obra_date(f):
    b = os.path.basename(f)
    m = re.search(r"(2026)-(\d\d)-(\d\d)", b)
    if m: return "%s-%s-%s" % m.groups()
    try:
        ex = Image.open(f).getexif(); d = ex.get(306)
        if d: return d[:10].replace(":", "-")
    except Exception: pass
    return "sin-fecha"
cnt = {}
for f in sorted(glob.glob(os.path.join(SRC, "Fotos", "*"))):
    if f.lower().endswith(".heic") and "pillow_heif" not in sys.modules: continue
    d = obra_date(f); cnt[d] = cnt.get(d, 0) + 1
    save_jpg(Image.open(f), out("fotos", "obra", "%s_%02d.jpg" % (d, cnt[d])))

# ---------- Planos (recortes del brochure, coordenadas sobre 3000x1687) ----------
PLANOS = {
    "lotes-3-4_planta-baja": (12, (700, 415, 1765, 1430)),
    "lotes-3-4_planta-alta": (12, (1815, 415, 2880, 1430)),
    "lotes-10-11_planta-baja": (13, (810, 390, 1790, 1420)),
    "lotes-10-11_planta-alta": (13, (1835, 390, 2900, 1420)),
}
def to_alpha(im, ink=(96, 96, 96), soft=22):
    """Convierte gris sobre crema en tinta con alfa (sin alterar la forma)."""
    from scipy.ndimage import maximum_filter, uniform_filter
    g = np.asarray(im.convert("L")).astype(np.float32)
    # fondo local (el brochure tiene degradé): máximo en ventana amplia, suavizado
    bg = uniform_filter(maximum_filter(g, size=41), size=41)
    a = np.clip((bg - g - soft) / np.maximum(bg - ink[0] - soft, 1), 0, 1)
    rgba = np.zeros(g.shape + (4,), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = ink
    rgba[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")
# zonas a limpiar dentro de cada recorte (texto del slide que se cruza con el plano)
PLANOS_MASK = {"lotes-3-4_planta-baja": (0, 705, 530, 9999), "lotes-10-11_planta-baja": (0, 720, 400, 9999)}
for name, (p, box) in PLANOS.items():
    im = to_alpha(page(p).crop(box), ink=(50, 50, 50))
    if name in PLANOS_MASK:
        x0, y0, x1, y1 = PLANOS_MASK[name]; a = np.array(im); a[y0:y1, x0:x1, 3] = 0; im = Image.fromarray(a, "RGBA")
    im.save(out("planos", name + ".png"))

# ---------- Íconos de rubros y servicios ----------
RUBROS = ["cafeterias", "supermercado", "indumentaria", "coworking", "farmacias", "librerias", "rentcar",
          "perfumerias", "tecnologia", "electrodomesticos", "gimnasios", "restaurantes", "opticas", "turismo"]
xs = [450, 800, 1146, 1510, 1864, 2210, 2546]
for i, name in enumerate(RUBROS):
    cx = xs[i % 7]; cy = 728 if i < 7 else 1052; r = 92
    to_alpha(page(6).crop((cx - r, cy - r, cx + r, cy + r))).save(out("iconos", "rubros", name + ".png"))
SERV = ["wifi", "parking", "ubicacion", "vigilancia", "seguridad"]
for i, name in enumerate(SERV):
    cx = [454, 976, 1500, 2020, 2546][i]; cy = 838; r = 92
    to_alpha(page(8).crop((cx - r, cy - r, cx + r, cy + r))).save(out("iconos", "servicios", name + ".png"))

# ---------- Créditos (Roque Mocciola / ZLT) ----------
to_alpha(page(17).crop((1150, 1275, 1480, 1385))).save(out("logos", "roque-mocciola.png"))
to_alpha(page(17).crop((1585, 1262, 1790, 1400))).save(out("logos", "zlt.png"))

# ---------- Logos APS: se quita el <rect> de fondo del artboard ----------
LOGOS = {"OP1.svg/Logo_OP1.svg": "aps-logo", "OP2.svg/Logo_OP2.svg": "aps-logo-horizontal",
         "OP3.svg/Logo_OP3.svg": "aps-logo-simbolo"}
for src, dst in LOGOS.items():
    s = open(os.path.join(SRC, "Logos", "SVG", src), encoding="utf-8").read()
    s = re.sub(r"<rect[^>]*/>", "", s, count=1)
    open(out("logos", dst + ".svg"), "w", encoding="utf-8").write(s)
s = open(os.path.join(SRC, "Simbolos", "SVG", "SIMBOLOS.svg"), encoding="utf-8").read()
open(out("logos", "aps-simbolo.svg"), "w", encoding="utf-8").write(re.sub(r"<rect[^>]*/>", "", s, count=1))
shutil.copy(os.path.join(SRC, "Iconografía", "SVG", "Iconos.svg"), out("iconos", "ui", "iconos-ui.svg"))
shutil.rmtree(tmp)
print("Assets listos en", REPO)
