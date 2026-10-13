import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    inject,
    signal,
    viewChild
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Cronica } from '../../modelos/cronica';
import { CronicasService } from '../../servicios/cronicas.service';

/* =========================================================
   CRÓNICAS (antes paginas/historia.html)
   Catálogo, filtros, buscador, favoritos, modal de lectura
   y mini CRUD. Misma lógica que js/script.js.
========================================================= */

@Component({
    selector: 'app-historia',
    imports: [RouterLink, NgTemplateOutlet],
    templateUrl: './historia.component.html',
    host: {
        '(document:keydown)': 'teclaPresionada($event)'
    }
})
export class HistoriaComponent implements OnInit, OnDestroy {

    private servicio = inject(CronicasService);

    private ruta = inject(ActivatedRoute);


    /* =========================================================
       VARIABLES GENERALES
    ========================================================= */

    cronicas = signal<Cronica[]>([]);

    categoriaSeleccionada = signal("Todas");

    modoFavoritos = false;


    /* ESTADO DE LA VISTA */

    estado = signal<'cargando' | 'listo' | 'error'>('cargando');

    resultados = signal<Cronica[]>([]);

    versionCatalogo = signal(0);

    favoritos = signal<number[]>([]);

    guardadas = signal<Cronica[]>([]);

    favoritosMostrados = signal(false);

    versionFavoritos = signal(0);

    contadorFavoritos = signal("0 guardadas");

    tituloCatalogo = signal("Historias para recordar");

    detalle = signal<Cronica | null>(null);

    modalAbierto = signal(false);

    listaCrud = signal<Cronica[]>([]);


    /* PARÁMETROS DE LA URL */

    private parametros =
        this.ruta.snapshot.queryParamMap;

    busquedaInicial =
        this.parametros.get("buscar") ?? "";

    private temporizadorDetalle?: ReturnType<typeof setTimeout>;

    private temporizadorAncla?: ReturnType<typeof setTimeout>;


    /* ELEMENTOS DEL FORMULARIO */

    private buscador =
        viewChild.required<ElementRef<HTMLInputElement>>('buscadorCronicas');

    private formCrud =
        viewChild.required<ElementRef<HTMLFormElement>>('formCrud');

    private crudId =
        viewChild.required<ElementRef<HTMLInputElement>>('crudId');

    private crudTitulo =
        viewChild.required<ElementRef<HTMLInputElement>>('crudTitulo');

    private crudCategoria =
        viewChild.required<ElementRef<HTMLSelectElement>>('crudCategoria');

    private crudResumen =
        viewChild.required<ElementRef<HTMLTextAreaElement>>('crudResumen');

    private crudContenido =
        viewChild.required<ElementRef<HTMLTextAreaElement>>('crudContenido');


    /* FECHA */

    fechaActual = this.servicio.mostrarFecha();


    /* =========================================================
       INICIO
    ========================================================= */

    ngOnInit(): void {

        this.aplicarCategoriaDesdeURL();

        this.cargarCronicas();

    }


    ngOnDestroy(): void {

        clearTimeout(this.temporizadorDetalle);

        clearTimeout(this.temporizadorAncla);

        document.body.classList.remove(
            "modal-abierto"
        );

    }


    /* =========================================================
       SUSCRIPCIÓN
    ========================================================= */

    configurarSuscripcion(): void {

        this.servicio.configurarSuscripcion();

    }


    /* =========================================================
       CARGAR JSON
    ========================================================= */

    async cargarCronicas(): Promise<void> {

        try {

            const datos =
                await this.servicio.cargarCronicas();


            this.cronicas.set(datos);


            this.mostrarCronicas();

            this.mostrarFavoritos();

            this.mostrarListaCrud();

            this.mostrarDetalleDesdeURL();

            this.irAlAnclaDesdeURL();

        }

        catch (error) {

            console.error(error);

            this.estado.set('error');

        }

    }


    /* =========================================================
       MOSTRAR CRÓNICAS
    ========================================================= */

