import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MomentAgoPipe } from '../../reuseables/pipes/moment.pipe'; // ✅ adjust path as needed
import { Router } from '@angular/router';


@Component({
  selector: 'app-news-list',
  imports: [
    CommonModule,
    MomentAgoPipe

  ],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss'
})
export class NewsListComponent {


  @Input({ required: true }) articles!: any;

  @Output() viewMore = new EventEmitter<string>();
  @Output() articleSelected = new EventEmitter<any>();


  constructor(
    private router: Router
  ){}

  openArticle(article: any): void {
    this.articleSelected.emit(article);
    this.router.navigate([
      '/article',
      article.id
    ]);


  }

  formatCount(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return value.toString();
  }


}
