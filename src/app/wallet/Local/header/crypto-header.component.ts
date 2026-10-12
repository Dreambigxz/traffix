import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input, Input,
  model
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';


@Component({
  selector: 'app-crypto-header',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './crypto-header.component.html',
  styleUrl: './crypto-header.component.scss'
})
export class CryptoHeaderComponent {

  readonly mode = input<
    'deposit' | 'withdrawal'
  >('deposit');

  readonly title = input('Crypto Wallet');

  readonly balance = input(0);

  readonly currency = input('USD');

  readonly totalTransactions = input(0);

  readonly assets =
    input<any[]>([]);

  @Input() walletService: any = null;


  readonly selectedAsset =
    model<any>('BNB');

  readonly selectedNetworkId =
    model<string>('');

  readonly activeAsset = computed(() => {

    return this.assets().find(
      asset =>
        asset.symbol ===
        this.walletService.selectedCrypto.symbol
    );
  });

  readonly availableNetworks =
    computed(() => {
      return (
        this.activeAsset()
          ?.networks
          ?.filter(
            (network:any) => network.is_active
          ) ?? []
      );
    });


  selectAsset(
    asset: any
  ): void {
    this.selectedAsset.set(
      asset.symbol
    );

    const firstNetwork =
      asset.networks.find(
        (network:any) => network.is_active
      );

    this.selectedNetworkId.set(
      firstNetwork?.id ?? ''
    );

    this.walletService.selectCrypto(asset.code)
  }


  selectNetwork(
    event: Event
  ): void {
    const select =
      event.target as HTMLSelectElement;

    this.selectedNetworkId.set(
      select.value
    );
  }


  assetIcon(
    symbol: any
  ): string {
    const icons: Record<
      any,
      string
    > = {
      USDT: '₮',
      BNB: '◆',
      TRX: '◈'
    };

    return icons[symbol];
  }


}
