import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Component({
  styleUrls: ['./login.component.scss'],
  templateUrl: 'login.component.html',
})
export class LoginComponent implements OnInit {
  public loading = false;
  public submitted = false;
  public returnUrl: string;

  public loginFailedMessage = $localize`:@@login.failed:Failed to login: Supply valid credentials.`;

  constructor(
    private readonly router: Router,
    private readonly oidcSecurityService: OidcSecurityService,
  ) { }

  ngOnInit() {
    this.oidcSecurityService.checkAuth().subscribe((auth: boolean) => {
      console.log('is authenticated', auth);
      if (auth) {
        this.router.navigate(['/viewer']);
      }
    });
  }

  public login() {
    this.oidcSecurityService.authorize();
  }
}
