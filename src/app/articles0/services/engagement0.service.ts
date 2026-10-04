import {
  DOCUMENT,
  isPlatformBrowser
} from '@angular/common';

import {
  Inject,
  Injectable,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';

import {
  finalize,
  interval,
  Subscription
} from 'rxjs';

import {
  QuickNavService
} from '../../reuseables/services/quick-nav.service';


export type EngagementEventType =
  | 'heartbeat'
  | 'article_open'
  | 'article_progress'
  | 'reaction'
  | 'share';


export interface EngagementEvent {
  event_id: string;
  session_id: string;
  article_id: number | null;
  event_type: EngagementEventType;
  active_seconds: number;
  progress: number;
  metadata: Record<string, unknown>;
  client_occurred_at: string;
}


@Injectable({
  providedIn: 'root'
})
export class EngagementService implements OnDestroy {
  private readonly heartbeatSeconds = 15;
  private readonly idleLimitMilliseconds = 30_000;

  private sessionId = '';

  private currentArticleId: number | null = null;
  private lastInteractionAt = Date.now();

  private queuedEvents: EngagementEvent[] = [];
  private recordedMilestones = new Set<number>();

  private heartbeatSubscription?: Subscription;
  private isFlushing = false;
  private listenersRegistered = false;

  private readonly interactionHandler = (): void => {
    this.lastInteractionAt = Date.now();
  };

  private readonly visibilityHandler = (): void => {

    const pageType = this.document

    console.log({pageType});

    if (this.document.hidden) {
      this.flush();
    } else {
      this.lastInteractionAt = Date.now();
    }
  };

  constructor(
    private quickNav: QuickNavService,

    @Inject(DOCUMENT)
    private document: Document,

    @Inject(PLATFORM_ID)
    private platformId: object
  ) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.sessionId = this.getSessionId();

    this.registerListeners();
    this.startHeartbeat();
  }

  startArticle(articleId: number): void {
    if (!articleId) {
      return;
    }

    // Prevent creating another open event for the same article.
    if (this.currentArticleId === articleId) {
      return;
    }

    // Send remaining activity for the previous article.
    if (this.currentArticleId !== null) {
      this.flush();
    }

    this.currentArticleId = articleId;
    this.lastInteractionAt = Date.now();
    this.recordedMilestones.clear();

    this.queueEvent({
      event_type: 'article_open',
      article_id: articleId
    });

    // Send article_open immediately.
    this.flush();
  }

  stopArticle(): void {
    if (this.currentArticleId === null) {
      return;
    }

    this.flush();

    this.currentArticleId = null;
    this.recordedMilestones.clear();

    console.log("stopEdArticle");

  }

  recordProgress(progress: number): void {
    if (this.currentArticleId === null) {
      return;
    }

    const normalizedProgress = Math.min(
      Math.max(Math.round(progress), 0),
      100
    );

    const milestones = [
      25,
      50,
      75,
      90,
      100
    ];

    milestones.forEach(milestone => {
      const hasReachedMilestone =
        normalizedProgress >= milestone;

      const wasAlreadyRecorded =
        this.recordedMilestones.has(milestone);

      if (
        hasReachedMilestone &&
        !wasAlreadyRecorded
      ) {
        this.recordedMilestones.add(milestone);

        this.queueEvent({
          event_type: 'article_progress',
          article_id: this.currentArticleId,
          progress: milestone
        });
      }
    });
  }

  recordReaction(
    articleId: number,
    reaction: string,
    action: 'add' | 'remove' = 'add'
  ): void {
    this.queueEvent({
      event_type: 'reaction',
      article_id: articleId,
      metadata: {
        reaction,
        action
      }
    });

    this.flush();
  }

  recordShare(
    articleId: number,
    platform: string
  ): void {
    this.queueEvent({
      event_type: 'share',
      article_id: articleId,
      metadata: {
        platform
      }
    });

    this.flush();
  }

  flush(): void {
    if (
      !this.queuedEvents.length ||
      this.isFlushing
    ) {
      return;
    }

    const events = [
      ...this.queuedEvents
    ];

    this.queuedEvents = [];
    this.isFlushing = true;

    this.quickNav.reqServerData
      .post(
        'events/',
        { events }
      )
      .pipe(
        finalize(() => {
          this.isFlushing = false;

          // Send events created while the previous
          // request was running.
          if (this.queuedEvents.length >= 10) {
            this.flush();
          }
        })
      )
      .subscribe({
        next: response => {
          const url = window.location.pathname
          console.log({url});

          if (!url.includes("article")) {
            this.ngOnDestroy()
          }

          console.log(
            'Engagement recorded:',
            response
          );
        },

        error: error => {
          console.error(
            'Engagement request failed:',
            error
          );

          // Put failed events at the beginning
          // so they are retried later.
          this.queuedEvents.unshift(...events);
        }
      });
  }

  private startHeartbeat(): void {
    if (this.heartbeatSubscription) {
      return;
    }

    this.heartbeatSubscription = interval(
      this.heartbeatSeconds * 1000
    ).subscribe(() => {
      if (this.isActivelyReading()) {
        this.queueEvent({
          event_type: 'heartbeat',
          article_id: this.currentArticleId,
          active_seconds: this.heartbeatSeconds
        });
      }

      this.flush();
    });
  }

  private isActivelyReading(): boolean {
    const recentlyActive =
      Date.now() - this.lastInteractionAt <=
      this.idleLimitMilliseconds;

    return (
      this.currentArticleId !== null &&
      recentlyActive &&
      !this.document.hidden &&
      this.document.hasFocus()
    );
  }

  private queueEvent(
    event: Partial<EngagementEvent> & {
      event_type: EngagementEventType;
    }
  ): void {
    if (!this.sessionId) {
      return;
    }

    this.queuedEvents.push({
      event_id: this.generateId(),
      session_id: this.sessionId,
      article_id: event.article_id ?? null,
      event_type: event.event_type,
      active_seconds: event.active_seconds ?? 0,
      progress: event.progress ?? 0,
      metadata: event.metadata ?? {},
      client_occurred_at:
        new Date().toISOString()
    });

    if (this.queuedEvents.length >= 10) {
      this.flush();
    }
  }

  private registerListeners(): void {
    if (this.listenersRegistered) {
      return;
    }

    const activityEvents = [
      'click',
      'scroll',
      'keydown',
      'touchstart',
      'pointerdown'
    ];

    activityEvents.forEach(eventName => {
      this.document.addEventListener(
        eventName,
        this.interactionHandler,
        {
          passive: true
        }
      );
    });

    this.document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
    );

    this.listenersRegistered = true;
  }

  private removeListeners(): void {
    if (!this.listenersRegistered) {
      return;
    }

    const activityEvents = [
      'click',
      'scroll',
      'keydown',
      'touchstart',
      'pointerdown'
    ];

    activityEvents.forEach(eventName => {
      this.document.removeEventListener(
        eventName,
        this.interactionHandler
      );
    });

    this.document.removeEventListener(
      'visibilitychange',
      this.visibilityHandler
    );

    this.listenersRegistered = false;
  }

  private getSessionId(): string {
    const storageKey =
      'news_engagement_session_id';

    const existingId = sessionStorage.getItem(
      storageKey
    );

    if (existingId) {
      return existingId;
    }

    const newId = this.generateId();

    sessionStorage.setItem(
      storageKey,
      newId
    );

    return newId;
  }

  private generateId(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  }

  ngOnDestroy(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.removeListeners();
    this.flush();

    console.log("EngagementStopped");

  }
}