    mostrarCronicas(): void {

        let resultados =
            [...this.cronicas()];


        /* FILTRO POR CATEGORÍA */

        if (
            this.categoriaSeleccionada() !== "Todas"
        ) {

            resultados =
                resultados.filter(
                    cronica =>
                        cronica.categoria ===
                        this.categoriaSeleccionada()
                );

        }


        /* BÚSQUEDA */

        const buscador =
            this.buscador().nativeElement;


        if (
            buscador &&
            buscador.value.trim() !== ""
        ) {

            const texto =
                buscador.value
                    .toLowerCase()
                    .trim();


            resultados =
                resultados.filter(
                    cronica =>

                        cronica.titulo
                            .toLowerCase()
                            .includes(texto)

                        ||

                        cronica.resumen
                            .toLowerCase()
                            .includes(texto)

                        ||

                        cronica.categoria
                            .toLowerCase()
                            .includes(texto)

                );

        }


        /* FAVORITOS */

        const favoritos =
            this.servicio.obtenerFavoritos();

        this.favoritos.set(favoritos);


        if (this.modoFavoritos) {

            resultados =
                resultados.filter(
                    cronica =>
                        favoritos.includes(
                            cronica.id
                        )
                );

        }


        /* CREAR TARJETAS (la plantilla muestra "sin resultados" si está vacío) */

        this.estado.set('listo');

        this.resultados.set(resultados);

        this.versionCatalogo.update(
            version => version + 1
        );

    }


    /* =========================================================
       ¿ES FAVORITA?
    ========================================================= */

    esFavorita(id: number): boolean {

        return this.favoritos().includes(id);

    }


    /* =========================================================
       FILTROS
    ========================================================= */

    configurarFiltros(categoria: string): void {

        this.categoriaSeleccionada.set(
            categoria
        );


        this.modoFavoritos = false;


        this.mostrarCronicas();

    }


    /* =========================================================
       GUARDAR / QUITAR FAVORITO
    ========================================================= */

    alternarFavorito(id: number): void {

        let favoritos =
            this.servicio.obtenerFavoritos();


        if (
            favoritos.includes(id)
        ) {

            favoritos =
                favoritos.filter(
                    favorito =>
                        favorito !== id
                );

        } else {

            favoritos.push(id);

        }


        this.servicio.guardarFavoritos(
            favoritos
        );


        this.mostrarCronicas();

        this.mostrarFavoritos();

    }


    /* =========================================================
       MOSTRAR MI ARCHIVO
    ========================================================= */

    mostrarFavoritos(): void {

        const favoritos =
            this.servicio.obtenerFavoritos();

        this.favoritos.set(favoritos);


        const guardadas =
            this.cronicas().filter(
                cronica =>
                    favoritos.includes(
                        cronica.id
                    )
            );


        this.contadorFavoritos.set(
            `${guardadas.length} ${
                guardadas.length === 1
                    ? "guardada"
                    : "guardadas"
            }`
        );


        this.guardadas.set(guardadas);

        this.favoritosMostrados.set(true);

        this.versionFavoritos.update(
            version => version + 1
        );

    }


    /* =========================================================
       MOSTRAR SOLO FAVORITOS DESDE URL
    ========================================================= */

    revisarVistaFavoritos(): void {

        if (
            this.parametros.get(
                "favoritos"
            ) === "1"
        ) {

            this.modoFavoritos = true;


            this.tituloCatalogo.set(
                "Mis crónicas guardadas"
            );


            this.mostrarCronicas();

        }

    }


    /* =========================================================
       DETALLE DE CRÓNICA
    ========================================================= */

    abrirCronica(id: number): void {

        const cronica =
            this.cronicas().find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!cronica) {
            return;
        }


        this.detalle.set(cronica);


        this.modalAbierto.set(true);


