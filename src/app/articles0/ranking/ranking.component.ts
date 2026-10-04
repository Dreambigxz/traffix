// daily-ranking-button.component.ts

import {
  CommonModule,
  DOCUMENT,
  isPlatformBrowser,
} from '@angular/common';

import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';

import {
  QuickNavService,
} from '../../reuseables/services/quick-nav.service';


interface RankingRequirements {
  comments: number;
  likes: number;
}


interface RankingUser {
  user_id: number;
  user__username: string;

  comments: number;
  likes: number;

  engaged_articles: number;
  total_engagement: number;

  reward_eligible: boolean;
  reward_amount: string;

  rank: number;
}


interface RankingResponse {
  date: string;

  requirements: RankingRequirements;

  current_user?: RankingUser | null;

  results: RankingUser[];
}

@Component({
  selector: 'app-ranking',
  imports: [
    CommonModule
  ],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.scss'
})
export class RankingComponent {

  rewardList = "0.05"

  readonly qnav =
    inject(QuickNavService);

  readonly opened =
    signal(false);

  private readonly isBrowser: boolean;


  constructor(
    @Inject(DOCUMENT)
    private readonly document: Document,

    @Inject(PLATFORM_ID)
    platformId: object,
  ) {
    this.isBrowser =
      isPlatformBrowser(platformId);
  }


  /*
   * Ranking data is already loaded by your interceptor
   * and stored inside QuickNavService.
   */
  get ranking(): any | null {
    const rankingData =
      this.qnav.storeData?.store?.['ranking'];
    if (!rankingData) {
      return null;
    }

    // console.log({rankingData});


    return rankingData as any;
  }


  /*
   * Return only the authenticated user's ranking data.
   *
   * The API should provide current_user so we don't need
   * to guess which user belongs to the current session.
   */
  get currentUser(): any | null {
    const ranking = this.ranking;

    if (!ranking) {
      return null;
    }

    return ranking.result ?? null;
  }


  get requirements(): RankingRequirements {
    return (
      this.ranking?.requirements ?? {
        comments: 0,
        likes: 0,
      }
    );
  }


  get commentsProgress(): number {
    const user = this.currentUser;

    if (!user) {
      return 0;
    }

    return this.progress(
      user.comments,
      this.requirements.comments,
    );
  }


  get likesProgress(): number {
    const user = this.currentUser;

    if (!user) {
      return 0;
    }

    return this.progress(
      user.likes,
      this.requirements.likes,
    );
  }


  get overallProgress(): number {
    if (!this.currentUser) {
      return 0;
    }

    return Math.round(
      (
        this.commentsProgress +
        this.likesProgress
      ) / 2,
    );
  }


  get rewardReady(): boolean {
    const user = this.currentUser;

    if (!user) {
      return false;
    }

    return (
      user.comments >=
        this.requirements.comments

      && user.likes >=
        this.requirements.likes
    );
  }


  get remainingComments(): number {
    const user = this.currentUser;

    if (!user) {
      return this.requirements.comments;
    }

    return this.remaining(
      user.comments,
      this.requirements.comments,
    );
  }


  get remainingLikes(): number {
    const user = this.currentUser;

    if (!user) {
      return this.requirements.likes;
    }

    return this.remaining(
      user.likes,
      this.requirements.likes,
    );
  }


  open(): void {
    this.opened.set(true);

    if (!this.isBrowser) {
      return;
    }

    this.document.body.classList.add(
      'daily-ranking-open',
    );
  }


  close(): void {
    this.opened.set(false);

    if (!this.isBrowser) {
      return;
    }

    this.document.body.classList.remove(
      'daily-ranking-open',
    );
  }


  toggle(): void {
    if (this.opened()) {
      this.close();
      return;
    }

    this.open();
  }


  progress(
    current: number,
    required: number,
  ): number {
    if (required <= 0) {
      return 0;
    }

    return Math.min(
      Math.round(
        (current / required) * 100,
      ),
      100,
    );
  }


  remaining(
    current: number,
    required: number,
  ): number {
    return Math.max(
      required - current,
      0,
    );
  }


  @HostListener(
    'document:keydown.escape',
  )
  closeWithEscape(): void {
    if (this.opened()) {
      this.close();
    }
  }


}
