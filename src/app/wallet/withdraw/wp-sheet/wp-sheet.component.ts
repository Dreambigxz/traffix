import { Component, OnInit, input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { WalletService } from "../../service";


@Component({
  selector: 'app-wp-sheet',
  imports: [
    CommonModule,
    ReactiveFormsModule

  ],
  templateUrl: './wp-sheet.component.html',
  styleUrl: './wp-sheet.component.css'
})
export class WpSheetComponent implements OnInit, OnDestroy {

    cryptoForm!: any;

    localForm!: any;

    constructor(
          public wallet:WalletService,
      ){}

    editMode =  input(false);

    accountName='444';

    banks=[

        'Access Bank',

        'GTBank',

        'UBA',

        'Zenith Bank',

        'First Bank'

    ];

    ngOnInit() {

        this.cryptoForm = this.wallet.fb.group({

            account_number: ['', Validators.required],

            pin: ['', Validators.required],

            payment_method: [''],

            origin: ['']

        });

        this.localForm = this.wallet.fb.group({

            bank: ['', Validators.required],

            account_number: ['', Validators.required],

            account_holder: ['', Validators.required],

            pin: ['', Validators.required],

            payment_method: [''],

            origin: ['']

        });

    }

    get activeForm(){


      const selectedTab  = this.wallet.selectedTab
      const isFirstDevice =  this.wallet.quickNav.storeData.get("is_first_device")

      if (selectedTab==='crypto') {
        this.togglePinRequired(isFirstDevice, this.cryptoForm)
        return this.cryptoForm
      }

      return this.localForm

    }

    save(){

        const form = this.activeForm;
        form.patchValue({ payment_method: this.wallet.paymentMethod.code });
        form.patchValue({ origin: window.location.origin });
        form.patchValue({ updating_address: true });


        this.wallet.formHandler.submitForm(form, "create_withdraw", 'wallet/?showSpinner', true,  (res) => {
            if (res.status==='success') {
              this.wallet.initSetting();

              this.wallet.closeSelector(this.wallet.withdrawalSheet$)
            }

        })


    }

    // Function to toggle PIN requirement based on condition
    togglePinRequired(isFirstDevice: boolean, form: any): void {

      const pinControl = form.get('pin');

      if (!isFirstDevice) {
        pinControl?.setValidators([Validators.required]);
      } else {
        pinControl?.clearValidators(); // Removes 'required'
      }

      // Mandatory step: refresh control state
      pinControl?.updateValueAndValidity();
    }

    codeCountdown = 0;

    private codeTimer?: ReturnType<typeof setInterval>;

    getCode() {
      if (this.codeCountdown > 0) return;

      this.codeCountdown = 60;

      // Send your code request here.
      this.wallet.quickNav.reqServerData.post('wallet/',  {'processor': "verificaion_code"}).subscribe()

      this.codeTimer = setInterval(() => {
        this.codeCountdown--;

        if (this.codeCountdown <= 0) {
          clearInterval(this.codeTimer);
          this.codeTimer = undefined;
        }
      }, 1000);


    }

    ngOnDestroy() {
      clearInterval(this.codeTimer);
    }


}
