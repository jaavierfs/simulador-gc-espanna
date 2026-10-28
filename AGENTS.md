# Trabajo sobre este proyecto

- Este es el proyecto principal del juego para GitHub/GitHub Pages.
- La aplicación es estática y su código está en `dist/`; no hay una compilación pendiente.
- Mantener comentarios y documentación del proyecto en español.
- El README presenta el juego. Las instrucciones de instalación/publicación van en `docs/GUIA_TECNICA.md`.
- Mantener separados los IDs de bandos (`01`…`19`) y provincias (`p01`…`p52`).
- En los resultados territoriales, usar `change.from` y `change.to` para las banderas; nunca inferir el dueño anterior a partir del origen provincial.
- El resumen de clasificación aparece al final de la ronda, no en cada batalla.
- Conservar una revisión de mapa despejado después del resultado, también en el ritmo rápido.
- Ejecutar `npm test` para cambios relevantes. La simulación `npm run test:balance` es opcional y solo resulta necesaria al ajustar equilibrio/reglas; evitar comprobaciones repetitivas sin motivo.
- No crear repositorios remotos ni publicar por el mero hecho de editar archivos. Hacerlo cuando el usuario lo pida.
