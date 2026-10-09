
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  signal
} from '@angular/core';

import { WalletService } from '../service';
import { HeaderComponent } from '../../components/header/header.component';
import { SpinnerComponent } from '../../reuseables/http-loader/spinner.component';
import { CurrencyConverterPipe } from '../../reuseables/pipes/currency-converter.pipe';
import { QuickNavService } from '../../reuseables/services/quick-nav.service';
import { TimeFormatPipe } from '../../reuseables/pipes/time-format.pipe';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SpinnerComponent,
    CurrencyConverterPipe,
    TimeFormatPipe
  ],
  templateUrl: './transactions.component.html',
  styleUrls: [
    './transactions.component.css',
    '../wallet.component.css'
  ]
})
export class TransactionsComponent {

  constructor(
    public walletService: WalletService,
    public quickNav: QuickNavService
  ) {}

  // ============================================
  // STATE
  // ============================================

  readonly loading = signal(false);

  readonly transactions = signal<any[]>([]);

  readonly selectedType = signal<string>('all');

  readonly selectedAsset = signal<string>('all');

  readonly selectedTransaction = signal<any | null>(null);

  readonly pagination = signal<any>(null);

  readonly summary = signal<any>({
    total_transactions: 0,
    total_deposit: '0.00',
    total_withdrawal: '0.00',
    pending_count: 0,
    success_count: 0,
    declined_count: 0
  });

  readonly loadingDirection =
    signal<'next' | 'previous' | null>(null);

  readonly initialized = signal(false);

  // ============================================
  // CACHE
  // ============================================

  private readonly cacheKey = 'transaction_history_cache';

  private pageCache: Record<string, any> = {};

  // ============================================
  // COMPUTED
  // ============================================

  readonly filteredTransactions = computed(() => {

    return this.transactions().filter((transaction: any) => {

      const assetMatches =
        this.selectedAsset() === 'all' ||
        transaction.method === this.selectedAsset();

      return assetMatches;

    });

  });

  readonly totalDeposited = computed(() => {
    return Number(
      this.summary()?.total_deposit || 0
    );
  });

  readonly totalWithdrawn = computed(() => {
    return Number(
      this.summary()?.total_withdrawal || 0
    );
  });

  readonly totalActivity = computed(() => {
    return (
      this.totalDeposited() +
      this.totalWithdrawn()
    );
  });

  // ============================================
  // INITIALIZATION
  // ============================================

  ngOnInit(): void {

    const stored = this.quickNav.storeData.get(
      this.cacheKey
    );

    if (stored?.pages) {

      this.pageCache = stored.pages;

      this.selectedType.set(
        stored.selectedType || 'all'
      );

      this.selectedAsset.set(
        stored.selectedAsset || 'all'
      );

      this.loadTransactions(
        Number(stored.currentPage || 1)
      );

      return;
    }

    this.loadTransactions(1);
  }

  // ============================================
  // GENERATE CACHE KEY
  // ============================================

  private getPageKey(
    page: number,
    type: string = this.selectedType()
  ): string {

    return `${type}:${page}`;

  }

  // ============================================
  // LOAD TRANSACTIONS
  // ============================================

  loadTransactions(page: number = 1): void {

    if (this.loading()) {
      return;
    }

    const requestedType = this.selectedType();

    const key = this.getPageKey(
      page,
      requestedType
    );

    // ------------------------------------------
    // CHECK CACHE FIRST
    // ------------------------------------------

    const cached = this.pageCache[key];

    if (cached) {

      this.displayPage(cached);

      this.loadingDirection.set(null);

      return;
    }

    // ------------------------------------------
    // FETCH FROM SERVER
    // ------------------------------------------

    this.loading.set(true);

    const endpoint =
      `transactions/history/?page=${page}` +
      `&type=${encodeURIComponent(requestedType)}` +
      `&hideSpinnerimportant`;

    this.quickNav.reqServerData
      .get(endpoint)
      .subscribe({

        next: (response: any) => {

          const data =
            response?.transaction_history ??
            response?.main?.transaction_history ??
            response;

          if (
            !data ||
            !Array.isArray(data.transactions) ||
            !data.pagination
          ) {

            console.error(
              'Invalid transaction response:',
              response
            );

            this.loading.set(false);
            this.loadingDirection.set(null);
            this.initialized.set(true);

            return;
          }

          // ----------------------------------
          // CACHE RESPONSE
          // ----------------------------------

          this.pageCache[key] = {

            transactions: [
              ...data.transactions
            ],

            summary: {
              ...(data.summary || {})
            },

            pagination: {
              ...data.pagination
            }

          };

          // ----------------------------------
          // DISPLAY PAGE
          // ----------------------------------

          this.displayPage(
            this.pageCache[key]
          );

          this.loading.set(false);

          this.loadingDirection.set(null);

          this.initialized.set(true);

        },

        error: (error: any) => {

          console.error(
            'Failed to load transactions:',
            error
          );

          this.loading.set(false);

          this.loadingDirection.set(null);

          this.initialized.set(true);

        }

      });

  }

