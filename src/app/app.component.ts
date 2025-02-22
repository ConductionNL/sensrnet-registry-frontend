import { Title } from '@angular/platform-browser';
import { Component } from '@angular/core';

@Component({ selector: 'app-root', templateUrl: 'app.component.html' })
export class AppComponent {

  public title = $localize`:@@app.title:Sensor Registry`;

  constructor(
    private titleService: Title,
  ) {
    this.setTitle(this.title);
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }
}