        document.body.classList.add(
            "modal-abierto"
        );

    }


    /* =========================================================
       ACTUALIZAR DETALLE
    ========================================================= */

    actualizarDetalle(id: number): void {

        this.abrirCronica(id);

    }


    /* =========================================================
       FORMATEAR CONTENIDO (un párrafo por cada salto doble)
    ========================================================= */

    formatearContenido(
        contenido: string
    ): string[] {

        return contenido
            .split("\n\n");

    }


    /* =========================================================
       MODAL
    ========================================================= */

    clicEnModal(event: MouseEvent): void {

        if (
            event.target ===
            event.currentTarget
        ) {

            this.cerrarModal();

        }

    }


    teclaPresionada(event: KeyboardEvent): void {

        if (
            event.key === "Escape"
        ) {

            this.cerrarModal();

        }

    }


    cerrarModal(): void {

        this.modalAbierto.set(false);


        document.body.classList.remove(
            "modal-abierto"
        );

    }


    /* =========================================================
       DETALLE DESDE URL
    ========================================================= */

    mostrarDetalleDesdeURL(): void {

        const id =
            this.parametros.get("id");


        if (id) {

            this.temporizadorDetalle = setTimeout(
                () => {

                    this.abrirCronica(
                        Number(id)
                    );

                },
                100
            );

        }


        this.revisarVistaFavoritos();

    }


    /* =========================================================
       CATEGORÍA DESDE URL  (/historia?categoria=Patrimonio)
    ========================================================= */

    aplicarCategoriaDesdeURL(): void {

        const categoria =
            this.parametros.get("categoria");


        if (
            categoria &&
            ["Historia", "Personajes", "Patrimonio"].includes(categoria)
        ) {

            this.categoriaSeleccionada.set(
                categoria
            );

        }

    }


    /* =========================================================
       ANCLA DESDE URL  (/historia#archivo)
       Se hace después de cargar las crónicas, porque las
       tarjetas empujan la sección hacia abajo.
    ========================================================= */

    irAlAnclaDesdeURL(): void {

        const ancla =
            this.ruta.snapshot.fragment;


        if (!ancla) {
            return;
        }


        this.temporizadorAncla = setTimeout(
            () => {

                document
                    .getElementById(ancla)
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            },
            100
        );

    }


    /* =========================================================
       MINI CRUD
    ========================================================= */

    configurarCrud(event: Event): void {

        event.preventDefault();


        const id =
            this.crudId().nativeElement.value;


        const titulo =
            this.crudTitulo().nativeElement.value.trim();


        const categoria =
            this.crudCategoria().nativeElement.value;


        const resumen =
            this.crudResumen().nativeElement.value.trim();


        const contenido =
            this.crudContenido().nativeElement.value.trim();


        if (
            !titulo ||
            !resumen ||
            !contenido
        ) {

            alert(
                "Completa todos los campos de la crónica."
            );

            return;

        }


        const cronicas =
            [...this.cronicas()];


        if (id) {

            const indice =
                cronicas.findIndex(
                    cronica =>
                        Number(
                            cronica.id
                        ) ===
                        Number(id)
                );


            if (
                indice !== -1
            ) {

                cronicas[indice] = {

                    ...cronicas[indice],

                    titulo,

                    categoria,

                    resumen,

                    contenido

                };

            }

        } else {

            const nuevoId =
                cronicas.length
                    ? Math.max(
                        ...cronicas.map(
                            item =>
                                Number(
                                    item.id
                                )
                        )
                    ) + 1
                    : 1;


            cronicas.push({

                id: nuevoId,

                titulo,

                categoria,

                icono:
                    categoria === "Historia"
                        ? "📜"
                        : categoria === "Personajes"
                            ? "👤"
                            : "🏛️",

                fecha:
                    this.servicio.obtenerFechaActual(),

                autor:
                    "Redacción Crónica Histórica",

                imagen:
                    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80",
                resumen,

                contenido

            });

        }


        this.cronicas.set(cronicas);


        this.servicio.guardarCronicasPersonalizadas(
            cronicas
        );


        this.formCrud().nativeElement.reset();


        this.crudId().nativeElement.value = "";


        this.mostrarCronicas();

        this.mostrarFavoritos();

        this.mostrarListaCrud();


        alert(
            "La crónica fue guardada correctamente."
        );

    }


    /* =========================================================
       LISTA CRUD
    ========================================================= */

    mostrarListaCrud(): void {

        this.listaCrud.set(
            [...this.cronicas()]
        );

    }


    /* =========================================================
       EDITAR
    ========================================================= */

    editarCronica(id: number): void {

        const cronica =
            this.cronicas().find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!cronica) {
            return;
        }


        this.crudId().nativeElement.value =
            String(cronica.id);

        this.crudTitulo().nativeElement.value =
            cronica.titulo;

        this.crudCategoria().nativeElement.value =
            cronica.categoria;

        this.crudResumen().nativeElement.value =
            cronica.resumen;

        this.crudContenido().nativeElement.value =
            cronica.contenido;


        this.formCrud().nativeElement
            .scrollIntoView({
                behavior: "smooth"
            });

    }


    /* =========================================================
       ELIMINAR
    ========================================================= */

    eliminarCronica(id: number): void {

        const confirmar =
            confirm(
                "¿Deseas eliminar esta crónica?"
            );


        if (!confirmar) {
            return;
        }


        const cronicas =
            this.cronicas().filter(
                cronica =>
                    Number(cronica.id) !==
                    Number(id)
            );

        this.cronicas.set(cronicas);


        let favoritos =
            this.servicio.obtenerFavoritos();


        favoritos =
            favoritos.filter(
                favorito =>
                    Number(favorito) !==
                    Number(id)
            );


        this.servicio.guardarFavoritos(
            favoritos
        );


        this.servicio.guardarCronicasPersonalizadas(
            cronicas
        );


        this.mostrarCronicas();

        this.mostrarFavoritos();

        this.mostrarListaCrud();

    }


    /* =========================================================
       LIMPIAR CRUD
    ========================================================= */

    limpiarFormularioCrud(): void {

        this.formCrud().nativeElement.reset();

        this.crudId().nativeElement.value = "";

    }

}
