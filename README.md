# Lumen Pulse

Prototipo web para sesiones de luz pulsada con linterna del telefono o fallback visual en pantalla, con pistas ambient MP3 libres de DRM y variacion suave de frecuencia sincronizada a frases musicales.

## Seguridad

La luz estroboscopica puede causar malestar, migraña, nauseas o convulsiones en personas fotosensibles. No usar con epilepsia, historial de convulsiones, sensibilidad a luces, condiciones neurologicas, bajo sustancias, manejando, si eres menor de 18 años, o cerca de personas que no dieron consentimiento.

La app no es dispositivo medico y no promete efectos terapeuticos.

La app usa un perfil conservador: frecuencia maxima de 2.9 Hz. Fuentes de epilepsia fotosensible describen el rango de mayor riesgo entre 3-30 Hz o 5-30 Hz, y WCAG recomienda que el contenido no tenga flashes fuertes por encima de 3 por segundo.

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
- `assets/audio/`: pistas MP3 descargadas para las meditaciones.

## Controles

- Frecuencia: 0.5 a 2.9 Hz.
- Duty cycle: 10% a 70%.
- Duracion: 1, 3, 5 o 10 minutos.
- Tipo de meditacion: calma, enfoque, respirar o trance suave.
- Musica: pista generativa o silencio.
- Variacion musical: 0% a 45% alrededor de la frecuencia base.
- Parada inmediata y parada automatica al ocultar la pagina.

## Funcionamiento musical

Al tocar **Iniciar**, la app reproduce una pista MP3 segun la intencion elegida:

- **Calma:** `Wonder`, 10:00.
- **Enfoque:** `Bright Ambient`, 8:57.
- **Respirar:** `Nature Ambience`, 9:41.
- **Trance suave:** `Frozen in Time`, 9:32.

Si la musica esta activa, la frecuencia luminosa modula alrededor de la frecuencia base usando la frase lenta de la pista elegida, por ejemplo 8 Hz con variacion de ±20%.

Las pistas hacen loop si la sesion llega a 10 minutos y el archivo dura unos segundos menos.

## Audio y licencia

Las pistas fueron descargadas de [Free No Copyright Relaxing Music](https://www.no-copyright-music.com/relaxing/) por Liborio Conti. La pagina indica que la musica es gratuita para uso personal y comercial, sin atribucion obligatoria, y que no debe activar reclamaciones de copyright. Ver tambien la [licencia](https://www.no-copyright-music.com/license/).

## Fuentes de seguridad visual

- Epilepsy Society: fotosensibilidad comunmente asociada con 3-30 Hz.
- Epilepsy Foundation: flashes entre 5-30 Hz suelen ser los mas probables para provocar crisis en personas sensibles.
- W3C WCAG 2.2 SC 2.3.1: evitar contenido que parpadee mas de tres veces por segundo salvo que este bajo umbrales estrictos.
