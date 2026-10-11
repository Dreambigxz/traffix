import {
  Component,
  input,
  signal,
  PLATFORM_ID,
  Inject} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { TruncateCenterPipe } from '../../reuseables/pipes/truncate-center.pipe';

import { WalletHeaderComponent } from "../header/w-header.component";
import { CryptoHeaderComponent } from "../crypto-header/crypto-header.component";
import { WalletService } from "../service";
import { LocalComponent } from "./local/local.component";
import { HeaderComponent } from "../../components/header/header.component";
import { SpinnerComponent } from '../../reuseables/http-loader/spinner.component';

import { QuickNavService } from '../../reuseables/services/quick-nav.service';

@Component({
  selector: 'app-deposit',
  imports: [
    WalletHeaderComponent,
    CommonModule,
    TruncateCenterPipe,
    LocalComponent,
    HeaderComponent,
    SpinnerComponent,
    CryptoHeaderComponent
  ],
  templateUrl: './deposit.component.html',
  styleUrl: './deposit.component.css'
})
export class DepositComponent {

  constructor(
      public walletService:WalletService,
      private quickNav:QuickNavService,
      @Inject(PLATFORM_ID)
      private readonly platformId: object
  ){}

  selectedAccount: any

  readonly addressCopied =
    signal(false);

  ngOnInit(){

    if (!this.quickNav.storeData.get("deposit")) {
        this.quickNav.reqServerData.get('wallet/?dir=start_deposit').subscribe((res)=>{
          this.walletService.initSetting()//.deposit(this);
      })}
  }

  confirmDeposit() {

    this.quickNav.reqServerData.get('wallet?dir=start_deposit').subscribe((res)=>{
      this.walletService.initSetting()//.deposit(this);
    })

  }

  checkPaymentStatus(){
    this.quickNav.reqServerData.get('wallet/?dir=start_deposit').subscribe((res)=>{
        this.walletService.initSetting()//.deposit(this);
    })
  }


  async copyAddress(): Promise<void> {
    const address =
      this.walletService.activeNetwork?.address;

    if (
      !address ||
      !isPlatformBrowser(this.platformId)
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        address
      );

      this.addressCopied.set(true);

      window.setTimeout(
        () => {
          this.addressCopied.set(false);
        },
        2000
      );
    } catch {
      // this.wallet.setError(
      //   'Could not copy wallet address.'
      // );
    }
  }




}
