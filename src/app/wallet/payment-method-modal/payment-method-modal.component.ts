
import {
  Component,
  Input,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

type PaymentType = 'crypto' | 'local';

@Component({
  selector: 'app-payment-method-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-method-modal.component.html',
  styleUrl: './payment-method-modal.component.scss'
})
export class PaymentMethodModalComponent
  implements OnInit, OnDestroy {

  @Input() walletService!: any;

  private subscription = new Subscription();

  isOpen = true;

  selectedType: PaymentType = 'local';

  ngOnInit(): void {

    this.selectedType =
      this.walletService.selectedTab;
    //
    // this.subscription.add(
    //   this.walletService.paymentSheet$.subscribe(
    //     (open:any) => {
    //       this.isOpen =
    //         open && !this.walletService.hidePayWith;
    //     }
    //   )
    // );
  }

  get canShow(): boolean {

    let show = this.isOpen &&
      !this.walletService.hidePayWith;
    return show
  }

  get hasCrypto(): boolean {
    return this.walletService.assets().length > 0;
  }

  get hasLocal(): boolean {
    return this.walletService.localMethods.length > 0;
  }

  selectType(type: PaymentType): void {
    this.selectedType = type;
  }

  continue(): void {

    if (this.selectedType === 'crypto') {

      if (!this.hasCrypto) return;

      this.walletService.changeTab('crypto');

      if (!this.walletService.selectedCrypto) {
        this.walletService.selectCrypto('BNB');
      }

    } else {

      if (!this.hasLocal) return;

      this.walletService.changeTab('local');

      const methods = this.walletService.localMethods;

      const current = this.walletService.selectedLocal;

      const selected =
        methods.find(
          (method: any) =>
            method.code === current?.code
        ) ?? methods[0];

      if (selected) {
        this.walletService.selectLocal(selected);
      }
    }

    this.close();
  }

  close(): void {
    // this.walletService.closeSelector();
    this.isOpen= false
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
