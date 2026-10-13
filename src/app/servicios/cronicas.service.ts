import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Cronica } from '../modelos/cronica';

/* =========================================================
   CRÓNICA HISTÓRICA
   Lógica común (antes en js/script.js) que usan todas
   las páginas: fecha, suscripción, JSON, favoritos y
   almacenamiento local.
========================================================= */

@Injectable({ providedIn: 'root' })
export class CronicasService {

    private http = inject(HttpClient);


    /* =========================================================
       RUTA DEL JSON
    ========================================================= */

    private rutaJson = 'datos/cronicas.json';


    /* =========================================================
       FECHA
    ========================================================= */

    mostrarFecha(): string {

        return this.obtenerFechaActual();

    }


    /* =========================================================
       SUSCRIPCIÓN
    ========================================================= */

    configurarSuscripcion(): void {

        alert(
            "Gracias por tu interés en Crónica Histórica. La suscripción estará disponible próximamente."
        );

    }


    /* =========================================================
       CARGAR JSON
    ========================================================= */

    async cargarCronicas(): Promise<Cronica[]> {

        let datos: Cronica[];

        try {

            datos = await firstValueFrom(
                this.http.get<Cronica[]>(this.rutaJson)
            );

        }

        catch {

            throw new Error(
                "No fue posible cargar cronicas.json"
            );

        }


        const almacenadas =
            localStorage.getItem(
                "cronicasPersonalizadas"
            );


        if (almacenadas) {

            return JSON.parse(almacenadas);

        }

        return datos;

    }


    /* =========================================================
       FAVORITOS
    ========================================================= */

    obtenerFavoritos(): number[] {

        const favoritos =
            localStorage.getItem(
                "cronicasFavoritas"
            );


        if (!favoritos) {

            return [];

        }


        try {

            return JSON.parse(
                favoritos
            );

        }

        catch {

            return [];

        }

    }


    guardarFavoritos(favoritos: number[]): void {

        localStorage.setItem(
            "cronicasFavoritas",
            JSON.stringify(
                favoritos
            )
        );

    }


    /* =========================================================
       GUARDAR CRUD EN LOCALSTORAGE
    ========================================================= */

    guardarCronicasPersonalizadas(cronicas: Cronica[]): void {

        localStorage.setItem(
            "cronicasPersonalizadas",
            JSON.stringify(
                cronicas
            )
        );

    }


    /* =========================================================
       FECHA PARA NUEVOS REGISTROS
    ========================================================= */

    obtenerFechaActual(): string {

        const ahora =
            new Date();


        const dia =
            String(
                ahora.getDate()
            ).padStart(
                2,
                "0"
            );


        const mes =
            String(
                ahora.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const anio =
            ahora.getFullYear();


        return `${dia}-${mes}-${anio}`;

    }

}
