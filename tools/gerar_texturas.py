"""Gera as texturas procedurais do projeto (asfalto molhado e metal pintado).

Uso (na raiz do projeto):  python tools/gerar_texturas.py
Requer: numpy e pillow.  Saída: public/textures/

Todos os mapas são "tileable" (repetem sem emenda): o ruído é gerado no domínio da
frequência (FFT), que é periódico por construção.
"""
import numpy as np
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "textures"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(42)  # semente fixa: mesmas texturas a cada execução


def noise(n, beta, aniso=1.0):
    """Ruído periódico com espectro 1/f^beta (beta alto = suave, baixo = granulado)."""
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f * aniso, f)
    r = np.sqrt(fx**2 + fy**2)
    r[0, 0] = 1
    spec = (rng.normal(size=(n, n)) + 1j * rng.normal(size=(n, n))) / r**beta
    spec[0, 0] = 0
    img = np.real(np.fft.ifft2(spec))
    return (img - img.min()) / (img.max() - img.min())


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def normal_map(h, strength):
    """Altura -> normal map (convenção OpenGL/Three.js: +Y para cima)."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.dstack((-dx, dy, np.ones_like(h)))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def save(arr, name, **kw):
    img = (np.clip(arr, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(img).save(OUT / name, **kw)
    print("ok", name)


# ---------------------------------------------------------------- asfalto molhado
N = 1024
grain, mid, low = noise(N, 0.2), noise(N, 1.3), noise(N, 2.6)
ridge = np.abs(noise(N, 1.8) - 0.5)
crack = np.exp(-(ridge / 0.006) ** 2)                 # rachaduras finas
height = 0.55 * grain + 0.35 * mid + 0.10 * low - 0.35 * crack
wet = smoothstep(low, 0.52, 0.68)                      # poças / áreas molhadas
stone = smoothstep(grain, 0.93, 0.99)                  # agregados claros

gray = 0.12 + 0.16 * height + 0.25 * stone
gray *= 1 - 0.35 * wet                                 # molhado escurece
gray *= 1 - 0.4 * crack
color = np.dstack((gray * 0.92, gray * 0.96, gray * 1.08))
rough = np.clip(0.92 - 0.70 * wet - 0.10 * stone + 0.08 * (grain - 0.5), 0.05, 1)

save(color, "asfalto_diffuse.jpg", quality=92)
save(normal_map(height, 6.0), "asfalto_normal.png", optimize=True)
save(rough, "asfalto_roughness.jpg", quality=92)

# ---------------------------------------------------------------- metal pintado do poste
N = 1024
rust_n = 0.7 * noise(N, 2.0) + 0.3 * noise(N, 1.0)
rust = smoothstep(rust_n, 0.64, 0.76)                  # manchas de ferrugem
scratch = smoothstep(np.abs(noise(N, 1.4, aniso=6) - 0.5) * -1, -0.012, -0.002)  # riscos
fine = noise(N, 0.5)

paint = np.array([0.15, 0.18, 0.21])                   # grafite azulado
rust_col = np.array([0.40, 0.18, 0.07]) * (0.7 + 0.6 * fine[..., None])
col = paint * (0.85 + 0.3 * noise(N, 2.0)[..., None])
col = col * (1 - rust[..., None]) + rust_col * rust[..., None]
col = np.where(scratch[..., None] > 0.5, col * 0.6 + 0.12, col)

height = 0.5 - 0.35 * scratch + rust * (0.25 + 0.35 * fine)
rough = 0.38 + 0.10 * noise(N, 1.5) + 0.52 * rust - 0.1 * scratch

save(col, "metal_diffuse.jpg", quality=92)
save(height, "metal_bump.png", optimize=True)          # altura em tons de cinza (bumpMap)
save(rough, "metal_roughness.jpg", quality=92)
