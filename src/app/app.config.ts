import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZonelessChangeDetection
} from '@angular/core';

import { provideHttpClient, withFetch } from '@angular/common/http';

import {
    provideRouter,
    RouteReuseStrategy,
    withInMemoryScrolling
} from '@angular/router';

import { routes } from './app.routes';
import { ReutilizacionComoPaginas } from './reutilizacion-rutas';

export const appConfig: ApplicationConfig = {

    providers: [

        provideBrowserGlobalErrorListeners(),

        provideZonelessChangeDetection(),

        provideHttpClient(withFetch()),

        provideRouter(
            routes,
            withInMemoryScrolling({
                // Igual que al cambiar de página: arriba del todo,
                // o hasta el ancla (#archivo, #patrimonio).
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled'
            })
        ),

        {
            provide: RouteReuseStrategy,
            useClass: ReutilizacionComoPaginas
        }

    ]

};
