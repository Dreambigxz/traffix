import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router,
  NavigationEnd
} from '@angular/router';

import {
  filter,
  startWith
} from 'rxjs/operators';

import {
  firstValueFrom
} from 'rxjs';

import {
  NewsListComponent
} from '../news-list/news-list.component';

import {
  QuickNavService
} from '../../reuseables/services/quick-nav.service';


@Component({
  selector: 'app-news-categories-nav',

  imports: [
    CommonModule,
    NewsListComponent
  ],

  templateUrl:
    './news-categories-nav.component.html',

  styleUrl:
    './news-categories-nav.component.scss'
})
export class NewsCategoriesNavComponent {

  // ==========================================
  // INPUT / OUTPUT
  // ==========================================

  @Input()
  activeCategory = 'all';

  @Output()
  categoryChanged =
    new EventEmitter<string>();


  // ==========================================
  // ARTICLES
  // ==========================================

  articles: any[] = [];


  // ==========================================
  // CATEGORIES
  // ==========================================

  categories: any[] = [
    {
      key: 'all',
      label: 'All',
      icon: 'bi-grid'
    },

    // {
    //   key: 'latest',
    //   label: 'Latest',
    //   icon: 'bi-newspaper'
    // },
    //
    // {
    //   key: 'sports',
    //   label: 'Sports',
    //   icon: 'bi-dribbble'
    // },
    //
    // {
    //   key: 'technology',
    //   label: 'Technology',
    //   icon: 'bi-cpu-fill'
    // },
    //
    // {
    //   key: 'business',
    //   label: 'Business',
    //   icon: 'bi-bar-chart-fill'
    // },
    //
    // {
    //   key: 'entertainment',
    //   label: 'Entertainment',
    //   icon: 'bi-camera-reels-fill'
    // }
  ];




  // ==========================================
  // PAGINATION
  // ==========================================

  pagination: any = null;

  loadingMore =
    signal<boolean>(false);

  loadingDirection =
    signal<'next' | 'previous' | null>(
      null
    );


  /**
   * Cache each API page.
   *
   * pageCache[1] = [...]
   * pageCache[2] = [...]
   */
  pageCache:
    Record<number, any[]> = {};


  constructor(
    private quickNav: QuickNavService,
    private router: Router
  ) {}


  // ==========================================
  // INIT
  // ==========================================

  ngOnInit(): void {

    this.router.events
      .pipe(
        filter(
          event =>
            event instanceof NavigationEnd
        ),
        startWith(null)
      )
      .subscribe(() => {

        const url =
          new URL(
            window.location.href
          );

        if (
          url.pathname !== '/'
        ) {
          return;
        }


        /**
         * Prevent reloading if page 1
         * already exists.
         */
        if (
          !this.pageCache[1]
        ) {

          this.initializeNews();

        }

      });
  }


  // ==========================================
  // INITIAL LOAD
  // ==========================================

  async initializeNews():
    Promise<void> {

    try {

      let incoming = this.quickNav.storeData.get("articles")
      if (!incoming) {
        const res: any =
          await this.fetchNews(
            'articles/?page=1'
          );
          incoming =
          res?.main?.articles ?? []

      }

      // Current visible page
      this.articles = [
        ...incoming
      ];


      // Cache page 1
      this.pageCache[1] = [
        ...incoming
      ];


      this.pagination = this.quickNav.storeData.get("pagination")


      // Build category tabs
      this.updateCategories(
        incoming
      );


    } catch (error) {

      console.error(
        'Failed to load articles:',
        error
      );
    }
  }


  // ==========================================
  // API
  // ==========================================

  async fetchNews(
    url: string
  ): Promise<any> {

    return await firstValueFrom(
      this.quickNav.reqServerData.get(
        url
      )
    );
  }


  // ==========================================
  // CATEGORY GENERATOR
  // ==========================================

  private updateCategories(
    articles: any[]
  ): void {

    for (
      const article of articles
    ) {

      const key =
        article?.category
          ?.trim()
          ?.toLowerCase();


      if (!key) {
        continue;
      }


      const exists =
        this.categories.some(
          category =>
            category.key === key
        );


      if (exists) {
        continue;
      }


      this.categories.push({

        key,

        label:
          article.category ||
          key,

        color:
          article.category_color ||
          null,

        icon:
          this.getCategoryIcon(article.category)

      });
    }
  }


