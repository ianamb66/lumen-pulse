# Lumen Pulse

Prototipo web para sesiones de luz pulsada con linterna del telefono o fallback visual en pantalla, con musica ambient generada en el navegador y variacion suave de frecuencia sincronizada a frases musicales.

## Seguridad

La luz estroboscopica puede causar malestar, migraña, nauseas o convulsiones en personas fotosensibles. No usar con epilepsia, historial de convulsiones, sensibilidad a luces, condiciones neurologicas, bajo sustancias, manejando, o cerca de personas que no dieron consentimiento.

La app no es dispositivo medico y no promete efectos terapeuticos.

## Compatibilidad

El modo linterna usa:

```js
navigator.mediaDevices.getUserMedia()
MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })
```

Notas:

- Funciona mejor en Chrome/Edge para Android.
- iOS Safari normalmente no permite controlar la linterna desde web.
- Requiere `https://` o `localhost`.
- Algunos dispositivos abren la camara, pero no exponen `torch`; en ese caso la app cambia a modo pantalla.

## Ejecutar local

Desde esta carpeta:

```bash
python3 -m http.server 4173
```

Abrir:

```text
http://localhost:4173
```

Para probar en telefono, servir con HTTPS o usar un tunel local confiable.

## Archivos

- `index.html`: estructura de la app.
- `styles.css`: interfaz responsive 16:9/mobile-first.
- `app.js`: deteccion de soporte, linterna, temporizador y fallback.
- Web Audio: sintetiza un drone ambient simple al iniciar la sesion.

## Controles

- Frecuencia: 0.5 a 20 Hz.
- Duty cycle: 10% a 70%.
- Duracion: 1, 3, 5 o 10 minutos.
- Musica: ambient o silencio.
- Variacion musical: 0% a 45% alrededor de la frecuencia base.
- Parada inmediata y parada automatica al ocultar la pagina.

## Funcionamiento musical

Al tocar **Iniciar**, la app crea un `AudioContext` y genera una cama de osciladores suaves con cambios de acorde cada 16 segundos. Si la musica esta activa, la frecuencia luminosa modula alrededor de la frecuencia base usando la misma frase lenta, por ejemplo 8 Hz con variacion de ±20%.
