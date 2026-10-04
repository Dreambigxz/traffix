import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  NewsListComponent
} from '../news-list/news-list.component';

import {
  QuickNavService
} from '../../reuseables/services/quick-nav.service';

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


@Component({
  selector: 'app-news-categories-nav',

  imports: [
    CommonModule,
    NewsListComponent,
  ],

  templateUrl:
    './news-categories-nav.component.html',

  styleUrl:
    './news-categories-nav.component.scss'
})
export class NewsCategoriesNavComponent {

  @Input()
  activeCategory = 'all';

  @Output()
  categoryChanged =
    new EventEmitter<string>();


  // ==========================================
  // CATEGORIES
  // ==========================================

  categories: any[] = [
    {
      key: 'all',
      label: 'All',
      icon: 'bi-grid'
    },

    {},

    {
      key: 'sports',
      label: 'Sports',
      icon: 'bi-dribbble'
    },

    {
      key: 'technology',
      label: 'Technology',
      icon: 'bi-cpu-fill'
    },

    {
      key: 'business',
      label: 'Business',
      icon: 'bi-bar-chart-fill'
    },

    {
      key: 'entertainment',
      label: 'Entertainment',
      icon: 'bi-camera-reels-fill'
    }
  ];


  // ==========================================
  // NEWS
  // ==========================================

  newsSections: any[] = [];

  filteredSections: any[] = [];

  articles: any;


  // ==========================================
  // PAGINATION
  // ==========================================

  pagination: any = null;

  loadingMore =
    signal<boolean>(false);

  loadingDirection =
    signal<'next' | 'previous' | null>(null);


  /**
   * Stores pages that have already been
   * downloaded.
   *
   * {
   *   1: [...],
   *   2: [...],
   *   3: [...]
   * }
   */
  pageCache: Record<number, any[]> = {};


  constructor(
    private quickNav: QuickNavService,
    private router: Router
  ) {}


  // ==========================================
  // INIT
  // ==========================================