  // ============================================
  // DISPLAY CACHED OR FETCHED PAGE
  // ============================================

  private displayPage(data: any): void {

    this.transactions.set(
      [...(data.transactions || [])]
    );

    this.summary.set({
      ...this.summary(),
      ...(data.summary || {})
    });

    this.pagination.set({
      ...(data.pagination || {})
    });

    this.initialized.set(true);

    this.saveCache();

  }

  // ============================================
  // PAGINATION
  // ============================================

  loadPage(
    direction: 'next' | 'previous'
  ): void {

    const page = this.pagination();

    if (!page || this.loading()) {
      return;
    }

    if (
      direction === 'next' &&
      !page.has_next
    ) {
      return;
    }

    if (
      direction === 'previous' &&
      !page.has_previous
    ) {
      return;
    }

    const targetPage =
      direction === 'next'
        ? Number(page.current_page) + 1
        : Number(page.current_page) - 1;

    if (
      targetPage < 1 ||
      targetPage > Number(page.total_pages)
    ) {
      return;
    }

    this.loadingDirection.set(direction);

    this.loadTransactions(targetPage);

    // Cached pages finish immediately.
    if (!this.loading()) {
      this.loadingDirection.set(null);
    }

  }

  // ============================================
  // TRANSACTION TYPE FILTER
  // ============================================

  setTypeFilter(type: string): void {

    if (
      this.selectedType() === type ||
      this.loading()
    ) {
      return;
    }

    this.selectedType.set(type);

    this.selectedTransaction.set(null);

    this.transactions.set([]);

    this.pagination.set(null);

    // Each transaction type has its own cache.
    this.loadTransactions(1);

  }

  // ============================================
  // ASSET FILTER
  // ============================================

  setAssetFilter(asset: string): void {

    this.selectedAsset.set(asset);

    this.saveCache();

  }

  // ============================================
  // SAVE CACHE
  // ============================================

  private saveCache(): void {

    this.quickNav.storeData.set(
      this.cacheKey,
      {

        pages: this.pageCache,

        selectedType: this.selectedType(),

        selectedAsset: this.selectedAsset(),

        currentPage:
          this.pagination()?.current_page || 1

      }
    );

  }

  // ============================================
  // REFRESH TRANSACTIONS
  // ============================================

  refreshTransactions(): void {

    if (this.loading()) {
      return;
    }

    this.pageCache = {};

    this.transactions.set([]);

    this.pagination.set(null);

    this.selectedTransaction.set(null);

    this.initialized.set(false);

    this.quickNav.storeData.set(
      this.cacheKey,
      null
    );

    this.loadTransactions(1);

  }

  // ============================================
  // TRANSACTION DETAILS
  // ============================================

  openTransaction(transaction: any): void {

    this.selectedTransaction.set(
      transaction
    );

  }

  closeTransaction(): void {

    this.selectedTransaction.set(null);

  }

  // ============================================
  // TRANSACTION STATUS
  // ============================================

  isCompleted(transaction: any): boolean {

    return transaction.status === 'success';

  }

  displayStatus(transaction: any): string {

    switch (transaction.status) {

      case 'success':
        return 'Completed';

      case 'pending':
        return 'Pending';

      case 'awaiting':
        return 'Awaiting confirmation';

      case 'declined':
        return 'Declined';

      case 'failed':
        return 'Failed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return transaction.status || 'Pending';

    }

  }

  statusClass(transaction: any): string {

    if (this.isCompleted(transaction)) {
      return 'completed';
    }

    return transaction.status || 'pending';

  }

  // ============================================
  // ASSET ICON
  // ============================================

  assetIcon(asset: string): string {

    const icons: Record<string, string> = {
      USDT: '₮',
      USD: '₮',
      BNB: '◆',
      TRX: '◈',
      TRON: '◈'
    };

    return icons[asset] ?? '$';

  }

  // ============================================
  // ASSET COLOR
  // ============================================

  assetColor(asset: string): string {

    const colors: Record<string, string> = {
      USDT: '#16a085',
      USD: '#16a085',
      BNB: '#f3ba2f',
      TRX: '#e91e24',
      TRON: '#e91e24'
    };

    return (
      colors[asset] ??
      'var(--color-secondary)'
    );

  }

  // ============================================
  // SHORT TRANSACTION HASH
  // ============================================

  shortHash(value: string): string {

    if (!value) {
      return '';
    }

    if (value.length <= 16) {
      return value;
    }

    return (
      `${value.slice(0, 8)}...` +
      value.slice(-6)
    );

  }

}
