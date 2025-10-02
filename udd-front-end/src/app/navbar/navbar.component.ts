import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { getKeycloak } from '../auth/keycloak.init';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule], 
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  constructor(
    private router: Router,
  ) { }

  logout() {
    getKeycloak().logout({
      redirectUri: window.location.origin,
    });
  }

  isLoggedIn(): boolean {
    return getKeycloak().authenticated ?? false;
  }

  public homepage() { 
    return getKeycloak().authenticated ?? false;
  }

}
