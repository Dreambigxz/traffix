// engagement.service.ts

import {
  DOCUMENT,
  isPlatformBrowser,
} from '@angular/common';

import {
  HttpClient,
} from '@angular/common/http';

import {
  Inject,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';

import {
  Subscription,
  interval,
} from 'rxjs';


interface ArticleBlock {
  index: number;
  element: HTMLElement;
  words: number;

  estimatedMilliseconds: number;
  requiredMilliseconds: number;
  cappedMilliseconds: number;
  dwellMilliseconds: number;

  visible: boolean;
}


interface EngagementInteractions {
  select: number;
  copy: number;
  click: number;
  key: number;
}


export interface StartArticleOptions {
  articleId: number;
  articleElement: HTMLElement;
  slug?: string | null;
}


interface EngagementResponse {
  id: string;
  article_id: number;
  active_seconds: number;
  progress: number;
  completed: boolean;
}


type UpdateReason =
  | 'heartbeat'
  | 'hidden'
  | 'route_change'
  | 'completed';


interface EngagementPayload {
  engagement_id: string;
  session_id: string;
  article_id: number;
  slug: string | null;

  reason: UpdateReason;

  active_seconds: number;
  progress: number;
  completed: boolean;

  content: {
    total_words: number;
    blocks: number;
    estimated_read_seconds: number;
  };

  timing: {
    wall_seconds: number;
    reached_bottom_at_seconds: number | null;
  };

  scroll: {
    max_depth: number;
    distance_px: number;
    events: number;
    average_speed_px_per_second: number;
  };

  reading: {
    read_words: number;
    seen_words: number;
    read_blocks: number;
    read_ratio: number;
  };

  interactions: EngagementInteractions;

  metadata: {
    pathname: string;
    referrer: string | null;

    screen: {
      width: number;
      height: number;
      device_pixel_ratio: number;
    };
  };
}


@Injectable({
  providedIn: 'root',
})
export class EngagementService implements OnDestroy {

  private readonly config = {
    blockSelector:
      'p, li, h2, h3, h4, blockquote, figcaption, .reading-block',

    openEndpoint: '/api/engagement/open/',

    wordsPerMinute: 230,

    tickMilliseconds: 500,
    heartbeatMilliseconds: 15_000,
    idleMilliseconds: 60_000,

    visibleRatio: 0.5,
    minimumBlockMilliseconds: 800,
    dwellFactor: 0.45,
    dwellCapFactor: 4,

    minimumCompletionProgress: 80,
    minimumCompletionDepth: 0.90,
    minimumReadingSeconds: 90,
  };


  private readonly isBrowser: boolean;

  private sessionId = '';

  private engagementId: string | null = null;
  private articleId: number | null = null;
  private articleSlug: string | null = null;
  private articleElement: HTMLElement | null = null;

  private blocks: ArticleBlock[] = [];

  private totalWords = 0;
  private estimatedReadingMilliseconds = 0;

  private startedAt = 0;
  private lastInputAt = 0;
  private activeMilliseconds = 0;

  private maximumDepth = 0;
  private scrollDistance = 0;
  private scrollEvents = 0;
  private lastScrollY = 0;

  private reachedBottomAtMilliseconds: number | null = null;

  private interactions: EngagementInteractions = {
    select: 0,
    copy: 0,
    click: 0,
    key: 0,
  };

  private completed = false;
  private completionRequestSent = false;
  private trackerStarted = false;
  private openRequestSent = false;

  /*
   * This holds only the latest cumulative update.
   * Multiple scroll events will not create multiple queue records.
   */
  private pendingPayload: EngagementPayload | null = null;
  private requestInProgress = false;

  private intersectionObserver?: IntersectionObserver;
  private contentObserver?: MutationObserver;

  private tickSubscription?: Subscription;
  private heartbeatSubscription?: Subscription;

  private eventController?: AbortController;

  private animationFramePending = false;


  constructor(
    private readonly http: HttpClient,

    @Inject(DOCUMENT)
    private readonly document: Document,

    @Inject(PLATFORM_ID)
    platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }


  startArticle(options: StartArticleOptions): void {
    if (!this.isBrowser) {
      return;
    }

    if (!options.articleElement) {
      console.error(
        'Engagement tracker: articleElement is undefined.',
      );

      return;
    }

    if (!options.articleId) {
      console.error(
        'Engagement tracker: articleId is missing.',
      );

      return;
    }

    /*
     * Prevent starting the same article twice.
     */
    if (
      this.articleId === options.articleId &&
      this.trackerStarted
    ) {
      return;
    }

    /*
     * Stop and flush the previous article before starting another.
     */
    if (
      this.articleId &&
      this.articleId !== options.articleId
    ) {
      this.stopArticle(true);
    }

    this.resetState();

    this.articleId = options.articleId;
    this.articleSlug = options.slug ?? null;
    this.articleElement = options.articleElement;

    this.sessionId = window.crypto.randomUUID();

    this.startedAt = Date.now();
    this.lastInputAt = Date.now();
    this.lastScrollY = window.scrollY;

    /*
     * Angular may have created the article element before rendering
     * the [innerHTML] content, so wait for the content blocks.
     */
    this.waitForArticleContent();
  }


  private waitForArticleContent(): void {
    if (!this.articleElement) {
      return;
    }

    /*
     * First attempt: content may already be available.
     */
    if (this.buildArticleBlocks()) {
      this.openEngagement();
      return;
    }

    this.contentObserver?.disconnect();

    this.contentObserver = new MutationObserver(() => {
      if (!this.buildArticleBlocks()) {
        return;
      }

      this.contentObserver?.disconnect();
      this.contentObserver = undefined;

      this.openEngagement();
    });

    this.contentObserver.observe(
      this.articleElement,
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
    );
  }


  private buildArticleBlocks(): boolean {
      if (!this.articleElement) {
        return false;
      }

      const article = this.articleElement;

      let elements = Array.from(
        article.querySelectorAll<HTMLElement>(
          'p, li, h2, h3, h4, blockquote, figcaption, .reading-block',
        ),
      );

      /*
       * Some article APIs return content using only div elements.
       * Select leaf divs only to avoid counting nested text repeatedly.
       */
      if (!elements.length) {
        elements = Array.from(
          article.querySelectorAll<HTMLElement>('div'),
        ).filter((element) => {
          const text =
            element.textContent?.trim() ?? '';

          const hasNestedContentBlock =
            element.querySelector(
              'div, p, li, h2, h3, h4, blockquote',
            ) !== null;

          return (
            text.length > 0 &&
            !hasNestedContentBlock
          );
        });
      }

      /*
       * Final fallback: the article itself contains plain text with
       * no child paragraphs or div blocks.
       */
      if (!elements.length) {
        const articleText =
          article.textContent?.trim() ?? '';

        const wordCount = articleText
          .split(/\s+/)
          .filter(Boolean)
          .length;

        if (wordCount >= 3) {
          elements = [article];
        }
      }

      console.log({
        article,
        articleHTML: article.innerHTML,
        articleText: article.textContent,
        elementsFound: elements.length,
        elements,
      });

      if (!elements.length) {
        return false;
      }

      const newBlocks: ArticleBlock[] = [];
      let totalWords = 0;

      elements.forEach((element, index) => {
        const content =
          element.textContent?.trim() ?? '';

        const words = content
          .split(/\s+/)
          .filter(Boolean)
          .length;

        if (words < 3) {
          return;
        }

        const estimatedMilliseconds =
          (words / this.config.wordsPerMinute) *
          60_000;

        newBlocks.push({
          index,
          element,
          words,

          estimatedMilliseconds,

          requiredMilliseconds: Math.max(
            this.config.minimumBlockMilliseconds,
            estimatedMilliseconds *
              this.config.dwellFactor,
          ),

          cappedMilliseconds:
            estimatedMilliseconds *
            this.config.dwellCapFactor,

          dwellMilliseconds: 0,
          visible: false,
        });

        totalWords += words;
      });

      if (!newBlocks.length) {
        return false;
      }

      this.blocks = newBlocks;
      this.totalWords = totalWords;

      this.estimatedReadingMilliseconds =
        (
          this.totalWords /
          this.config.wordsPerMinute
        ) * 60_000;

      console.log({
        trackingBlocks: this.blocks.length,
        totalWords: this.totalWords,
        estimatedReadingMilliseconds:
          this.estimatedReadingMilliseconds,
      });

      return true;
    }

  private openEngagement(): void {
    if (
      !this.articleId ||
      this.openRequestSent
    ) {
      return;
    }

    this.openRequestSent = true;

    this.http.post<EngagementResponse>(
      this.config.openEndpoint,
      {
        article_id: this.articleId,
        session_id: this.sessionId,
        slug: this.articleSlug,

        total_words: this.totalWords,

        estimated_read_seconds: Math.round(
          this.estimatedReadingMilliseconds / 1000,
        ),
      },
    ).subscribe({
      next: (response) => {
        this.engagementId = response.id;
        this.completed = response.completed;

        /*
         * Do not restart tracking when the user already completed
         * this article today.
         */
        if (response.completed) {
          return;
        }

        /*
         * Continue from the values already stored on the server.
         */
        this.activeMilliseconds =
          response.active_seconds * 1000;

        this.trackerStarted = true;

        this.createIntersectionObserver();
        this.registerEventListeners();
        this.startTimers();
        this.measureDepth();
      },

      error: (error) => {
        this.openRequestSent = false;

        console.error(
          'Unable to create article engagement:',
          error,
        );
      },
    });
  }


  private createIntersectionObserver(): void {
    this.intersectionObserver?.disconnect();

    this.intersectionObserver =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const block = this.blocks.find(
              item => item.element === entry.target,
            );

            if (!block) {
              return;
            }

            block.visible =
              entry.isIntersecting &&
              entry.intersectionRatio >=
                this.config.visibleRatio;
          });
        },
        {
          threshold: [
            0,
            this.config.visibleRatio,
            1,
          ],
        },
      );

    this.blocks.forEach((block) => {
      this.intersectionObserver?.observe(
        block.element,
      );
    });
  }


  private startTimers(): void {
    this.stopTimers();

    this.tickSubscription = interval(
      this.config.tickMilliseconds,
    ).subscribe(() => {
      this.trackReadingTick();
    });

    this.heartbeatSubscription = interval(
      this.config.heartbeatMilliseconds,
    ).subscribe(() => {
      if (this.isEngaged()) {
        this.queueUpdate('heartbeat');
      }
    });
  }


  private trackReadingTick(): void {
    if (
      this.completed ||
      !this.isEngaged()
    ) {
      return;
    }

    this.activeMilliseconds +=
      this.config.tickMilliseconds;

    for (const block of this.blocks) {
      if (
        block.visible &&
        block.dwellMilliseconds <
          block.cappedMilliseconds
      ) {
        block.dwellMilliseconds +=
          this.config.tickMilliseconds;
      }
    }

    this.checkCompletion();
  }


  private isEngaged(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    return (
      this.document.visibilityState === 'visible' &&
      this.document.hasFocus() &&
      Date.now() - this.lastInputAt <
        this.config.idleMilliseconds
    );
  }


  private registerEventListeners(): void {
    this.eventController?.abort();

    this.eventController =
      new AbortController();

    const signal =
      this.eventController.signal;

    const passiveOptions: AddEventListenerOptions = {
      passive: true,
      signal,
    };

    window.addEventListener(
      'scroll',
      this.handleScroll,
      passiveOptions,
    );

    window.addEventListener(
      'resize',
      this.handleResize,
      passiveOptions,
    );

    const activityEvents: Array<
      keyof WindowEventMap
    > = [
      'mousemove',
      'touchstart',
      'touchmove',
      'pointerdown',
      'wheel',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        this.handleActivity,
        passiveOptions,
      );
    });

    this.document.addEventListener(
      'keydown',
      this.handleKeydown,
      { signal },
    );

    this.document.addEventListener(
      'copy',
      this.handleCopy,
      { signal },
    );

    this.document.addEventListener(
      'selectionchange',
      this.handleSelectionChange,
      { signal },
    );

    this.document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
      { signal },
    );

    this.articleElement?.addEventListener(
      'click',
      this.handleArticleClick,
      { signal },
    );
  }


  private readonly handleActivity = (): void => {
    this.touch();
  };


  private readonly handleResize = (): void => {
    this.measureDepth();
  };


  private readonly handleScroll = (): void => {
    if (this.completed) {
      return;
    }

    const currentScrollY = window.scrollY;

    this.scrollDistance += Math.abs(
      currentScrollY - this.lastScrollY,
    );

    this.lastScrollY = currentScrollY;
    this.scrollEvents++;

    this.touch();

    if (this.animationFramePending) {
      return;
    }

    this.animationFramePending = true;

    requestAnimationFrame(() => {
      this.animationFramePending = false;
      this.measureDepth();
    });
  };


  private readonly handleKeydown = (): void => {
    this.interactions.key++;
    this.touch();
  };


  private readonly handleArticleClick = (): void => {
    this.interactions.click++;
    this.touch();
  };


  private readonly handleCopy = (): void => {
    this.interactions.copy++;
    this.touch();
  };


  private readonly handleSelectionChange = (): void => {
    const selection =
      window.getSelection();

    if (
      selection &&
      selection.toString().trim().length > 10
    ) {
      this.interactions.select++;
      this.touch();
    }
  };


  private readonly handleVisibilityChange = (): void => {
    if (
      this.document.visibilityState === 'hidden' &&
      !this.completed
    ) {
      this.queueUpdate('hidden');
    }
  };


  private touch(): void {
    this.lastInputAt = Date.now();
  }


  private measureDepth(): void {
    if (!this.articleElement) {
      return;
    }

    const rectangle =
      this.articleElement.getBoundingClientRect();

    const articleTop =
      rectangle.top + window.scrollY;

    const articleHeight =
      rectangle.height;

    const visibleArticleHeight =
      window.scrollY +
      window.innerHeight -
      articleTop;

    let ratio =
      articleHeight > 0
        ? visibleArticleHeight / articleHeight
        : 0;

    ratio = Math.max(
      0,
      Math.min(1, ratio),
    );

    this.maximumDepth = Math.max(
      this.maximumDepth,
      ratio,
    );

    if (
      this.maximumDepth >= 0.95 &&
      this.reachedBottomAtMilliseconds === null
    ) {
      this.reachedBottomAtMilliseconds =
        Date.now() - this.startedAt;
    }
  }


  private getReadingStats(): {
    readWords: number;
    seenWords: number;
    readBlocks: number;
    readRatio: number;
  } {
    let readWords = 0;
    let seenWords = 0;
    let readBlocks = 0;

    for (const block of this.blocks) {
      const blockWasRead =
        block.dwellMilliseconds >=
        block.requiredMilliseconds;

      if (block.dwellMilliseconds > 0) {
        seenWords += block.words;
      }

      if (blockWasRead) {
        readWords += block.words;
        readBlocks++;
      }
    }

    return {
      readWords,
      seenWords,
      readBlocks,

      readRatio:
        this.totalWords > 0
          ? readWords / this.totalWords
          : 0,
    };
  }


  private checkCompletion(): void {
    if (
      this.completed ||
      this.completionRequestSent
    ) {
      return;
    }

    const reading =
      this.getReadingStats();

    const progress =
      Math.round(
        reading.readRatio * 100,
      );

    const activeSeconds =
      Math.floor(
        this.activeMilliseconds / 1000,
      );

    const canComplete =
      activeSeconds >=
        this.config.minimumReadingSeconds &&
      progress >=
        this.config.minimumCompletionProgress &&
      this.maximumDepth >=
        this.config.minimumCompletionDepth;

    if (!canComplete) {
      return;
    }

    this.completionRequestSent = true;

    this.queueUpdate(
      'completed',
      true,
    );
  }


  private createSnapshot(
    reason: UpdateReason,
    completed = false,
  ): EngagementPayload | null {
    if (
      !this.engagementId ||
      !this.articleId
    ) {
      return null;
    }

    const reading =
      this.getReadingStats();

    const activeSeconds =
      Math.floor(
        this.activeMilliseconds / 1000,
      );

    return {
      engagement_id: this.engagementId,
      session_id: this.sessionId,
      article_id: this.articleId,
      slug: this.articleSlug,

      reason,

      active_seconds: activeSeconds,

      progress: Math.round(
        reading.readRatio * 100,
      ),

      completed,

      content: {
        total_words: this.totalWords,
        blocks: this.blocks.length,

        estimated_read_seconds: Math.round(
          this.estimatedReadingMilliseconds /
            1000,
        ),
      },

      timing: {
        wall_seconds: Math.floor(
          (Date.now() - this.startedAt) /
            1000,
        ),

        reached_bottom_at_seconds:
          this.reachedBottomAtMilliseconds === null
            ? null
            : Math.floor(
                this.reachedBottomAtMilliseconds /
                  1000,
              ),
      },

      scroll: {
        max_depth: Number(
          this.maximumDepth.toFixed(3),
        ),

        distance_px: Math.round(
          this.scrollDistance,
        ),

        events: this.scrollEvents,

        average_speed_px_per_second:
          activeSeconds > 0
            ? Math.round(
                this.scrollDistance /
                  activeSeconds,
              )
            : 0,
      },

      reading: {
        read_words: reading.readWords,
        seen_words: reading.seenWords,
        read_blocks: reading.readBlocks,

        read_ratio: Number(
          reading.readRatio.toFixed(3),
        ),
      },

      interactions: {
        ...this.interactions,
      },

      metadata: {
        pathname: window.location.pathname,

        referrer:
          this.document.referrer || null,

        screen: {
          width: window.innerWidth,
          height: window.innerHeight,

          device_pixel_ratio:
            window.devicePixelRatio || 1,
        },
      },
    };
  }


  private queueUpdate(
    reason: UpdateReason,
    completed = false,
  ): void {
    const payload =
      this.createSnapshot(
        reason,
        completed,
      );

    if (!payload) {
      return;
    }

    /*
     * Replace the previous queued data with the latest cumulative data.
     * There will never be multiple queue entries for one engagement.
     */
    this.pendingPayload = payload;

    this.flushQueue();
  }


  private flushQueue(): void {
    if (
      !this.pendingPayload ||
      this.requestInProgress
    ) {
      return;
    }

    const payload =
      this.pendingPayload;

    this.pendingPayload = null;
    this.requestInProgress = true;

    this.http.patch<EngagementResponse>(
      `/api/engagement/${payload.engagement_id}/`,
      payload,
    ).subscribe({
      next: (response) => {
        this.requestInProgress = false;

        if (
          response.completed ||
          payload.completed
        ) {
          this.completed = true;
          this.stopReadingTracking();
        }

        /*
         * Another update may have entered the queue while this
         * request was running.
         */
        if (this.pendingPayload) {
          this.flushQueue();
        }
      },

      error: (error) => {
        this.requestInProgress = false;

        /*
         * Preserve the failed payload only when a newer cumulative
         * payload is not already waiting.
         */
        if (!this.pendingPayload) {
          this.pendingPayload = payload;
        }

        if (payload.completed) {
          this.completionRequestSent = false;
        }

        console.error(
          'Unable to update engagement:',
          error,
        );
      },
    });
  }


  recordComment(): void {
    this.recordInteraction('comment');
  }


  recordReaction(): void {
    this.recordInteraction('reaction');
  }


  recordShare(): void {
    this.recordInteraction('share');
  }


  private recordInteraction(
    action: 'comment' | 'reaction' | 'share',
  ): void {

    console.log("record", action);

    if (!this.engagementId) {
      console.warn(
        `Cannot record ${action}: engagement has not started.`,
      );

      return;
    }

    this.http.post<EngagementResponse>(
      `/api/engagement/${this.engagementId}/interaction/`,
      { action },
    ).subscribe({
      error: (error) => {
        console.error(
          `Unable to record ${action}:`,
          error,
        );
      },
    });
  }


  stopArticle(flush = true): void {
    if (
      flush &&
      this.engagementId &&
      !this.completed
    ) {
      this.queueUpdate('route_change');
    }

    this.contentObserver?.disconnect();
    this.contentObserver = undefined;

    this.stopReadingTracking();

    this.articleElement = null;
    this.blocks = [];

    this.trackerStarted = false;
  }


  private stopReadingTracking(): void {
    this.stopTimers();

    this.eventController?.abort();
    this.eventController = undefined;

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;

    this.animationFramePending = false;
  }


  private stopTimers(): void {
    this.tickSubscription?.unsubscribe();
    this.tickSubscription = undefined;

    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = undefined;
  }


  private resetState(): void {
    this.contentObserver?.disconnect();
    this.contentObserver = undefined;

    this.stopReadingTracking();

    this.engagementId = null;
    this.articleId = null;
    this.articleSlug = null;
    this.articleElement = null;

    this.blocks = [];

    this.totalWords = 0;
    this.estimatedReadingMilliseconds = 0;

    this.startedAt = 0;
    this.lastInputAt = 0;
    this.activeMilliseconds = 0;

    this.maximumDepth = 0;
    this.scrollDistance = 0;
    this.scrollEvents = 0;
    this.lastScrollY = 0;

    this.reachedBottomAtMilliseconds = null;

    this.interactions = {
      select: 0,
      copy: 0,
      click: 0,
      key: 0,
    };

    this.completed = false;
    this.completionRequestSent = false;
    this.trackerStarted = false;
    this.openRequestSent = false;

    this.pendingPayload = null;
    this.requestInProgress = false;
  }


  ngOnDestroy(): void {
    // this.stopArticle(true);
  }
}
