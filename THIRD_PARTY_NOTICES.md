# Datos y componentes de terceros

## Bibliotecas incluidas

`dist/vendor/LICENSES.txt` conserva los textos completos de licencia y atribuciones de:

- **polygon-clipping 0.15.7**: MIT. Unión de polígonos provinciales.
- **polylabel 2.1.0**: ISC. Colocación de nombres dentro de los territorios.
- **tinyqueue**: ISC. Dependencia interna de polylabel.

Los archivos vendorizados no se han comentado ni reformateado: se conservan como componentes de terceros. La adaptación de polygon-clipping expone su distribución como módulo ESM para usarla directamente en el navegador.

## Población

Cifras provinciales del Padrón a 1 de enero de 2025, declaradas oficiales por el [Real Decreto 1117/2025, BOE-A-2025-25362](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25362). Las poblaciones autonómicas del juego se suman a partir de sus provincias. Durante la partida cambian por bajas y conquistas.

## Cartografía

- Provincias: servicio [SIU / Entidades Territoriales, MIVAU, capa provincial](https://mapas.fomento.gob.es/arcgis/rest/services/SIU/ENTIDADES_TERRITORIALES_EGRN/MapServer/2), con límites IGN y simplificación para visualización. Se conserva esta atribución; las condiciones de reutilización se deben consultar en el producto y servicio de origen.
- Portugal, sur de Francia y norte de Marruecos: [Natural Earth, distribución geo-countries](https://github.com/datasets/geo-countries), datos de dominio público.
- Las adaptaciones de Canarias, Ceuta y Melilla son exclusivamente visuales y no representan distancias a escala común con el resto del mapa.

Los generadores contienen las proyecciones y recortes aplicados. Las dos entidades de la fuente identificadas como territorio no asociado a una provincia no forman unidades jugables; el tablero se limita a las 50 provincias y dos ciudades autónomas.

## Banderas

Los archivos locales proceden de Wikimedia Commons. `dist/flags/SOURCES.json` incluye la página de procedencia y la URL de cada bandera. Las versiones SVG/PNG se conservan para que la web pueda funcionar sin solicitudes externas a Wikimedia.

Las condiciones de cada imagen se encuentran en su página de archivo; no se aplica automáticamente una licencia única del juego a todas las banderas y escudos. Este documento conserva la procedencia sin atribuir una licencia que no se haya comprobado individualmente.

## Audio

Música y efectos sintetizados por el propio programa con Web Audio. No se incluyen pistas de música, grabaciones ni muestras externas.

## Código original

No se ha elegido una licencia propia para el código original. Antes de asignar una, hay que mantener separadas las condiciones y atribuciones de los componentes anteriores.
