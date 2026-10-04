import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-news-header',
  imports: [
    CommonModule
  ],
  templateUrl: './news-header.component.html',
  styleUrl: './news-header.component.scss'
})
export class NewsHeaderComponent {

  @Input() userName: string = 'username';
  @Input() quickNav: any;
  @Input() unreadNotificationsCount: any;

  onSearch(): void {
    console.log('Search clicked');
  }

  onNotificationClick(): void {
    this.quickNav.go("/notifications")
  }

  get getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }

  get getCurrentDateTime(): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      // year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date());
  }

}
