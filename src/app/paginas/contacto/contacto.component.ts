import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CronicasService } from '../../servicios/cronicas.service';

/* =========================================================
   CONTACTO (antes paginas/contacto.html)
========================================================= */

interface ErroresContacto {
    errorNombre: string;
    errorCorreo: string;
    errorMensaje: string;
}

@Component({
    selector: 'app-contacto',
    imports: [RouterLink],
    templateUrl: './contacto.component.html'
})
export class ContactoComponent {

    private servicio = inject(CronicasService);

    private router = inject(Router);


    /* FECHA */

    fechaActual = this.servicio.mostrarFecha();


    /* SUSCRIPCIÓN */

    configurarSuscripcion(): void {

        this.servicio.configurarSuscripcion();

    }


    /* CAMPOS DEL FORMULARIO */

    private nombre =
        viewChild.required<ElementRef<HTMLInputElement>>('nombre');

    private correo =
        viewChild.required<ElementRef<HTMLInputElement>>('correo');

    private mensaje =
        viewChild.required<ElementRef<HTMLTextAreaElement>>('mensaje');


    errores = signal<ErroresContacto>({
        errorNombre: "",
        errorCorreo: "",
        errorMensaje: ""
    });

    mensajeEnviado = signal(false);


    /* =========================================================
       FORMULARIO DE CONTACTO
    ========================================================= */

    configurarFormularioContacto(
        event: Event,
        formulario: HTMLFormElement
    ): void {

        event.preventDefault();


        this.limpiarErrores();


        const nombre =
            this.nombre().nativeElement
                .value.trim();


        const correo =
            this.correo().nativeElement
                .value.trim();


        const mensaje =
            this.mensaje().nativeElement
                .value.trim();


        let valido = true;


        if (
            nombre.length < 2
        ) {

            this.mostrarError(
                "errorNombre",
                "Escribe tu nombre."
            );

            valido = false;

        }


        const patronCorreo =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !patronCorreo.test(
                correo
            )
        ) {

            this.mostrarError(
                "errorCorreo",
                "Ingresa un correo electrónico válido."
            );

            valido = false;

        }


        if (
            mensaje.length < 10
        ) {

            this.mostrarError(
                "errorMensaje",
                "El mensaje debe tener al menos 10 caracteres."
            );

            valido = false;

        }


        if (!valido) {
            return;
        }


        this.mensajeEnviado.set(true);


        formulario.reset();

    }


    mostrarError(
        id: keyof ErroresContacto,
        mensaje: string
    ): void {

        this.errores.update(
            errores => ({ ...errores, [id]: mensaje })
        );

    }


    limpiarErrores(): void {

        this.errores.set({
            errorNombre: "",
            errorCorreo: "",
            errorMensaje: ""
        });


        this.mensajeEnviado.set(false);

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
