import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  QuickNavService
} from '../../reuseables/services/quick-nav.service';

import {
  HeaderComponent
} from '../../components/header/header.component';

@Component({
  selector: 'app-pending',

  imports: [
    CommonModule,
    HeaderComponent
  ],

  templateUrl: './pending.component.html',

  styleUrl: './pending.component.scss'
})
export class PendingComponent implements OnInit {

  pending: any[] = [];

  summary: any = {
    total_pending: 0,
    generation_1: 0,
    generation_2: 0,
    generation_3: 0
  };

  pagination: any | null = null;

  loading = false;

  loadingDirection:
    'next' | 'previous' | null = null;

  // Store downloaded pages
  pageCache: Record<
    number,
    any[]
  > = {};


  constructor(
    public quickNav: QuickNavService
  ) {}


  // ==========================================
  // INITIALIZATION
  // ==========================================

  ngOnInit(): void {

    const stored =
      this.quickNav.storeData.get(
        'pendingRef'
      );

    if (
      stored?.pageCache?.[1] &&
      stored?.pagination
    ) {

      this.restoreCache(stored);

      return;
    }

    this.loadPending(1);
  }


  // ==========================================
  // RESTORE CACHED DATA
  // ==========================================

  private restoreCache(
    stored: any
  ): void {

    this.pageCache =
      stored.pageCache ?? {};

    this.summary =
      stored.summary ?? this.summary;

    this.pagination =
      stored.pagination ?? null;

    const currentPage =
      Number(
        this.pagination?.current_page ?? 1
      );

    if (
      this.pageCache[currentPage]
    ) {

      this.pending = [
        ...this.pageCache[currentPage]
      ];

    } else if (
      this.pageCache[1]
    ) {

      this.pending = [
        ...this.pageCache[1]
      ];

      this.updatePaginationLocally(1);
    }
  }


  // ==========================================
  // FETCH PENDING REFERRALS
  // ==========================================

  loadPending(
    page: number = 1
  ): void {

    if (this.loading) {
      return;
    }

    // Already downloaded
    if (
      this.pageCache[page]
    ) {

      this.showCachedPage(page);

      return;
    }

    this.loading = true;

    this.quickNav.reqServerData.get(
      `referrals/pending/?page=${page}`
    ).subscribe({

      next: (res: any) => {

        // Supports both response formats:
        // res.pendingRef
        // res

        const data =
          res?.pendingRef ??
          res?.main?.pendingRef ??
          res;

        const incoming:
          any[] =
            data?.referrals ?? [];

        // Save the downloaded page
        this.pageCache[page] = [
          ...incoming
        ];

        // Replace visible table data
        this.pending = [
          ...incoming
        ];

        // Update summary
        this.summary =
          data?.summary ?? this.summary;

        // Update pagination
        this.pagination =
          data?.pagination ??
          this.pagination;

        // Persist all cached pages
        this.saveCache();

        this.loading = false;

        this.loadingDirection = null;
      },

      error: (error) => {

        console.error(
          'Failed to load pending referrals:',
          error
        );

        this.loading = false;

        this.loadingDirection = null;
      }
    });
  }


  // ==========================================
  // PAGE NAVIGATION
  // ==========================================

  loadPage(
    direction: 'next' | 'previous'
  ): void {

    if (
      !this.pagination ||
      this.loading
    ) {
      return;
    }

    const currentPage =
      Number(
        this.pagination.current_page
      );

    const targetPage =
      direction === 'next'
        ? currentPage + 1
        : currentPage - 1;

    if (
      targetPage < 1 ||
      targetPage >
        Number(
          this.pagination.total_pages
        )
    ) {
      return;
    }

    this.loadingDirection = direction;

    // No server request for cached pages
    if (
      this.pageCache[targetPage]
    ) {

      this.showCachedPage(
        targetPage
      );

      this.loadingDirection = null;

      return;
    }

    // Fetch only new pages
    this.loadPending(targetPage);
  }


  // ==========================================
  // SHOW CACHED PAGE
  // ==========================================

  private showCachedPage(
    page: number
  ): void {

    const cached =
      this.pageCache[page];

    if (!cached) {
      return;
    }

    // Replace current page data
    this.pending = [
      ...cached
    ];

    this.updatePaginationLocally(
      page
    );

    this.saveCache();
  }


  // ==========================================
  // UPDATE PAGINATION LOCALLY
  // ==========================================

  private updatePaginationLocally(
    page: number
  ): void {

    if (!this.pagination) {
      return;
    }

    const totalPages =
      Number(
        this.pagination.total_pages
      );

    this.pagination = {
      ...this.pagination,

      current_page: page,

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
  // SAVE CACHE TO QUICKNAV
  // ==========================================

  private saveCache(): void {

    this.quickNav.storeData.set(
      'pendingRef',
      {
        pageCache: this.pageCache,
        summary: this.summary,
        pagination: this.pagination
      }
    );
  }


  // ==========================================
  // OPTIONAL REFRESH
  // ==========================================

  refreshPending(): void {

    this.pageCache = {};

    this.pending = [];

    this.pagination = null;

    this.summary = {
      total_pending: 0,
      generation_1: 0,
      generation_2: 0,
      generation_3: 0
    };

    this.quickNav.storeData.set(
      'pendingRef',
      null
    );

    this.loadPending(1);
  }
}
