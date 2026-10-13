import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/* =========================================================
   COMPONENTE RAÍZ
   Solo contiene el router: cada página del proyecto original
   (index.html, historia.html, personajes.html, contacto.html)
   es ahora un componente que se muestra aquí.
========================================================= */

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: '<router-outlet />'
})
export class App { }
