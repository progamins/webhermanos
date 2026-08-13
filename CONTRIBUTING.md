# Contribuyendo a Maison Rosas

¡Gracias por interesarte en colaborar! Este proyecto está en evolución constante y toda ayuda es bienvenida. La guía es simple: **abre un issue antes de codificar cosas grandes y mantén los cambios pequeños y enfocados.**

---

## 🐛 Reportar un bug

1. Antes de reportar, busca si ya existe un issue abierto similar.
2. Usa la plantilla [Reporte de bug](https://github.com/progamins/webhermanos/issues/new?template=bug_report.md).
3. Incluye: pasos para reproducir, comportamiento esperado, entorno (SO, navegador, Docker/local/Vercel) y logs si los tienes.

## 💡 Proponer una funcionalidad

1. Abre un issue con la plantilla [Solicitud de funcionalidad](https://github.com/progamins/webhermanos/issues/new?template=feature_request.md).
2. Explica el **problema** que resuelve, no solo la solución que imaginas. Así podemos discutir el mejor enfoque.
3. Si es un cambio grande (nueva arquitectura, nuevas dependencias), espera feedback antes de escribir código.

## 🔧 Enviar un cambio (pull request)

1. Crea una rama desde `main` con un nombre descriptivo:

   ```bash
   git checkout -b feat/mi-funcionalidad
   # o
   git checkout -b fix/mi-bug
   ```

2. Implementa el cambio con **commits pequeños y descriptivos**. Se usa el estilo [Conventional Commits](https://www.conventionalcommits.org/):

   ```text
   feat: añade filtro por categoría en el catálogo
   fix: corrige el cálculo de precio en pedidos grandes
   perf: optimiza la carga de imágenes de la galería
   ```

3. Verifica que todo pasa antes de abrir el PR:

   ```bash
   npm run lint     # typecheck de cliente y servidor
   npm run build    # build de producción
   ```

4. Abre el pull request hacia `main` describiendo qué cambia y por qué.

## ✅ Criterios de revisión

- Los cambios **no rompen** la build ni el typecheck (hay CI que lo verifica).
- No se suben secretos, `.env` ni datos de ejecución (`uploads/`).
- El código sigue las convenciones existentes (capas `routes → services → repositories`, TypeScript estricto).
- Si el cambio es visible para el usuario, la documentación (README) se actualiza cuando corresponda.

## 📝 Notas

- **Licencia:** el proyecto aún no tiene licencia definida. Antes de aceptar contribuciones externas, se definirá (ver README). Al enviar un PR aceptas que tu contribución se integre bajo la licencia que finalmente se elija.
- Dudas sobre el proyecto: abre un issue con la etiqueta `question`.
