import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NewsHeaderComponent } from '../articles/news-header/news-header.component';
import { NewsCategoriesNavComponent } from '../articles/news-categories-nav/news-categories-nav.component';
import { SlidersComponent } from '../components/sliders/sliders.component';
import { QuickNavService } from '../reuseables/services/quick-nav.service'; // ✅ adjust path as needed

import { MobileMenuComponent } from "../components/mobile-menu/mobile-menu.component";
import { UseGuideService } from "../use-guide/use-guide.service";
import { UseGuideComponent } from "../use-guide/use-guide.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-main',
  imports: [
    CommonModule,
    MobileMenuComponent,
    NewsHeaderComponent,
    SlidersComponent,
    NewsCategoriesNavComponent,
    UseGuideComponent,
    RouterLink
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {

  constructor(
    public quickNav:QuickNavService,
    private useGuide: UseGuideService
  ){}

    ngOnInit(){

      setTimeout(() => {

      }, 5000);
      const seenGuide = window.localStorage.getItem("useGuide")
      if (!seenGuide) {
        this.useGuide.open()
      }
    }

    get getCurrentDateTime(): string {
      return new Intl.DateTimeFormat('en-US', {

        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        // year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date());
    }


}
