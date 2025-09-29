import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { getKeycloak } from './keycloak.init';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const kc = getKeycloak();
    if (kc.authenticated) return true;
    await kc.login({ redirectUri: window.location.href });
    return false;
  }
}