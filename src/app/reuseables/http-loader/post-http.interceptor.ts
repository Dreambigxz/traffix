import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';

import { inject } from '@angular/core';
import {
  catchError,
  finalize,
  tap,
  timeout,
  TimeoutError,
  throwError
} from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { LoaderService } from './loader.service';
import { StoreDataService } from './store-data.service';
import { QuickMessageService } from '../modals/quick-message/quick-message.service';
import { MessageService } from '../modals/message/message.service';
import { AuthService } from '../auth/auth.service';
import { ConfirmationDialogService } from '../modals/confirmation-dialog/confirmation-dialog.service';
import { SuccessStatusService } from '../success-check/service';

import { SponsoredAdsModalService } from "../../sponsored-ads/sponsored-ads.service";

export type MessageType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';


function isBrowser(): boolean {
  return typeof window !== 'undefined';
}


function isIOS(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return /iphone|ipad|ipod/i.test(
    window.navigator.userAgent
  );
}


function isSafariBrowser(): boolean {
  if (!isBrowser()) {
    return false;
  }

  const userAgent = window.navigator.userAgent;

  return (
    userAgent.includes('Safari') &&
    !userAgent.includes('Chrome') &&
    !userAgent.includes('CriOS') &&
    !userAgent.includes('Android') &&
    !userAgent.includes('Edg')
  );
}


function getClientTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || 'UTC'
    );
  } catch {
    return 'UTC';
  }
}


export const PostHttpInterceptor: HttpInterceptorFn = (
  req,
  next
) => {
  const loaderService = inject(LoaderService);
  const storeData = inject(StoreDataService);
  const dialog = inject(MatDialog);
  const toast = inject(QuickMessageService);
  const reqConfirmation = inject(ConfirmationDialogService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const modalMessageService = inject(MessageService);
  const noMessageToast = inject(SuccessStatusService);

  const adsService = inject(SponsoredAdsModalService)

  let clientTimezone = getClientTimezone();

   clientTimezone = "America/Sao_Paulo"

  // Ensure the current session/token is still valid.
  authService.checkLogin();

  /*
   * Add the user's browser timezone to every API request.
   *
   * Examples:
   * Africa/Lagos
   * America/New_York
   * America/Los_Angeles
   * Europe/London
   *America/Sao_Paulo
   */
  let headers = req.headers.set(
    'X-Client-Timezone',
    clientTimezone
  );

  // Attach authentication token when available.
  if (authService.isLoggedIn && authService.token) {
    headers = headers.set(
      'Authorization',
      `Token ${authService.token}`
    );
  }

  req = req.clone({ headers });

  const isPost = req.method === 'POST';
  const isGet = req.method === 'GET';
  const isSafari = isSafariBrowser();

  const hideSpinnerimportant = req.url.includes('hideSpinnerimportant') || req.url.includes('hideSpinner')
  // Toggle loader.
  if (
    (!req.url.includes('hideSpinner') && isGet) ||
    isIOS() ||
    req.url.includes('upload/') ||
    isSafari
  ) {
    if (
      !req.url.includes('hideSpinnerimportant') &&
      !req.url.includes('coingecko')
    ) {
      loaderService.show();
    }
  }

  if (isPost) {
    if (isBrowser()) {
      const activeButton =
        document.activeElement as HTMLElement | null;

      loaderService.setLoadingButton(activeButton);
    }
    if (!loaderService._loading.value&&!req.url.includes("hideSpinnerimportant")) loaderService.show() ;
  }

  return next(req).pipe(
    // 49-second safety timeout.
    timeout(49_000),

    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) {
          return;
        }

        if (
          !event.body ||
          typeof event.body !== 'object' ||
          Array.isArray(event.body)
        ) {
          return;
        }

        const body = event.body as any;

        if (body.key) {
          body.status = 'success';
          body.message =
            authService.auth_success_messages[
              authService.mode
            ];
        }

        console.log({
          body,
          clientTimezone,
          url:req.url
        });

        // Display UI messages.
        if (body.type === 'check') {
          noMessageToast.show();
        } else if (body.message && body.status) {
          if (body.type === 'modal') {
            modalMessageService.show(
              body.message,
              body.status,
              body.title
            );
          } else {
            toast.show(
              body.message,
              body.status as MessageType
            );
          }
        }

        // Save API data in the global store.
        if (body.main) {
          storeData.setMultiple(body.main);
        }

        // Handle redirects returned by the API.
        if (body.next_page) {
          const nextPage = body.next_page;

          if (nextPage.confirm_redirect) {
            reqConfirmation.show({
              title: nextPage.title || '',
              message: nextPage.message || '',
              confirmText:
                nextPage.confirmText || 'Continue',
              cancelText:
                nextPage.cancelText || 'Cancel',

              onConfirm: () => {
                if (nextPage.url) {
                  router.navigate(
                    [nextPage.url],
                    {
                      fragment: nextPage.focus
                    }
                  );
                }
              }
            });
          } else if (nextPage.url) {
            router.navigate(
              [nextPage.url],
              {
                fragment: nextPage.focus
              }
            );
          }
        };

        if (!hideSpinnerimportant&&isGet&&storeData.get("ads")?.sponsors.length||adsService.isOpen()) {
          adsService.open(storeData.get("ads"))
        }
      }
    }),

    catchError((
      error:
        | HttpErrorResponse
        | TimeoutError
        | any
    ) => {
      console.error(
        '[HttpInterceptor Error]:',
        error
      );

      if (
        error?.status === 401 ||
        error?.statusText === 'Unauthorized'
      ) {
        authService.logout(true);
        router.navigate(['/login']);
      }else{

        if (loaderService._loading.value) {
          if (error instanceof TimeoutError) {
           modalMessageService.show(
             'Connection timed out. Please check your network.',
             'error'
           );
         } else {
           modalMessageService.show(
             'Network error occurred. Please refresh if the issue persists.',
             'info'
           );
         }
        }
      }

      // Allow individual components to handle the error too.
      return throwError(() => error);
    }),

    finalize(() => {
      loaderService.setLoadingButton(null);

      if (loaderService._loading.value) {
        loaderService.hide();
      }
    })
  );
};
