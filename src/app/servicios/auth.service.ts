import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/* =========================================================
   SESIÓN DE USUARIOS
   Habla con la API del backend (contenedor "backend") a
   través de Nginx: todo lo que va a  api/...  se reenvía
   por la red interna de Docker.
========================================================= */

export interface Usuario {
    id: number;
    nombre: string;
    correo: string;
    creado_en: string;
}

export interface EstadoServidor {
    estado: string;
    servicio: string;
    contenedor: string;
    hora: string;
    base_datos: {
        motor: string;
        usuarios: number;
        cronicas: number;
        mensajes_contacto: number;
    };
}

interface RespuestaSesion {
    token: string;
    usuario: Usuario;
}

const CLAVE_SESION = "sesionCronica";

@Injectable({ providedIn: 'root' })
export class AuthService {

    private http = inject(HttpClient);

    private api = 'api';


    /* USUARIO ACTUAL (null si no hay sesión) */

    private sesion = signal<RespuestaSesion | null>(this.leerSesion());

    usuario = computed(() => this.sesion()?.usuario ?? null);

    token = computed(() => this.sesion()?.token ?? null);

    etiquetaMenu = computed(() => {
        const usuario = this.usuario();
        return usuario
            ? `Hola, ${usuario.nombre.split(" ")[0]}`
            : "Ingresar";
    });


    constructor() {

        // Si había una sesión guardada, se confirma que el token siga vigente
        if (this.token()) {

            this.http.get<Usuario>(`${this.api}/auth/perfil`, {
                headers: { Authorization: `Bearer ${this.token()}` }
            }).subscribe({
                next: usuario => this.guardarSesion({ token: this.token()!, usuario }),
                error: (error: HttpErrorResponse) => {
                    if (error.status === 401) {
                        this.cerrarSesion();
                    }
                }
            });

        }

    }


    /* =========================================================
       INICIAR SESIÓN / REGISTRO / CERRAR SESIÓN
    ========================================================= */

    async login(correo: string, password: string): Promise<Usuario> {

        const respuesta = await firstValueFrom(
            this.http.post<RespuestaSesion>(
                `${this.api}/auth/login`,
                { correo, password }
            )
        );

        this.guardarSesion(respuesta);

        return respuesta.usuario;

    }


    async registro(nombre: string, correo: string, password: string): Promise<Usuario> {

        const respuesta = await firstValueFrom(
            this.http.post<RespuestaSesion>(
                `${this.api}/auth/registro`,
                { nombre, correo, password }
            )
        );

        this.guardarSesion(respuesta);

        return respuesta.usuario;

    }


    cerrarSesion(): void {

        localStorage.removeItem(CLAVE_SESION);

        this.sesion.set(null);

    }


    /* =========================================================
       ESTADO DEL BACKEND (comprueba la comunicación)
    ========================================================= */

    async estadoServidor(): Promise<EstadoServidor | null> {

        try {

            return await firstValueFrom(
                this.http.get<EstadoServidor>(`${this.api}/status`)
            );

        }

        catch {

            return null;

        }

    }


    /* =========================================================
       MENSAJE DE ERROR LEGIBLE
    ========================================================= */

    mensajeError(error: unknown): string {

        if (
            error instanceof HttpErrorResponse &&
            typeof error.error?.error === "string"
        ) {
            return error.error.error;
        }

        return "No hay conexión con el servidor. Verifica que el backend esté en ejecución.";

    }


    /* =========================================================
       ALMACENAMIENTO LOCAL
    ========================================================= */

    private guardarSesion(sesion: RespuestaSesion): void {

        localStorage.setItem(
            CLAVE_SESION,
            JSON.stringify(sesion)
        );

        this.sesion.set(sesion);

    }


    private leerSesion(): RespuestaSesion | null {

        try {

            const guardada = localStorage.getItem(CLAVE_SESION);

            return guardada ? JSON.parse(guardada) : null;

        }

        catch {

            return null;

        }

    }

}
