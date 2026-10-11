import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LoaderService } from './loader.service';
import { Observable, of} from 'rxjs';

// <div class="spinner"></div>
// <div *ngIf="isLoading | async" class="spinner-overlay"> <div class="spinner"></div> </div>
@Component({
  selector: 'app-spinner',
  imports: [ CommonModule],

  template: `


      <div
      *ngIf="loaderService.loading$ | async"
      class="spinner-overlay"
      [class.get-loading]="(loaderService.requestMethod$ | async) === 'GET'"
      [class.post-loading]="(loaderService.requestMethod$ | async) === 'POST'"
      role="status"
      aria-live="polite"
      aria-label="Loading"
      >

      <div class="traffix-loader">

        <!-- ANIMATED LOGO -->
        <div class="loader-logo-wrap">

          <div class="loader-glow"></div>

          <div class="loader-logo">
            <span class="logo-dark">Traffi</span>
            <span class="logo-red">X</span>
          </div>

        </div>


        <!-- REQUEST STATUS -->
        <div class="loader-content">

          <span class="loader-title">
            {{
              (loaderService.requestMethod$ | async) === 'POST'
                ? 'Processing request...'
                : 'Just a moment...'
            }}
          </span>

          <!-- ANIMATED DOTS -->
          <div class="loader-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

        </div>


        <!-- ANIMATED PROGRESS LINE -->
        <div class="loader-progress" aria-hidden="true">
          <span></span>
        </div>

      </div>

      </div>


`,
  // styleUrl: "../css/spinner.css"
})
export class SpinnerComponent {
    isLoading: Observable<boolean>;
   constructor(public loaderService: LoaderService) {
     this.isLoading = this.loaderService.loading$; // ✅ safe
   }

}
