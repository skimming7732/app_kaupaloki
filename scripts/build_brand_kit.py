"""Package Kaupaloki's existing brand assets. No image transformations or network requests.

Run from any directory: python scripts/build_brand_kit.py
The licensed font files must already be present in brand-kit/fuentes/.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import shutil
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'brand-kit'
DATE = '2026-11-23'
logos = {
    'logo-blue.png': 'kaupaloki-logo-violeta.png',
    'logo.png': 'kaupaloki-logo-blanco.png',
    'iso-type-blue.png': 'kaupaloki-isotipo-violeta.png',
    'iso-type-white.png': 'kaupaloki-isotipo-blanco.png',
    'icono-social.png': 'kaupaloki-icono-social.png',
}
for folder in ['logos', 'fuentes', 'colores']:
    (KIT / folder).mkdir(parents=True, exist_ok=True)
for source, target in logos.items():
    shutil.copy2(ROOT / 'public' / source, KIT / 'logos' / target)

style = (ROOT / 'src/index.css').read_text(encoding='utf-8')
def css_tokens(selector):
    match = re.search(re.escape(selector) + r'\s*\{([^}]+)\}', style)
    return dict(re.findall(r'--([\w-]+)\s*:\s*([^;]+);', match.group(1)))
light, dark = css_tokens(':root'), css_tokens('html.dark')
palette = {
    'marca': 'Kaupaloki', 'fecha': DATE,
    'procedencia': 'src/index.css, tailwind.config.js y recursos originales PNG',
    'arte_original': {'logotipo_violeta': '#4318FF', 'isotipo_violeta': '#441AFF', 'icono_social': '#313D9B', 'blanco': '#FFFFFF'},
    'claro': light, 'oscuro': dark,
    'comprobantes': {'degradado_inicio': '#0B2540', 'degradado_fin': '#080F1E', 'tarjeta': '#101D30', 'borde': '#284461'},
    'correo': {'degradado_inicio': '#0B1426', 'degradado_medio': '#172554', 'degradado_fin': '#4318FF'},
    'tipografia': {'familia': 'Plus Jakarta Sans', 'rango_variable': [200, 800], 'pesos_app': [400, 500, 600, 700, 800], 'licencia': 'SIL Open Font License 1.1'},
}
(KIT / 'colores/paleta.json').write_text(json.dumps(palette, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
css = '''/* Kaupaloki: tokens existentes y fuentes locales. Ver GUIA-DE-MARCA.md. */
@font-face { font-family: 'Plus Jakarta Sans'; src: url('../fuentes/PlusJakartaSans-Variable.ttf') format('truetype'); font-weight: 200 800; font-style: normal; font-display: swap; }
@font-face { font-family: 'Plus Jakarta Sans'; src: url('../fuentes/PlusJakartaSans-Italic-Variable.ttf') format('truetype'); font-weight: 200 800; font-style: italic; font-display: swap; }
'''
for selector, values in [(':root', light), ('html.dark', dark)]:
    css += selector + ' {\n' + ''.join(f'  --{key}: {value};\n' for key, value in values.items()) + '}\n'
css += '''.brand-logo { display: block; max-width: 100%; height: auto; }
.kaupaloki-type { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.kaupaloki-numbers { font-variant-numeric: tabular-nums; }
'''
(KIT / 'colores/kaupaloki.css').write_text(css, encoding='utf-8')

swatches = []
seen = set()
for group in ['arte_original', 'claro', 'oscuro', 'comprobantes', 'correo']:
    for key, value in palette[group].items():
        if re.fullmatch(r'#[\da-fA-F]{6}', value) and value.upper() not in seen:
            seen.add(value.upper())
            swatches.append((group, key, value.upper()))
gpl = 'GIMP Palette\nName: Kaupaloki\nColumns: 5\n# Colores originales de la marca y temas de la app\n'
for group, key, value in swatches:
    rgb = tuple(int(value[i:i+2], 16) for i in (1, 3, 5))
    gpl += f'{rgb[0]:3} {rgb[1]:3} {rgb[2]:3}\t{group} / {key}\n'
(KIT / 'colores/paleta.gpl').write_text(gpl, encoding='utf-8')

cards = ''.join(f'<div class="swatch"><div class="color" style="background:{value}"></div><div class="swatch-label"><strong>{value}</strong><small>{html.escape(key.replace("_", " ").replace("-", " "))}</small><small>{group}</small></div></div>' for group, key, value in swatches)
preview = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kaupaloki · Identidad de marca</title><link rel="stylesheet" href="colores/kaupaloki.css"><style>
*{box-sizing:border-box}body{margin:0;background:var(--bg-main);color:var(--text-primary);font-family:'Plus Jakarta Sans',sans-serif}main{max-width:1160px;margin:auto;padding:32px 24px 56px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:40px}header img{width:190px}.logo-dark{display:none}html.dark .logo-light{display:none}html.dark .logo-dark{display:block}button{font:inherit;border:1px solid var(--border-main);border-radius:12px;padding:10px 16px;color:var(--text-primary);background:var(--bg-card);cursor:pointer}.eyebrow{font-size:12px;letter-spacing:.16em;font-weight:700;color:var(--brand-primary)}h1{font-size:clamp(28px,5vw,44px);letter-spacing:-.04em;margin:8px 0 12px}h2{font-size:20px;margin:32px 0 16px}p{color:var(--text-secondary);font-size:14px;line-height:1.7;margin:8px 0}a{color:var(--brand-primary)}.logos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.panel{border:1px solid var(--border-main);background:var(--bg-card);border-radius:20px;overflow:hidden}.art{height:180px;display:flex;align-items:center;justify-content:center;padding:32px}.art.light{background:#F4F7FE}.art.dark{background:#0B1437}.art img.horizontal{width:90%;max-width:380px;height:auto}.art img.square{width:104px;height:104px;object-fit:contain}.caption{padding:16px 20px}.caption strong{font-size:13px}.caption small{display:block;font-size:12px;color:var(--text-secondary);margin-top:4px}.symbols{display:flex;align-items:center;gap:40px}.palette{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.swatch{border:1px solid var(--border-main);border-radius:14px;overflow:hidden;background:var(--bg-card)}.color{height:64px;border-bottom:1px solid var(--border-main)}.swatch-label{padding:12px}.swatch strong{font-size:13px;user-select:all}.swatch small{display:block;color:var(--text-secondary);font-size:11px;line-height:1.6}.type{padding:28px}.display{font-size:clamp(30px,5vw,48px);font-weight:800;letter-spacing:-.04em;margin:4px 0}.weights{display:flex;flex-wrap:wrap;gap:18px;font-size:17px;margin:20px 0}.numbers{font-size:24px;font-variant-numeric:tabular-nums}.note{border-left:3px solid var(--brand-primary);padding-left:16px;margin-top:20px}.footer{margin-top:36px;font-size:12px}@media(max-width:600px){main{padding:24px 16px}.logos{grid-template-columns:1fr}header{margin-bottom:28px}header img{width:145px}button{font-size:12px;padding:8px 10px}.art{height:150px;padding:24px}.symbols{gap:24px}}
</style></head><body><main><header><div><img class="logo-light" src="logos/kaupaloki-logo-violeta.png" alt="Kaupaloki"><img class="logo-dark" src="logos/kaupaloki-logo-blanco.png" alt="Kaupaloki"></div><button id="toggle" type="button">Claro / Oscuro</button></header><div class="eyebrow">IDENTIDAD DE MARCA · NOVIEMBRE 2026</div><h1>Una marca, cinco originales.</h1><p>Logos, colores y tipografía de Kaupaloki. Referencia visual con recursos locales, sin conexión.</p><p><a href="GUIA-DE-MARCA.md">Abrir guía Markdown</a> · <a href="colores/paleta.json">Paleta JSON</a> · <a href="colores/kaupaloki.css">Variables CSS</a></p><h2>Logotipo e isotipo</h2><div class="logos"><section class="panel"><div class="art light"><img class="horizontal" src="logos/kaupaloki-logo-violeta.png" alt="Logotipo violeta"></div><div class="caption"><strong>Logotipo sobre fondo claro</strong><small>PNG transparente · 1024 × 222 px</small></div></section><section class="panel"><div class="art dark"><img class="horizontal" src="logos/kaupaloki-logo-blanco.png" alt="Logotipo blanco"></div><div class="caption"><strong>Logotipo sobre fondo oscuro</strong><small>PNG transparente · 1024 × 222 px</small></div></section><section class="panel"><div class="art light symbols"><img class="square" src="logos/kaupaloki-isotipo-violeta.png" alt="Isotipo violeta"><img class="square" src="logos/kaupaloki-icono-social.png" alt="Icono social"></div><div class="caption"><strong>Isotipo e icono social</strong><small>Originales de 512 × 512 px</small></div></section><section class="panel"><div class="art dark"><img class="square" src="logos/kaupaloki-isotipo-blanco.png" alt="Isotipo blanco"></div><div class="caption"><strong>Isotipo blanco</strong><small>PNG transparente · 512 × 512 px</small></div></section></div><h2>Paleta de referencia</h2><div class="palette">__CARDS__</div><p class="note">Los originales conservan sus colores: logotipo #4318FF, isotipo #441AFF e icono social #313D9B. Para nueva interfaz, el violeta principal es #4318FF. La guía distingue los valores de claro, oscuro y comprobantes.</p><h2>Plus Jakarta Sans</h2><section class="panel type"><div class="eyebrow">TIPOGRAFÍA PRINCIPAL · VARIABLE 200–800</div><div class="display">Claridad en cada operación.</div><p>ABCDEFGHIJKLMNÑOPQRSTUVWXYZ<br>abcdefghijklmnñopqrstuvwxyz · áéíóúü · $ % &amp; @</p><div class="weights"><span style="font-weight:400">Regular 400</span><span style="font-weight:500">Medium 500</span><span style="font-weight:600">Semibold 600</span><span style="font-weight:700">Bold 700</span><span style="font-weight:800">ExtraBold 800</span></div><div class="numbers">$1,234,567.89 · USDT 1,250.00</div><p><em>Itálica incluida como recurso adicional.</em></p></section><p class="footer">Kit preparado desde los recursos del proyecto. Las recomendaciones de aplicación están identificadas en la guía. Fuentes con licencia OFL incluida.</p></main><script>document.getElementById('toggle').addEventListener('click',()=>document.documentElement.classList.toggle('dark'));</script></body></html>'''
(KIT / 'VISTA-PREVIA.html').write_text(preview.replace('__CARDS__', cards), encoding='utf-8')
(KIT / 'README.md').write_text('''# Kaupaloki · Identidad de marca

1. Abrir **VISTA-PREVIA.html** para ver logos, paleta y tipografía sin conexión.
2. Leer **GUIA-DE-MARCA.md** para conocer fuentes, colores y casos de uso.
3. Utilizar los PNG originales de **logos/** y las fuentes de **fuentes/**.
4. Consultar **colores/** para CSS, JSON y muestras GPL.

Las dos variantes TTF son fuentes variables con rango 200–800. Incluyen licencia OFL.
Los PNG son originales sin modificaciones; no se dispone de maestros vectoriales.
El CSS y la vista previa usan las fuentes locales incluidas. No hace falta instalar dependencias.
''', encoding='utf-8')

relative_files = [Path('GUIA-DE-MARCA.md'), Path('README.md'), Path('VISTA-PREVIA.html')]
relative_files += [Path('logos') / name for name in logos.values()]
relative_files += [Path('fuentes') / name for name in ['PlusJakartaSans-Variable.ttf', 'PlusJakartaSans-Italic-Variable.ttf', 'OFL.txt', 'METADATA.pb']]
relative_files += [Path('colores') / name for name in ['paleta.json', 'kaupaloki.css', 'paleta.gpl']]
inventory = []
font_sources = {
    'PlusJakartaSans-Variable.ttf': 'PlusJakartaSans%5Bwght%5D.ttf',
    'PlusJakartaSans-Italic-Variable.ttf': 'PlusJakartaSans-Italic%5Bwght%5D.ttf',
    'OFL.txt': 'OFL.txt', 'METADATA.pb': 'METADATA.pb',
}
for relative in relative_files:
    file = KIT / relative
    content = file.read_bytes()
    entry = {'archivo': relative.as_posix(), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    if relative.suffix == '.png':
        assert content[:8] == b'\x89PNG\r\n\x1a\n'
        entry['ancho_px'], entry['alto_px'] = struct.unpack('>II', content[16:24])
        original = next(source for source, target in logos.items() if target == relative.name)
        entry['original'] = 'public/' + original
        assert content == (ROOT / entry['original']).read_bytes()
    if relative.suffix == '.ttf':
        assert content[:4] == b'\x00\x01\x00\x00', 'Invalid TTF: ' + str(relative)
    if relative.parent.as_posix() == 'fuentes':
        entry['procedencia'] = 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/' + font_sources[relative.name]
    inventory.append(entry)
(KIT / 'INVENTARIO.json').write_text(json.dumps({'marca': 'Kaupaloki', 'fecha': DATE, 'archivos': inventory}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
relative_files.append(Path('INVENTARIO.json'))
output = ROOT / 'entregables/Kaupaloki-Identidad-de-Marca.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for relative in sorted(relative_files):
        archive.write(KIT / relative, Path('Kaupaloki-Identidad') / relative)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None, 'ZIP integrity error'
    assert len(archive.namelist()) == len(relative_files)
print(json.dumps({'zip': str(output), 'archivos': len(relative_files), 'bytes': output.stat().st_size}, ensure_ascii=False))
