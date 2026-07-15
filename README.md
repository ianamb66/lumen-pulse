# Lumen Pulse

Prototipo web para sesiones de luz pulsada con linterna del telefono o fallback visual en pantalla, con pistas ambient MP3 libres de DRM, patrones de flicker y variacion suave de frecuencia sincronizada a frases musicales.

## Seguridad

La luz estroboscopica puede causar malestar, migraña, nauseas o convulsiones en personas fotosensibles. No usar con epilepsia, historial de convulsiones, sensibilidad a luces, condiciones neurologicas, bajo sustancias, manejando, si eres menor de 18 años, o cerca de personas que no dieron consentimiento.

La app no es dispositivo medico y no promete efectos terapeuticos.

La app usa un perfil exploratorio con consentimiento reforzado: 3-18 Hz. Ese rango incluye frecuencias estudiadas para flicker con ojos cerrados (3, 8, 10 y 18 Hz), pero tambien entra en rangos que fuentes de epilepsia fotosensible consideran de riesgo (3-30 Hz o 5-30 Hz). WCAG recomienda que contenido general no tenga flashes fuertes por encima de 3 por segundo salvo umbrales estrictos; por eso la app no debe tratarse como segura para uso publico o sin consentimiento.

Lumenate no publica sus frecuencias exactas en sus paginas publicas. Su material publico describe "precise flickering light sequences" y neural entrainment; la implementacion aqui toma como referencia la literatura que Lumenate cita o que estudia fenomenologia de flicker, no una copia de presets propietarios.

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

- Frecuencia: 3 a 18 Hz.
- Presets: 6, 8, 10, 14 y 18 Hz.
- Patron luminoso: ritmico, oleaje o arritmico.
- Duty cycle: 8% a 50%.
- Duracion: 1, 3, 5 o 10 minutos.
- Tipo de meditacion: calma, enfoque, respirar o trance suave.
- Musica: pista MP3 ambient o silencio.
- Variacion musical: 0% a 45% alrededor de la frecuencia base.
- Parada inmediata y parada automatica al ocultar la pagina.

## Funcionamiento musical

Al tocar **Iniciar**, la app reproduce una pista MP3 segun la intencion elegida:

- **Calma:** `Wonder`, 10:00.
- **Enfoque:** `Bright Ambient`, 8:57.
- **Respirar:** `Nature Ambience`, 9:41.
- **Trance suave:** `Frozen in Time`, 9:32.

Si la musica esta activa, la frecuencia luminosa modula alrededor de la frecuencia base usando la frase lenta de la pista elegida, por ejemplo 10 Hz con variacion de ±20%.

El patron ritmico conserva ciclos regulares para favorecer entrainment. El patron oleaje introduce microvariacion lenta. El patron arritmico conserva una frecuencia promedio similar, pero rompe la regularidad para bajar intensidad subjetiva.

Las pistas hacen loop si la sesion llega a 10 minutos y el archivo dura unos segundos menos.

## Audio y licencia

Las pistas fueron descargadas de [Free No Copyright Relaxing Music](https://www.no-copyright-music.com/relaxing/) por Liborio Conti. La pagina indica que la musica es gratuita para uso personal y comercial, sin atribucion obligatoria, y que no debe activar reclamaciones de copyright. Ver tambien la [licencia](https://www.no-copyright-music.com/license/).

## Fuentes de seguridad visual

- Epilepsy Society: fotosensibilidad comunmente asociada con 3-30 Hz.
- Epilepsy Foundation: flashes entre 5-30 Hz suelen ser los mas probables para provocar crisis en personas sensibles.
- W3C WCAG 2.2 SC 2.3.1: evitar contenido que parpadee mas de tres veces por segundo salvo que este bajo umbrales estrictos.
- Lumenate Science: https://lumenate.co/the-science/
- Bartossek et al., PLoS ONE 2021: https://pubmed.ncbi.nlm.nih.gov/34197510/ estudio con 3 Hz y 10 Hz; los efectos fueron mas fuertes en 10 Hz.
- Amaya et al., PLoS ONE 2023: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0284271 comparo 3, 8, 10 y 18 Hz; 10 Hz ritmico reporto mayor intensidad de patrones/dinamica, y la arritmia redujo efectos frente a ritmo equivalente.
