import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuickNavService } from '../../reuseables/services/quick-nav.service';
import { HeaderComponent } from '../../components/header/header.component';

interface EngagementEarning {
  id: number;
  date: string;
  comments: number;
  likes: number;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  credited_at: string | null;
  created_at: string;
}

interface EarningSummary {
  total_records: number;
  total_earned: string;
  total_pending: string;
  total_comments: number;
  total_likes: number;
  successful_days: number;
  pending_days: number;
  failed_days: number;
}

interface EarningPagination {
  current_page: number;
  page_size: number;
  total: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  has_next: boolean;
  has_previous: boolean;
}

interface EarningResponse {
  earnings: EngagementEarning[];
  summary: EarningSummary;
  pagination: EarningPagination;
}

type EarningStatus = 'all' | 'success' | 'pending' | 'failed';

@Component({
  selector: 'app-engagement-history',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent
  ],
  templateUrl: './engagement-history.component.html',
  styleUrl: './engagement-history.component.scss'
})
export class EngagementHistoryComponent implements OnInit {

  private readonly storeKey = 'engagement_earning';

  earnings: EngagementEarning[] = [];

  summary: EarningSummary = {
    total_records: 0,
    total_earned: '0.00',
    total_pending: '0.00',
    total_comments: 0,
    total_likes: 0,
    successful_days: 0,
    pending_days: 0,
    failed_days: 0
  };

  pagination: EarningPagination | null = null;

  activeStatus: EarningStatus = 'all';

  loading = false;
  initialized = false;

  loadingDirection: 'next' | 'previous' | null = null;

  /*
   * Cache structure:
   *
   * {
   *   all: {
   *     1: { earnings, summary, pagination },
   *     2: { earnings, summary, pagination }
   *   },
   *   success: {
   *     1: { earnings, summary, pagination }
   *   }
   * }
   */
  pageCache: Record<
    EarningStatus,
    Record<number, EarningResponse>
  > = {
    all: {},
    success: {},
    pending: {},
    failed: {}
  };

  constructor(
    public quickNav: QuickNavService
  ) {}

  ngOnInit(): void {
    const stored = this.quickNav.storeData.get(
      this.storeKey
    );

    if (stored?.pageCache) {
      this.restoreCache(stored);
      return;
    }

    // Supports an initial API response already
    // saved under engagement_earning.
    if (stored?.earnings && stored?.pagination) {
      this.cacheResponse(
        'all',
        stored.pagination.current_page || 1,
        stored
      );

      this.displayPage(
        'all',
        stored.pagination.current_page || 1
      );

      return;
    }

    this.loadEarnings(1);
  }

  // =========================================
  // RESTORE CACHE
  // =========================================

  private restoreCache(stored: any): void {
    this.pageCache = {
      all: stored.pageCache?.all ?? {},
      success: stored.pageCache?.success ?? {},
      pending: stored.pageCache?.pending ?? {},
      failed: stored.pageCache?.failed ?? {}
    };

    this.activeStatus = stored.activeStatus ?? 'all';

    const currentPage = Number(
      stored.currentPage ?? 1
    );

    if (
      this.pageCache[this.activeStatus]?.[currentPage]
    ) {
      this.displayPage(
        this.activeStatus,
        currentPage
      );
    } else {
      this.loadEarnings(1);
    }
  }

  // =========================================
  // LOAD EARNINGS
  // =========================================

