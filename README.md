# Crónica Histórica — versión Angular

Proyecto original (HTML + CSS + JavaScript) migrado a **Angular 20**, con el mismo contenido, diseño y funcionamiento.

## Requisitos

- **Node.js** 20.19 o superior (recomendado: la versión LTS de https://nodejs.org)
- **Visual Studio Code**

## Ejecutar en Visual Studio Code

1. Descomprime el `.zip` y en VS Code ve a **Archivo → Abrir carpeta…** y elige la carpeta `cronica-historica-angular`.
2. Abre la terminal: **Terminal → Nueva terminal** (o `Ctrl + ñ`).
3. Instala las librerías (solo la primera vez; crea la carpeta `node_modules`):

   ```bash
   npm install
   ```

4. Arranca el proyecto:

   ```bash
   npm start
   ```

   El navegador se abre solo en **http://localhost:4200**. Si no se abre, entra a esa dirección.
5. Para detenerlo: `Ctrl + C` en la terminal.

> Si en Windows PowerShell aparece *"la ejecución de scripts está deshabilitada"*, ejecuta una vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` o usa una terminal **Command Prompt**.

## Dónde quedó cada parte del proyecto original

| Original | Angular |
|---|---|
| `index.html` | `src/app/paginas/inicio/` → ruta `/` |
| `paginas/historia.html` | `src/app/paginas/historia/` → ruta `/historia` |
| `paginas/personajes.html` | `src/app/paginas/personajes/` → ruta `/personajes` |
| `paginas/contacto.html` | `src/app/paginas/contacto/` → ruta `/contacto` |
| `css/estilos.css` | `src/css/estilos.css` (sin cambios) |
| `datos/cronicas.json` | `public/datos/cronicas.json` (sin cambios) |
| `img/` | `public/img/` |
| `js/script.js` | `src/app/servicios/cronicas.service.ts` (lógica común) y el `.ts` de cada página |

- El HTML de cada página está igual dentro de su archivo `.component.html`; solo los enlaces `href` pasaron a `routerLink` y las partes que antes se generaban con `innerHTML` ahora son plantillas Angular (`@for`, `@if`).
- La lógica de `script.js` se conservó con los mismos nombres de funciones, textos, validaciones y claves de `localStorage` (`cronicasFavoritas`, `cronicasPersonalizadas`).

## Otros comandos

```bash
npm run build     # versión para publicar, queda en dist/cronica-historica/browser
```
