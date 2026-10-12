import { Component, Input } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { CryptoHeaderComponent } from "./crypto-header/crypto-header.component";
import { LocalHeaderComponent } from "./Local/local-header/local-header.component";
import { PaymentMethodModalComponent } from './payment-method-modal/payment-method-modal.component';


@Component({
  selector: 'app-wallet',
  imports: [
    CommonModule,
    CryptoHeaderComponent,
    LocalHeaderComponent,
    PaymentMethodModalComponent
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class WalletComponent {

  @Input() walletService: any = null;

}
