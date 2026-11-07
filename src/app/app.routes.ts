import { Routes } from '@angular/router';

import { InicioComponent } from './paginas/inicio/inicio.component';
import { HistoriaComponent } from './paginas/historia/historia.component';
import { PersonajesComponent } from './paginas/personajes/personajes.component';
import { ContactoComponent } from './paginas/contacto/contacto.component';
import { IngresarComponent } from './paginas/ingresar/ingresar.component';

/* =========================================================
   RUTAS
   index.html              ->  /
   paginas/historia.html   ->  /historia
   paginas/personajes.html ->  /personajes
   paginas/contacto.html   ->  /contacto
   (nueva) inicio de sesión ->  /ingresar
========================================================= */

export const routes: Routes = [

    {
        path: '',
        component: InicioComponent,
        title: 'Crónica Histórica'
    },

    {
        path: 'historia',
        component: HistoriaComponent,
        title: 'Crónicas | Crónica Histórica'
    },

    {
        path: 'personajes',
        component: PersonajesComponent,
        title: 'Personajes | Crónica Histórica'
    },

    {
        path: 'contacto',
        component: ContactoComponent,
        title: 'Contacto | Crónica Histórica'
    },

    {
        path: 'ingresar',
        component: IngresarComponent,
        title: 'Ingresar | Crónica Histórica'
    },

    // Compatibilidad con los enlaces del proyecto original
    { path: 'index.html', redirectTo: '' },
    { path: 'paginas/historia.html', redirectTo: 'historia' },
    { path: 'paginas/personajes.html', redirectTo: 'personajes' },
    { path: 'paginas/contacto.html', redirectTo: 'contacto' },

    { path: '**', redirectTo: '' }

];
