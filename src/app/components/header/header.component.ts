import {
  ChangeDetectionStrategy,
   Component,
    EventEmitter,
     Input,
     Output,
   HostListener } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink, NavigationEnd, RouterLinkActive} from '@angular/router';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  @Input() title = 'Trade Summary';
  @Input() subtitle = '';
  @Input() wallet : any;
  @Input() currency = 'USD';

  @Output() menu = new EventEmitter<void>();

  isScrolled = false;

  constructor(
      // public quickNav:QuickNavService,
      private router: Router
  ){}

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY >= 60;
  }

  pageName = location.pathname.replaceAll("/","")

  goBack(){this.pageName === 'confirm-payment'?this.router.navigate(['/']):window.history.go(-1)}

  ngOnInit() {
    this.segments(location.pathname.split('/'))
    this.router.events.subscribe((event:any) => {
      if (event instanceof NavigationEnd) {
        this.segments(event.urlAfterRedirects.split('/'))
      }
    });
  }

  segments(segments:any){

    this.subtitle = "";

    let pageName = location.pathname
    if (pageName.includes("plan/new")) {
      this.pageName="Plan"
      this.subtitle = "Add new"
    }
    if (pageName.includes("task/history")) {
      this.pageName="History"
      this.subtitle = "Task"
    }
    else if (segments.includes("article")) {
      this.pageName="Details"//segments.pop()?.split("?")[0].replaceAll("-"," ").toUpperCase() || ''
      this.subtitle = 'Article'
    }
    else if (location.pathname.includes('invites/users')) {
      this.pageName=segments.pop()?.split("?")[0].replaceAll("-"," ").toUpperCase()
      this.subtitle = 'Level'
    }
    else{
      this.pageName=segments.pop()?.split("?")[0].replaceAll("-"," ").toUpperCase() || ''
    }

    this.title = this.pageName

    // this.quickNav.storeData.set("pageName", )
    // console.log({"pageName": this.pageName});

  }
}
