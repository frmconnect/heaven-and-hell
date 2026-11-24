"""Shrink a character's textures for phones: colour + normal -> JPEG, glow -> small PNG/JPEG, specular -> roughness.
Usage: python3 tools/shrink-textures.py public/models/<name>"""
import json, os, sys
from PIL import Image, ImageOps

d = sys.argv[1]
slots = json.load(open(os.path.join(d, 'materials.json')))
for mat, s in slots.items():
    for key, size, q in (('map', 1024, 82), ('normalMap', 512, 85), ('emissiveMap', 512, 80)):
        f = s.get(key)
        if not f:
            continue
        im = Image.open(os.path.join(d, f)).convert('RGB')
        im.thumbnail((size, size))
        out = f.rsplit('.', 1)[0] + '.jpg'
        im.save(os.path.join(d, out), quality=q, optimize=True)
        if out != f:
            os.remove(os.path.join(d, f))
        s[key] = out
    # specular (bright = shiny) becomes a roughness map (bright = rough), stored in green like three.js expects
    f = s.pop('specularMap', None)
    if f:
        im = ImageOps.invert(Image.open(os.path.join(d, f)).convert('L'))
        im.thumbnail((512, 512))
        rgb = Image.merge('RGB', (im, im, im))
        out = f.replace('_spec.png', '_rough.jpg')
        rgb.save(os.path.join(d, out), quality=80)
        os.remove(os.path.join(d, f))
        s['roughnessMap'] = out
json.dump(slots, open(os.path.join(d, 'materials.json'), 'w'), indent=2)
for f in sorted(os.listdir(d)):
    print(f, os.path.getsize(os.path.join(d, f)) // 1024, 'KB')
