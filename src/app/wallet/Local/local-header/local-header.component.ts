
import {
  Component,
  input,
  Input,
  model
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-local-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './local-header.component.html',
  styleUrl: './local-header.component.scss'
})
export class LocalHeaderComponent {

  readonly mode = input<'deposit' | 'withdrawal'>('deposit');

  readonly title = input('Local Wallet');

  readonly balance = input(0);

  readonly currency = input('USD');

  readonly totalTransactions = input(0);

  @Input() walletService: any = null;

  readonly selectedCurrency = model<string>('');

  selectCurrency(method: any): void {

    if (!method) return;

    this.selectedCurrency.set(method.code);

    this.walletService?.selectLocal(method);

    // this.walletService?.changeTab('local');
  }

  convertAmount(amount: number, method: any): number {
    return +(
      Number(amount) * Number(method?.rate ?? 0)
    ).toFixed(2);
  }
}
