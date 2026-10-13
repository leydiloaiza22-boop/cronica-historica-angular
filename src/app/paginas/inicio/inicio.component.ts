import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CronicasService } from '../../servicios/cronicas.service';

/* =========================================================
   PÁGINA DE INICIO (antes index.html)
========================================================= */

@Component({
    selector: 'app-inicio',
    imports: [RouterLink],
    templateUrl: './inicio.component.html'
})
export class InicioComponent {

    private servicio = inject(CronicasService);

    private router = inject(Router);


    /* FECHA */

    fechaActual = this.servicio.mostrarFecha();


    /* SUSCRIPCIÓN */

    configurarSuscripcion(): void {

        this.servicio.configurarSuscripcion();

    }


    /* =========================================================
       BUSCADOR DE CRÓNICAS
    ========================================================= */

    configurarBusquedaInicio(event: KeyboardEvent, valor: string): void {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();


            const texto =
                valor.trim();


            this.router.navigate(
                ['/historia'],
                { queryParams: { buscar: texto } }
            );

        }

    }

}
