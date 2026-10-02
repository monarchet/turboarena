# Turbo Arena V2

Una implementación independiente de car soccer para navegador, pensada para GitHub Pages.

## Lo que incluye V2
- Renderizado 3D WebGL sin dependencias externas.
- Campo con paredes, porterías y cámara en tercera persona.
- Solo 1v1 contra bot.
- Free Play sin reloj.
- 2 minutos en Solo + overtime si hay empate.
- Drive/reverse y steering con física arcade.
- Boost con regeneración.
- Jump / segundo salto.
- Powerslide básico.
- Ball cam.
- Menú y panel de controles.
- Compatible con GitHub Pages sin servidor.

## Controles
W/S: acelerar/reversa
A/D: dirección
Click izquierdo: boost
Click derecho: salto
Shift: powerslide
Space: ball cam
R: recolocar
Esc: pausa

## Importante sobre multijugador
GitHub Pages solo sirve archivos estáticos. Un multijugador online real con salas 1v1/2v2/3v3 necesita un servicio de señalización/backend (por ejemplo WebSocket/WebRTC + servidor). Esta V2 deja preparado el juego local; no finge que las salas online existan cuando no hay backend.

## Publicar
Sube index.html, style.css y game.js a la raíz de tu repositorio.
GitHub Settings -> Pages -> Deploy from a branch -> main -> / (root).
