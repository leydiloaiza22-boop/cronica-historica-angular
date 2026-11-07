import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, EstadoServidor } from '../../servicios/auth.service';
import { CronicasService } from '../../servicios/cronicas.service';

/* =========================================================
   INGRESAR (nueva página: inicio de sesión y registro)
   Los usuarios se guardan en la base de datos del backend.
========================================================= */

interface ErroresSesion {
    nombre: string;
    correo: string;
    password: string;
}

const SIN_ERRORES: ErroresSesion = { nombre: "", correo: "", password: "" };

@Component({
    selector: 'app-ingresar',
    imports: [RouterLink],
    templateUrl: './ingresar.component.html'
})
export class IngresarComponent implements OnInit {

    auth = inject(AuthService);

    private servicio = inject(CronicasService);

    private router = inject(Router);

    private ruta = inject(ActivatedRoute);


    /* FECHA */

    fechaActual = this.servicio.mostrarFecha();


    /* ESTADO DE LA PÁGINA */

    modo = signal<'login' | 'registro'>('login');

    errores = signal<ErroresSesion>(SIN_ERRORES);

    mensajeError = signal("");

    enviando = signal(false);

    // undefined = comprobando, null = sin conexión
    estado = signal<EstadoServidor | null | undefined>(undefined);


    /* CAMPOS DEL FORMULARIO */

    private nombre = viewChild<ElementRef<HTMLInputElement>>('nombre');

    private correo = viewChild<ElementRef<HTMLInputElement>>('correo');

    private password = viewChild<ElementRef<HTMLInputElement>>('password');


    ngOnInit(): void {

        if (this.ruta.snapshot.queryParamMap.get("modo") === "registro") {
            this.modo.set("registro");
        }

        this.consultarServidor();

    }


    async consultarServidor(): Promise<void> {

        this.estado.set(
            await this.auth.estadoServidor()
        );

    }


    /* SUSCRIPCIÓN */

    configurarSuscripcion(): void {

        this.servicio.configurarSuscripcion();

    }


    /* BUSCADOR (Enter lleva a Crónicas con la búsqueda) */

    buscarCronicas(event: KeyboardEvent, valor: string): void {

        if (event.key === "Enter") {

            event.preventDefault();

            this.router.navigate(
                ['/historia'],
                { queryParams: { buscar: valor.trim() } }
            );

        }

    }


    /* =========================================================
       CAMBIAR ENTRE INICIAR SESIÓN Y CREAR CUENTA
    ========================================================= */

    cambiarModo(): void {

        this.modo.set(
            this.modo() === "login" ? "registro" : "login"
        );

        this.errores.set(SIN_ERRORES);

        this.mensajeError.set("");

    }


    /* =========================================================
       ENVIAR FORMULARIO
    ========================================================= */

    async enviar(event: Event, formulario: HTMLFormElement): Promise<void> {

        event.preventDefault();


        this.errores.set(SIN_ERRORES);

        this.mensajeError.set("");


        const registro = this.modo() === "registro";

        const nombre = this.nombre()?.nativeElement.value.trim() ?? "";

        const correo = this.correo()?.nativeElement.value.trim() ?? "";

        const password = this.password()?.nativeElement.value ?? "";


        /* Validación (mismas reglas que el backend) */

        const errores = { ...SIN_ERRORES };

        if (registro && nombre.length < 2) {
            errores.nombre = "Escribe tu nombre.";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            errores.correo = "Ingresa un correo electrónico válido.";
        }

        if (password.length < 6) {
            errores.password = "La contraseña debe tener al menos 6 caracteres.";
        }

        if (errores.nombre || errores.correo || errores.password) {
            this.errores.set(errores);
            return;
        }


        /* Petición al backend */

        this.enviando.set(true);

        try {

            if (registro) {
                await this.auth.registro(nombre, correo, password);
            } else {
                await this.auth.login(correo, password);
            }

            formulario.reset();

            this.consultarServidor();


            // Volver a la página desde la que se pidió iniciar sesión
            const volver = this.ruta.snapshot.queryParamMap.get("volver");

            if (volver && volver.startsWith("/") && !volver.startsWith("//")) {
                this.router.navigateByUrl(volver);
            }

        }

        catch (error) {

            this.mensajeError.set(
                this.auth.mensajeError(error)
            );

        }

        finally {

            this.enviando.set(false);

        }

    }


    /* =========================================================
       CERRAR SESIÓN
    ========================================================= */

    cerrarSesion(): void {

        this.auth.cerrarSesion();

    }

}
