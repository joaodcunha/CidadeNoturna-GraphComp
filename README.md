# Mundo explorável em Three.js

> Projeto da disciplina de Computação Gráfica (IFSP São João da Boa Vista).

## Descrição e tema
_(preencher)_

## Como executar
```bash
npm install
npm run dev
```
Os modelos ficam em `public/models/` e são configurados em `src/models.js`.

## Controles
| Tecla | Ação |
|---|---|
| Clique | captura o mouse (Esc libera) |
| W A S D | mover |
| Q / E | descer / subir |
| Shift | correr |
| Mouse ou setas | girar a câmera |
| 1 | wireframe |
| 2 | profundidade (depth) |
| 3 | back-face culling |
| 4 | frustum em viewport dividida |
| 5 | frustum culling |

## Créditos, licenças e referências
| Modelo | Autor | Fonte | Licença |
|---|---|---|---|
| city at night low poly skyscrapers | dasy444 | https://sketchfab.com/3d-models/city-at-night-low-poly-skyscrapers-dc1294de66194054961c16aa74fda2cb | Sketchfab Standard |
| Poste (OBJ) | _(autor)_ | _(link)_ | _(licença)_ |
| Moto Akira (FBX) | _(autor)_ | _(link)_ | _(licença)_ |

## Decisões técnicas
### Luzes e sombras (`src/lights.js`)
| Luz | Tipo | Sombra | Papel |
|---|---|---|---|
| Ambiente | `HemisphereLight` | — | céu azulado / chão escuro, evita preto absoluto |
| Lua | `DirectionalLight` | câmera ortográfica 100×100, 2048² | luz principal fria, raios paralelos |
| Lâmpada do poste | `SpotLight` (âmbar, 50°, penumbra 0.4) | câmera perspectiva, 1024² | cone de luz quente na rua |
| Neon da moto | `PointLight` (magenta, alcance 15) | cube map (6 renders), 512² | luz colorida local, sombra em todas as direções |

- A spot fica logo abaixo da cúpula e um pouco fora do eixo do poste: dentro do tubo, o próprio mesh bloquearia o shadow map.
- As esferas que marcam as fontes de luz não projetam sombra (a luz está dentro delas).
- `bias`/`normalBias` negativos/pequenos removem o *shadow acne* sem causar *peter-panning* visível.
- O mapa da point light é menor porque é renderizado 6 vezes por quadro.
- No painel, a pasta **Luzes e sombras** liga/desliga cada luz e sua sombra, altera intensidade/cor, mostra helpers (incluindo as câmeras de sombra) e troca o filtro (`Basic`, `PCF`, `PCFSoft`, `VSM`).

## Caso de diagnóstico: problema de profundidade
_(z-fighting: imagens antes/depois; ver pasta "Caso: z-fighting" no painel)_

## Divisão do trabalho
João Davi - Entrega 1
Rodrigo Garcia - Entrega 2

