# Añelo Plaza Shopping — Web (APS-WEB-V1)

El sitio nuevo de **Añelo Plaza Shopping** reemplaza la web actual en Wix. Toma como base la estructura de **ZLT-WEB-V2**: grilla, anatomía de ficha de proyecto, galerías, bilingüe ES/EN y estados de obra. Sobre esa base aplica la marca APS según el Manual de marca 2026.

## Cómo se usa

```bash
python3 build.py            # genera html/index.html (noindex, versión de desarrollo)
python3 build.py --index    # versión indexable: usar recién en el lanzamiento
python3 build.py --sin-login  # sin pantalla de login
```

## Login

`gate.js` es **copia exacta** del de ZLT-WEB-V2, con los mismos usuarios que proyectos.somoszlt.com, PIVM, Lumina y Nodo. El build lo inserta inline después de `</title>`. No hay que modificarlo: si cambian los usuarios, se vuelve a copiar desde `REPO WEB ZLT V2/gate.js`. Es un login del lado del navegador: frena a quien entra por la URL, pero no a quien lea el repo o tenga el HTML.

El resultado es **un único HTML autocontenido**, con fotos (WebP), fuentes, logos, Leaflet y el brochure PDF embebidos. Se publica tal cual, por ejemplo en GitHub Pages. Pesa unos 11,5 MB, por debajo del límite de 30 MiB.

Si cambian los materiales de origen (renders, fotos de obra o brochure), se regeneran los assets:

```bash
python3 tools/prep_assets.py "<ruta a ZT Soma Administración - Marketing y Diseño/Añelo-Plaza-Shopping>"
```

Requiere Python 3.9+, Pillow (con WebP), numpy, scipy, pillow-heif (para los HEIC) y poppler-utils (`pdfimages`).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/index.html` | Maqueta con todos los textos en pares `.l-es` / `.l-en` |
| `src/css/styles.css` | Sistema visual (tokens de marca APS y patrones ZLT) |
| `src/js/app.js` | Idioma, galerías, lightbox, locales con filtros, obra, mapa, brochure y formulario |
| `src/data/site.json` | **Datos editables**: contacto, coordenadas, links de YouTube, cronograma de obra, lotes y las 49 unidades |
| `fotos/renders`, `fotos/obra` | Renders e imágenes de avance de obra (nombradas por fecha) |
| `planos/` | Plantas por lote, recortadas del brochure 2026 |
| `logos/`, `iconos/` | Logos oficiales APS (SVG), ZLT, Roque Mocciola, iconografía de rubros/servicios/UI |
| `brochures/` | Brochure comercial 2026 vigente y su portada |
| `fonts/` | Montserrat y DM Sans (OFL, se pueden embeber) |
| `links/` | Links externos del proyecto |
| `vendor/` | Leaflet 1.9.4 (embebido inline: desde CDN falla) |
| `html/` | **Salida** lista para publicar |
| `tools/` | Script de preparación de assets |
| `gate.js` | Login compartido con las demás webs de ZLT (no editar) |

## Pantalla de carga

Mismo patrón que la web del PIVM: fondo crema, isologotipo de APS que "respira" y una línea con el avance real. Se va cuando la página terminó de cargar (tipografías incluidas) y las imágenes de la primera vista están listas. Si pasan 25 s sin avance, la web se muestra igual. Con login, la carga arranca recién al ingresar, para que suceda detrás de esta pantalla y no detrás del login. El código está en `src/js/app.js` y los estilos en `#pre`, en `styles.css`.

## Tareas frecuentes

- **Cambiar el estado de un local**: en `site.json → unidades`, el campo `estado` admite `consultar`, `disponible`, `reservado`, `vendido` o `alquilado`. Con `m2` se muestra la superficie.
- **Agregar fotos de obra**: se guardan en `fotos/obra/AAAA-MM-DD_NN.jpg`. Se agrupan solas por fecha y la más reciente queda como pestaña inicial. Hay que actualizar `obra.actualizado`.
- **Video oficial / avance de obra**: se completa el ID de YouTube en `links`. El botón aparece solo.
- **Estado de cada módulo**: `obra.modulos[].estado` admite `proxima`, `programada`, `ejecucion` o `entregada`.

## Pendientes a confirmar

1. **Coordenadas exactas del predio**: hoy son aproximadas (centro de Añelo).
2. **Superficie por local**: falta la planilla de m². Hoy se muestran los rangos por lote.
3. **Contacto**: el brochure 2026 dice +54 9 3416 04-3533 / +54 9 2996 31-5814 / shopping_info@añeloplazashopping.com, y la web actual dice info@somoszlt.com / +54 9 341 316 5100.
4. **Dominio**: el brochure dice `.com.ar` y la web actual es `.com`.
5. **Formulario**: hoy envía por WhatsApp o mail (sitio estático). Para guardar leads hace falta conectarlo a un backend o CRM.
6. **Mapa**: las teselas de Esri World Imagery tienen licencia y no son libres para uso comercial. Hay que evaluarlo o dejar solo OpenStreetMap.
7. **Estado real de cada módulo de obra**: por ahora se infiere del cronograma del brochure.
