import { Injectable } from '@angular/core';
import { getKeycloak } from '../auth/keycloak.init';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private kc = getKeycloak();

  getToken(): string | undefined {
    return this.kc.token;
  }

  getUsername(): string | undefined {
    return this.kc.idTokenParsed?.['preferred_username']
        ?? this.kc.tokenParsed?.['preferred_username'];
  }

  getIdTokenParsed(): any {
    return this.kc.idTokenParsed;
  }

  isAuthenticated(): boolean {
    return !!this.kc.authenticated;
  }

  async updateToken(minValidity = 30): Promise<boolean> {
    try {
      const refreshed = await this.kc.updateToken(minValidity);
      return refreshed;
    } catch (err) {
      console.error('Failed to refresh token', err);
      return false;
    }
  }

  logout(): void {
    this.kc.logout();
  }
}