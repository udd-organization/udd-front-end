import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../env/environment';
import { getKeycloak } from './keycloak.init';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.startsWith(environment.apiHost)) {
      return next.handle(req);
    }

    const kc = getKeycloak();
    if (!kc) return next.handle(req);

    const refresh = kc.updateToken ? kc.updateToken(30) : Promise.resolve(true);

    return from(refresh).pipe(
      switchMap(() => {
        const token = kc.token;
        const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
        if (req.url.startsWith(environment.apiHost)) {
            console.log('[AuthInterceptor]', req.method, req.url, token ? 'ATTACHED' : 'NO TOKEN');
        }
    
    return next.handle(authReq);
    }),
    catchError(() => next.handle(req))
    );
  }
}