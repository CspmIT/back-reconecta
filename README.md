# back-reconecta

# back-reconecta

## AutonomIA — catálogo de firmwares

Los firmwares de las placas Multivac los publica y aprueba ingeniería en el
**Tablero Cooptech**; Reconecta solo los lee y sirve los binarios por proxy.
El catálogo se pide al endpoint del Tablero pensado para otras apps
(`/api/catalogo/firmwares`, público con API key, devuelve **solo los
aprobados**). No sirve `/api/multivac/firmwares`: ese exige un JWT de usuario
del Tablero.

| Variable | Valor | Obligatoria |
|---|---|---|
| `AUTONOMIA_CATALOG_URL` | URL del catálogo en el Tablero, con su `?producto=Reconecta,General` | Sí, salvo que se use `AUTONOMIA_CATALOG_FILE` |
| `AUTONOMIA_CATALOG_TOKEN` | La API key del Tablero (allá es `FIRMWARES_API_KEY`) | Sí |
| `AUTONOMIA_CATALOG_FILE` | JSON local de respaldo si la URL no responde | No |
| `AUTONOMIA_PRODUCTOS` | Productos visibles (default `Reconecta,General`) | No |
| `AUTONOMIA_MINIO_BUCKET` | Bucket de los `.bin` en el storage (default `tablero`) | No |

Puesta en marcha: `npm run migrate:all` (crea `AutonomiaEvents`) y
`npm run seed:all` (ítem AutonomIA del menú). El detalle del flujo, los
endpoints y cómo rotar la clave están en `docs/AUTONOMIA.md` (esa carpeta no se
versiona, como `docs/LOGIN.md`).

