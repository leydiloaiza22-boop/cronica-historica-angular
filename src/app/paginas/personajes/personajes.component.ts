import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CronicasService } from '../../servicios/cronicas.service';

/* =========================================================
   PERSONAJES (antes paginas/personajes.html)
========================================================= */

@Component({
    selector: 'app-personajes',
    imports: [RouterLink],
    templateUrl: './personajes.component.html'
})
export class PersonajesComponent {

    private servicio = inject(CronicasService);

    private router = inject(Router);


    /* FECHA */

    fechaActual = this.servicio.mostrarFecha();


    /* SUSCRIPCIÓN */

    configurarSuscripcion(): void {

        this.servicio.configurarSuscripcion();

    }


    /* =========================================================
       BUSCADOR (Enter lleva a Crónicas con la búsqueda)
    ========================================================= */

    buscarCronicas(event: KeyboardEvent, valor: string): void {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();


            this.router.navigate(
                ['/historia'],
                { queryParams: { buscar: valor.trim() } }
            );

        }

    }

}