  async ngOnInit() {

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
          new URL(window.location.href);

        if (url.pathname !== '/') {
          return;
        }

        this.initializeNews();
      });
  }


  // ==========================================
  // INITIAL NEWS
  // ==========================================

  async initializeNews(): Promise<void> {

    /**
     * If articles already exist in QuickNav,
     * use them first.
     */
    const storedArticles =
      this.quickNav.storeData.get(
        'articles'
      );

    if (storedArticles?.length) {

      this.newsSections =
        storedArticles;

      /**
       * We don't return here because
       * pagination may not exist locally.
       *
       * If you store pagination separately,
       * this can be improved further.
       */
    }


    /**
     * If page 1 has already been cached
     * inside this component, don't request it.
     */
    if (this.pageCache[1]) {

      this.newsSections =
        this.pageCache[1];

      return;
    }


    try {

      const res: any =
        await this.fetchNews(
          'articles/'
        );


      this.newsSections =
        this.quickNav.storeData.get(
          'articles'
        ) ??
        res?.main?.articles ??
        [];


      this.pagination =
        res?.main?.pagination ??
        null;


      // Cache page 1
      if (
        this.pagination?.current_page
      ) {

        this.pageCache[
          this.pagination.current_page
        ] = this.cloneSections(
          this.newsSections
        );
      }


      this.updateLatestCategory();

    } catch (error) {

      console.error(
        'Failed to initialize news:',
        error
      );
    }
  }


  // ==========================================
  // FETCH NEWS
  // ==========================================

  async fetchNews(
    url: string = 'articles/'
  ): Promise<any> {

    return await firstValueFrom(
      this.quickNav.reqServerData.get(
        url
      )
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


    // ------------------------------------------
    // CHECK BUTTON AVAILABILITY
    // ------------------------------------------

    if (
      type === 'next' &&
      !this.pagination.next
    ) {
      return;
    }

    if (
      type === 'previous' &&
      !this.pagination.previous
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


    // ------------------------------------------
    // PAGE VALIDATION
    // ------------------------------------------

    if (
      targetPage < 1 ||
      targetPage >
        this.pagination.total_pages
    ) {
      return;
    }


    // ------------------------------------------
    // CACHED PAGE
    // ------------------------------------------

    if (this.pageCache[targetPage]) {

      this.newsSections =
        this.cloneSections(
          this.pageCache[targetPage]
        );


      this.updatePaginationLocally(
        targetPage
      );


      this.updateLatestCategory();

      this.scrollToNews();

      return;
    }


    // ------------------------------------------
    // FETCH NEW PAGE
    // ------------------------------------------

    this.loadingMore.set(true);

    this.loadingDirection.set(type);


    try {

      const res: any =
        await this.fetchNews(
          `articles/next/?page=${targetPage}&hideSpinnerimportant`
        );


      const incoming =
        res?.main?.articles_next ??
        res?.main?.articles ??
        [];


      // ------------------------------------------
      // CACHE THE PAGE
      // ------------------------------------------

      this.pageCache[targetPage] =
        this.cloneSections(
          incoming
        );


      // ------------------------------------------
      // DISPLAY ONLY THIS PAGE
      // ------------------------------------------

      this.newsSections =
        this.cloneSections(
          incoming
        );


      // ------------------------------------------
      // USE SERVER PAGINATION
      // ------------------------------------------

      this.pagination =
        res?.main?.pagination ??
        this.pagination;


      this.updateLatestCategory();

      this.scrollToNews();


    } catch (error) {

      console.error(
        'Failed to load page:',
        error
      );

    } finally {

      this.loadingMore.set(false);

      this.loadingDirection.set(null);
    }
  }


  // ==========================================
  // LOCAL PAGINATION
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

      current_page: page,

      /**
       * Your template only needs these
       * to be truthy/falsy for cached pages.
       */
      previous:
        page > 1
          ? true
          : null,

      next:
        page < totalPages
          ? true
          : null,

      has_previous:
        page > 1,

      has_next:
        page < totalPages
    };
  }


  // ==========================================
  // CLONE SECTIONS
  // ==========================================

  private cloneSections(
    sections: any[]
  ): any[] {

    return sections.map(
      section => ({
        ...section,

        articles: [
          ...(section.articles ?? [])
        ]
      })
    );
  }


  // ==========================================
  // CATEGORY
  // ==========================================

  selectCategory(
    category: string
  ): void {

    this.activeCategory =
      category;

    this.categoryChanged.emit(
      category
    );
  }


  // ==========================================
  // FILTERED NEWS
  // ==========================================

  get filteredNewsSections() {

    const category =
      this.activeCategory
        ?.trim()
        .toLowerCase();


    if (
      !category ||
      category === 'all'
    ) {

      return this.newsSections;
    }


    if (
      category === 'latest'
    ) {

      return this.latestNews;
    }


    return this.newsSections.filter(
      section =>

        section.key
          ?.toLowerCase() === category ||

        section.title
          ?.toLowerCase() === category
    );
  }


  // ==========================================
  // LATEST NEWS
  // ==========================================

  get latestNews() {

    const now =
      Date.now();

    const oneHour =
      60 * 60 * 1000;


    return this.newsSections
      .map(
        section => ({

          ...section,

          articles:
            (
              section.articles ??
              []
            ).filter(
              (article: any) => {

                const articleTime =
                  new Date(
                    article.time
                  ).getTime();


                if (
                  Number.isNaN(
                    articleTime
                  )
                ) {
                  return false;
                }


                const difference =
                  now - articleTime;


                return (
                  difference >= 0 &&
                  difference <= oneHour
                );
              }
            )
        })
      )
      .filter(
        section =>
          section.articles.length > 0
      );
  }


  // ==========================================
  // LATEST CATEGORY
  // ==========================================

  private updateLatestCategory(): void {

    if (
      this.latestNews.length
    ) {

      this.categories[1] = {
        key: 'latest',
        label: 'Latest',
        icon: 'bi-newspaper'
      };

      return;
    }


    this.categories[1] = {};
  }


  // ==========================================
  // SCROLL
  // ==========================================

  private scrollToNews(): void {

    // window.scrollTo({
    //   top: 0,
    //   behavior: 'smooth'
    // });
  }


  // ==========================================
  // PROMOTION
  // ==========================================

  openPromotion(): void {

    alert(
      'Sponsored earning not active at the moment'
    );
  }
}
