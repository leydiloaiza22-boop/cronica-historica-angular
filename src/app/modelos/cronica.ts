/* =========================================================
   ESTRUCTURA DE UNA CRÓNICA (datos/cronicas.json)
========================================================= */

export interface Cronica {
    id: number;
    titulo: string;
    categoria: string;
    icono: string;
    fecha: string;
    autor: string;
    imagen: string;
    resumen: string;
    contenido: string;
}