  // ==========================================
  // CATEGORY SELECT
  // ==========================================

  selectCategory(
    category: string
  ): void {

    this.activeCategory =
      category.trim().toLowerCase();
  }


  // ==========================================
  // FILTER ARTICLES
  // ==========================================

  get filteredArticles():
    any[] {

    const category =
      this.activeCategory
        ?.trim()
        ?.toLowerCase();


    // ALL
    if (
      !category ||
      category === 'all'
    ) {

      return this.articles;
    }


    // FILTER CURRENT PAGE
    return this.articles.filter(
      article =>

        article?.category
          ?.trim()
          ?.toLowerCase() ===
        category
    );
  }


  // ==========================================
  // PAGINATION
  // ==========================================

  async loadPage(
    type: 'next' | 'previous'
  ): Promise<void> {

    if (
      !this.pagination ||
      this.loadingMore()
    ) {
      return;
    }


    // Check direction
    if (
      type === 'next' &&
      !this.pagination.has_next
    ) {
      return;
    }


    if (
      type === 'previous' &&
      !this.pagination.has_previous
    ) {
      return;
    }


    const currentPage =
      Number(
        this.pagination.current_page
      );


    const targetPage =
      type === 'next'
        ? currentPage + 1
        : currentPage - 1;


    // Invalid page
    if (
      targetPage < 1 ||
      targetPage >
        Number(
          this.pagination.total_pages
        )
    ) {
      return;
    }


    // ========================================
    // ALREADY CACHED
    // ========================================

    if (
      this.pageCache[targetPage]
    ) {

      this.articles = [
        ...this.pageCache[
          targetPage
        ]
      ];


      this.updatePaginationLocally(
        targetPage
      );


      return;
    }


    // ========================================
    // FETCH PAGE
    // ========================================

    this.loadingMore.set(true);

    this.loadingDirection.set(
      type
    );


    try {

      const res: any =
        await this.fetchNews(
          `articles/?page=${targetPage}&hideSpinnerimportant`
        );


      const incoming =
        res?.main?.articles ?? [];


      // Cache it
      this.pageCache[
        targetPage
      ] = [
        ...incoming
      ];


      // Display this page
      this.articles = [
        ...incoming
      ];


      // Discover new categories
      this.updateCategories(
        incoming
      );


      // Pagination from backend
      this.pagination =
        res?.main?.pagination ??
        this.pagination;


    } catch (error) {

      console.error(
        'Failed to load page:',
        error
      );


    } finally {

      this.loadingMore.set(
        false
      );

      this.loadingDirection.set(
        null
      );
    }
  }


  // ==========================================
  // CACHED PAGE PAGINATION
  // ==========================================

  private updatePaginationLocally(
    page: number
  ): void {

    const totalPages =
      Number(
        this.pagination.total_pages
      );


    this.pagination = {
      ...this.pagination,

      current_page:
        page,

      has_previous:
        page > 1,

      has_next:
        page < totalPages,

      previous:
        page > 1
          ? true
          : null,

      next:
        page < totalPages
          ? true
          : null
    };
  }


  // ==========================================
  // PROMOTION
  // ==========================================

  openPromotion(): void {

    alert(
      'Sponsored earning not active at the moment'
    );
  }

  getCategoryIcon(
    category: string
  ): string {

    switch (
      category?.trim().toLowerCase()
    ) {

      case 'sports':
        return 'bi-trophy-fill';

      case 'uk':
        return 'bi-geo-alt-fill';

      case 'latest':
        return 'bi-clock-fill';

      case 'politics':
        return 'bi-bank';

      case 'world':
        return 'bi-globe2';

      case 'education':
        return 'bi-mortarboard-fill';

      case 'technology':
        return 'bi-cpu-fill';

      case 'business':
        return 'bi-briefcase-fill';

      default:
        return 'bi-newspaper';
    }
  }

}
