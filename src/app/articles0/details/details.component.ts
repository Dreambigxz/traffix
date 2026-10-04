import { CommonModule } from '@angular/common';
import {
  Component,
  inject ,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { filter, startWith } from 'rxjs/operators';
import {  Router, NavigationEnd, ActivatedRoute } from '@angular/router';

import { QuickNavService } from '../../reuseables/services/quick-nav.service'; // ✅ adjust path as needed
import { EngagementService } from
  '../services/engagement.service';

  // import { MobileMenuComponent } from "../../components/mobile-menu/mobile-menu.component";
  import { HeaderComponent } from "../../components/header/header.component";


@Component({
  selector: 'app-details',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
  ],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit {

  @ViewChild('articleBody')
  articleBody?: ElementRef<HTMLElement>;

  isSubmittingComment = false;

  article: any

  constructor(
    public quickNav: QuickNavService,
    private router: Router,
    private route: ActivatedRoute,
    private engagementService: EngagementService,

  ) {}

  fb = inject(FormBuilder)

  commentForm = this.fb.group({
    content: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(1000)
      ]
    ]
  });

  articleId: any


  ngOnInit()  {

    this.router.events
    .pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null)
    )
    .subscribe(() => {

      const id = this.route.snapshot.paramMap.get('id');

        const url = new URL(window.location.href);
        if (!url.pathname.includes("article")) return;

        if (this.articleId===Number(id)) return;

        this.articleId = Number(id);

        this.quickNav.reqServerData.get(`articles/${this.articleId}/`)
        .subscribe((res:any)=>{
          this.article = res.article;
          this.articleExpanded = false;
            setTimeout(() => {

              const element =
                this.articleBody?.nativeElement;
              if (!element) return;

              this.engagementService.startArticle({
                articleId: this.article.id,
                slug: this.article.slug,
                articleElement: element,
              });

            }, 500);
        })
    });

  }

  get commentContent(): string {
    return this.commentForm.controls.content.value ?? '';
  }

  toggleArticleLike(): void {
    this.article.liked_by_user =
      !this.article.liked_by_user;

    this.article.likes +=
      this.article.liked_by_user ? 1 : -1;

      this.quickNav.reqServerData.post(`articles/${this.articleId}/like/`,{ action:"like" })
      // this.quickNav.reqServerData.get(`articles/${this.articleId}/`)

      .subscribe((res:any)=>{
        if (res.article){
          this.article=res.article;
        }
        this.isSubmittingComment = false
        this.clickProgressButton();

      })

  }

  toggleCommentLike(comment: any): void {
    comment.liked_by_user =
      !comment.liked_by_user;

    comment.likes +=
      comment.liked_by_user ? 1 : -1;
  }

  submitComment(): void {
    if (
      this.commentForm.invalid ||
      this.article.user_has_commented ||
      this.isSubmittingComment
    ) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmittingComment = true;

    this.quickNav.reqServerData.post(`articles/${this.articleId}/comment/`,{ content: this.commentContent.trim() })
    .subscribe((res:any)=>{
      if (res.article){
        this.article=res.article;
        this.clickProgressButton();
      }

      this.isSubmittingComment = false

    })
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
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

  clickProgressButton(): void {
    const button = document.querySelector<HTMLButtonElement>(
      '.progress-side-button'
    );

    button?.click();
  }

    // areticles helper
    /**
   * Number of blocks displayed before
   * the user clicks "Read full story".
   */
  readonly initialBlockLimit = 8;

  articleExpanded = false;

  get contentBlocks(): any[] {

    return this.article?.content_blocks ?? [];
  }


  get visibleContentBlocks(): any[] {

    if (this.articleExpanded) {
      return this.contentBlocks;
    }

    return this.contentBlocks.slice(
      0,
      this.initialBlockLimit
    );
  }


  get hasMoreContent(): boolean {

    return (
      this.contentBlocks.length >
      this.initialBlockLimit
    );
  }


  toggleReadMore(): void {

    this.articleExpanded =
      !this.articleExpanded;

    /**
     * EngagementService needs to know
     * about newly rendered blocks.
     *
     * If your service's observer already
     * watches DOM changes, this isn't needed.
     */
    if (this.articleExpanded) {

      setTimeout(() => {

        const element =
          this.articleBody?.nativeElement;

        if (!element) {
          return;
        }

        // Newly rendered content now exists.
        // Your engagement observer can see it.

      });
    }
  }


  cleanCaption(
    caption: string
  ): string {

    if (!caption) {
      return '';
    }

    return caption
      .replace(
        /^Image caption,\s*/i,
        ''
      )
      .trim();
  }


}