  loadEarnings(page: number = 1): void {
    if (this.loading) return;

    const cached = this.pageCache[
      this.activeStatus
    ]?.[page];

    if (cached) {
      this.displayPage(this.activeStatus, page);
      return;
    }

    this.loading = true;

    const requestedStatus = this.activeStatus;

    const endpoint =
      `engagement/earnings/?page=${page}` +
      `&status=${requestedStatus}`;

    this.quickNav.reqServerData.get(endpoint)
      .subscribe({
        next: (res: any) => {
          const data: EarningResponse =
            res?.engagement_earning ??
            res?.main?.engagement_earning ??
            res;

          if (
            !data ||
            !Array.isArray(data.earnings) ||
            !data.pagination
          ) {
            console.error(
              'Invalid earning response:',
              res
            );

            this.loading = false;
            this.loadingDirection = null;
            this.initialized = true;
            return;
          }

          this.cacheResponse(
            requestedStatus,
            page,
            data
          );

          this.displayPage(
            requestedStatus,
            page
          );

          this.loading = false;
          this.loadingDirection = null;
          this.initialized = true;
        },

        error: (error: any) => {
          console.error(
            'Failed to load earning history:',
            error
          );

          this.loading = false;
          this.loadingDirection = null;
          this.initialized = true;
        }
      });
  }

  // =========================================
  // CACHE API RESPONSE
  // =========================================

  private cacheResponse(
    status: EarningStatus,
    page: number,
    data: EarningResponse
  ): void {
    this.pageCache[status][page] = {
      earnings: [...data.earnings],
      summary: { ...data.summary },
      pagination: { ...data.pagination }
    };

    this.saveCache(status, page);
  }

  // =========================================
  // DISPLAY CACHED PAGE
  // =========================================

  private displayPage(
    status: EarningStatus,
    page: number
  ): void {
    const cached = this.pageCache[status]?.[page];

    if (!cached) return;

    this.activeStatus = status;

    this.earnings = [...cached.earnings];

    this.summary = { ...cached.summary };

    this.pagination = {
      ...cached.pagination,
      current_page: page
    };

    this.initialized = true;

    this.saveCache(status, page);
  }

  // =========================================
  // NEXT / PREVIOUS
  // =========================================

  loadPage(
    direction: 'next' | 'previous'
  ): void {
    if (!this.pagination || this.loading) {
      return;
    }

    const currentPage = Number(
      this.pagination.current_page
    );

    const targetPage =
      direction === 'next'
        ? currentPage + 1
        : currentPage - 1;

    if (
      targetPage < 1 ||
      targetPage > this.pagination.total_pages
    ) {
      return;
    }

    this.loadingDirection = direction;

    if (
      this.pageCache[this.activeStatus][targetPage]
    ) {
      this.displayPage(
        this.activeStatus,
        targetPage
      );

      this.loadingDirection = null;
      return;
    }

    this.loadEarnings(targetPage);
  }

  // =========================================
  // STATUS FILTER
  // =========================================

  selectStatus(status: EarningStatus): void {
    if (
      this.activeStatus === status ||
      this.loading
    ) {
      return;
    }

    this.activeStatus = status;

    this.earnings = [];
    this.pagination = null;

    if (this.pageCache[status][1]) {
      this.displayPage(status, 1);
    } else {
      this.loadEarnings(1);
    }
  }

  // =========================================
  // PERSIST CACHE
  // =========================================

  private saveCache(
    status: EarningStatus,
    page: number
  ): void {
    this.quickNav.storeData.set(
      this.storeKey,
      {
        pageCache: this.pageCache,
        activeStatus: status,
        currentPage: page
      }
    );
  }

  // =========================================
  // REFRESH
  // =========================================

  refreshEarnings(): void {
    if (this.loading) return;

    this.pageCache = {
      all: {},
      success: {},
      pending: {},
      failed: {}
    };

    this.earnings = [];
    this.pagination = null;
    this.activeStatus = 'all';
    this.initialized = false;

    this.quickNav.storeData.set(
      this.storeKey,
      null
    );

    this.loadEarnings(1);
  }

  // =========================================
  // HELPERS
  // =========================================

  getStatusLabel(status: string): string {
    switch (status) {
      case 'success':
        return 'Paid';

      case 'pending':
        return 'Pending';

      case 'failed':
        return 'Failed';

      default:
        return status;
    }
  }
}
