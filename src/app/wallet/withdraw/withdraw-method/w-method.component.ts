import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyConverterPipe } from '../../../reuseables/pipes/currency-converter.pipe';
import { FormsModule } from '@angular/forms';
import { TruncateCenterPipe } from '../../../reuseables/pipes/truncate-center.pipe';

import { WpSheetComponent } from
'../wp-sheet/wp-sheet.component';

@Component({
    selector: 'app-withdraw-method',
    imports: [
        CommonModule,
        WpSheetComponent,
        CurrencyConverterPipe,
        FormsModule,
        TruncateCenterPipe,
    ],
    templateUrl: './w-method.component.html',
    styleUrls: ['./w-method.component.css']
})
export class WithdrawMethodComponent {

    walletService = input<any>()

    hasMethod = false;

    amount=0;

    quickAmounts=[2, 10, 20,  50, 100, 200, 500, 1000];

    addMethod() {

        this.walletService().openSelector(this.walletService().withdrawalSheet$)

    }

    editMethod() {

        this.hasMethod = this.walletService().savedAdd?.length > 0;
        this.addMethod()

    }

    get receive(){

        return this.amount - this.amount * this.walletService().withdraw_fee / 100   //Math.max(0,this.amount-this.walletService().withdraw_fee);

    }

    setAmount(selectAmount:number){

        this.amount=this.walletService().convertAmount(selectAmount)

    }

    max(){

        this.amount=this.walletService().convertAmount(this.walletService().quickNav.storeData.get("wallet").balance);

    }

    withdraw(){

      const data =  {
        amount:this.amount,
        processor:"create_withdraw",
        payment_method: this.walletService().paymentMethod.code
      }

      this.walletService().quickNav.reqServerData.post("wallet/", data)
      .subscribe()
    }

}
