import { Injectable } from '@angular/core';

import {
    ActivatedRouteSnapshot,
    BaseRouteReuseStrategy
} from '@angular/router';

/* =========================================================
   COMPORTAMIENTO "COMO PÁGINAS"
   En el proyecto original cada enlace con parámetros
   (?favoritos=1, ?id=3, ?buscar=...) recargaba la página.
   Por defecto Angular reutiliza el componente si solo cambian
   los parámetros; aquí se fuerza a crearlo de nuevo para que
   la página se comporte exactamente igual que antes.
   Un cambio solo de ancla (#archivo) no recarga, igual que
   en el navegador.
========================================================= */

@Injectable()
export class ReutilizacionComoPaginas extends BaseRouteReuseStrategy {

    override shouldReuseRoute(
        futura: ActivatedRouteSnapshot,
        actual: ActivatedRouteSnapshot
    ): boolean {

        return (
            futura.routeConfig === actual.routeConfig &&
            JSON.stringify(futura.queryParams) ===
            JSON.stringify(actual.queryParams)
        );

    }

}
