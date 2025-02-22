import { Router } from '@angular/router';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavBarComponent {
  @Input() locationClass;

  constructor(
    private router: Router,
  ) {}

  public async toggleMenu() {
    if (this.router.url === '/viewer') {
      await this.router.navigate(['/devices']);
    } else {
      await this.router.navigate(['/viewer']);
    }
  }
}
