import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';

import { Observable, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { CurrencyConverterPipe } from '../reuseables/pipes/currency-converter.pipe';
import { HeaderComponent } from "../components/header/header.component";

import { TruncateCenterPipe } from '../reuseables/pipes/truncate-center.pipe';
import { QuickNavService } from '../reuseables/services/quick-nav.service';

import { MobileMenuComponent } from "../components/mobile-menu/mobile-menu.component";
// import { InviteServices } from "./invite.service";
import { CountdownPipe } from '../reuseables/pipes/countdown.pipe';


interface GenerationData {
  count: number;
  amount: number;
  last_updated?: string | null;
}

@Component({
  selector: 'app-invite',
  imports: [
    CommonModule,CurrencyConverterPipe,
    HeaderComponent,
    TruncateCenterPipe,
    // UsersComponent,
    MobileMenuComponent,
    CountdownPipe
  ],
  templateUrl: './invites.component.html',
  styleUrls: ['./invites.component.css', ]
})
export class InvitesComponent {


  quickNav = inject(QuickNavService)
  // inviteService = inject(InviteServices)
  refLink:any
  walletData:any

  readonly loading = signal(false);
  readonly copied = signal(false);

  constructor(
    @Inject(PLATFORM_ID)
    private readonly platformId: object
  ) {}


  ngOnInit(){
      if (!this.quickNav.storeData.get('refDir')) {this.quickNav.reqServerData.get("promotions/")
      .subscribe((res)=>{
          this.walletData=this.quickNav.storeData.get('wallet');
          this.referralData.set(this.quickNav.storeData.get("refDir"))

        }
      )}
  }

  readonly referralData = signal<any>({})
  //   {
  //   'total': {
  //     'generation_1': 1,
  //     'generation_2': 2,
  //     'generation_3': 0
  //   },
  //
  //   'active': {
  //     'generation_1': 0,
  //     'generation_2': 0,
  //     'generation_3': 0
  //   },
  //
  //   'referral': {
  //     'generation_1': {
  //       'count': 0,
  //       'amount': 40
  //     },
  //
  //     'generation_2': {
  //       'count': 0,
  //       'amount': 0
  //     },
  //
  //     'generation_3': {
  //       'count': 0,
  //       'amount': 0
  //     }
  //   },
  //
  //   'rebate': {
  //     'generation_1': {
  //       'count': 40,
  //       'amount': 0
  //     },
  //
  //     'generation_2': {
  //       'count': 0,
  //       'amount': 0
  //     },
  //
  //     'generation_3': {
  //       'count': 0,
  //       'amount': 0
  //     }
  //   },
  //
  //   'deposit': {
  //     'generation_1': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     },
  //
  //     'generation_2': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     },
  //
  //     'generation_3': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     }
  //   },
  //
  //   'withdraw': {
  //     'generation_1': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     },
  //
  //     'generation_2': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     },
  //
  //     'generation_3': {
  //       'count': 0,
  //       'amount': 0,
  //       'last_updated': null
  //     }
  //   },
  //
  //   'RefCode': '0A7C610',
  //
  //   'settings': {
  //     'percent': {
  //       'referral': [5, 4, 1],
  //       'rebate': [6, 3, 1]
  //     }
  //   },
  //
  //   'cashed_commissions': 0,
  //   'uncashed': 0,
  //   'last_cashed_at': null,
  //   'pending_ref': 1
  // });

  readonly totalNetwork = computed(() => {
    const data =
      this.referralData()['total'];
    if(!data) return 0
    return (
      Number(data['generation_1'] || 0) +
      Number(data['generation_2'] || 0) +
      Number(data['generation_3'] || 0)
    );
  });

  readonly totalActive = computed(() => {
    const data =
      this.referralData()['active'];

      if(!data) return 0
    return (
      Number(data['generation_1'] || 0) +
      Number(data['generation_2'] || 0) +
      Number(data['generation_3'] || 0)
    );
  });

  readonly totalEarnings = computed(() => {
    return this.generations().reduce(
      (
        total: number,
        generation: any
      ) => {
        return total + generation['earnings'];
      },
      0
    );
  });

  readonly referralLink = computed(() => {
    const code =
      this.referralData()['RefCode'] ?? '';

    if (
      isPlatformBrowser(this.platformId)
    ) {
      return (
        `${window.location.origin}` +
        `/authentication?invite=${code}`
      );
    }

    return `/register?ref=${code}`;
  });

  async copyReferralLink(): Promise<void> {
    if (
      !isPlatformBrowser(this.platformId)
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        this.referralLink()
      );

      this.copied.set(true);

      window.setTimeout(
        () => {
          this.copied.set(false);
        },
        2000
      );
    } catch {
      this.copied.set(false);
    }
  }

  async inviteFriends(): Promise<void> {
    if (
      !isPlatformBrowser(this.platformId)
    ) {
      return;
    }

    const shareData = {
      title: 'Join my network',
      text:
        'Join through my invitation link:',
      url: this.referralLink()
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await this.copyReferralLink();
  }

  viewGeneration(
    generation: any
  ): void {
    this.quickNav.go(`/invites/users/${generation.level}`)
  }

  readonly generations = computed<any[]>(
    () => {
      const data = this.referralData();

      return [1, 2, 3].map(level => {
        const key =
          `generation_${level}`;

        const referral =
          data['referral']?.[key] ?? {};

        const rebate =
          data['rebate']?.[key] ?? {};

        const deposit =
          data['deposit']?.[key] ?? {};

        const withdraw =
          data['withdraw']?.[key] ?? {};

        const referralPercent =
          data['settings']
            ?.['percent']
            ?.['referral']
            ?.[level - 1] ?? 0;

        const rebatePercent =
          data['settings']
            ?.['percent']
            ?.['rebate']
            ?.[level - 1] ?? 0;

        const labels: any = {
          1: 'Direct Invites',
          2: 'Team Network',
          3: 'Extended Network'
        };

        return {
          'level': level,
          'key': key,
          'label': labels[level],

          'users': Number(
            data['total']?.[key] ?? 0
          ),

          'active': Number(
            data['active']?.[key] ?? 0
          ),

          'deposited': Number(
            deposit['amount'] ?? 0
          ),

          'deposit_count': Number(
            deposit['count'] ?? 0
          ),

          'withdrawn': Number(
            withdraw['amount'] ?? 0
          ),

          'withdraw_count': Number(
            withdraw['count'] ?? 0
          ),

          'referral_earning': Number(
            referral['amount'] ?? 0
          ),

          'rebate_earning': Number(
            rebate['amount'] ?? 0
          ),

          'earnings':
            Number(
              referral['amount'] ?? 0
            ) +
            Number(
              rebate['amount'] ?? 0
            ),

          'referral_percent':
            referralPercent,

          'rebate_percent':
            rebatePercent
        };
      });
    }
  );


}
