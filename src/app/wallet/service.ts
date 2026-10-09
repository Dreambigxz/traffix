import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { QuickNavService } from '../reuseables/services/quick-nav.service';
import { FormHandlerService } from '../reuseables/http-loader/form-handler.service';
import { CurrencyConverterPipe } from '../reuseables/pipes/currency-converter.pipe';

import {
    FormBuilder,
    Validators,
    // FormsModule
    // ReactiveFormsModule,

  } from '@angular/forms';

export interface PaymentMethod {

    code: string;

    name: string;

    symbol: string;

    rate: number;

    subtitle: string;

    flag?: string;

    img?: string;

    network?: string;

}

@Injectable({
    providedIn: 'root'
})
export class WalletService {

    constructor(
      public quickNav: QuickNavService,
      public formHandler: FormHandlerService,
      public fb: FormBuilder,
      private currConverter: CurrencyConverterPipe
    ){}

    cryptoMethods: any[] = [];

    localMethods: any[] = []

    hidePayWith = false;

    // forms = {
    //     cryptoForm : this.fb.group({
    //
    //       account_number: ['', Validators.required],
    //
    //       pin: ['', Validators.required],
    //
    //       payment_method: [''],
    //
    //       origin: ['']
    //
    //   }),
    //
    //   localForm : this.fb.group({
    //
    //       bank: ['', Validators.required],
    //
    //       account_number: ['', Validators.required],
    //
    //       account_holder: ['', Validators.required],
    //
    //       pin: ['', Validators.required],
    //
    //       payment_method: [''],
    //
    //       origin: ['']
    //
    //   })
    // }

    //=======================
      // Withdrawal properties
    //=======================
    withdraw_fee= 0//input(0);
    savedAdd:any = []

    isFirstDevice  = false


    // ===========================
    // UI STATE
    // ===========================

    readonly paymentSheet$ =
        new BehaviorSubject<boolean>(false);
    readonly withdrawalSheet$ =
        new BehaviorSubject<boolean>(false);

    selectedTab$ =
        new BehaviorSubject<'crypto' | 'local'>('crypto');

    selectedCrypto$=
        new BehaviorSubject<any>("");

    selectedLocal$ =
        new BehaviorSubject<any>("");

    readonly assets = signal<any[]>([]);

      // init <>
    initSettingOLD(){

      const currencies = this.quickNav.storeData.get("init_currencies")
      const settings = this.quickNav.storeData.get('wallet')?.settings

      this.cryptoMethods = currencies.slice(0,3)
      this.localMethods = currencies.slice(3)
      this.hidePayWith = false

      this.selectedTab$ =
          new BehaviorSubject<'crypto' | 'local'>('crypto');

      const [payWith, savedMethod] = [
        this.quickNav.storeData.get("payWith")?.toLowerCase(),
        this.quickNav.storeData.get("savedMethod")
      ]

      // console.log({payWith,savedMethod});


      if (payWith) {
        this.selectedTab$.next(payWith);
        this.hidePayWith = true

        if (payWith==='local') {
          this.localMethods= this.localMethods.filter((c:any)=>c.code===savedMethod)
        }else{
          this.cryptoMethods= this.cryptoMethods.filter((c:any)=>c.code===savedMethod)
        }

      }

      this.savedAdd = this.quickNav.storeData.get("wallet")?.saved_add
      this.withdraw_fee =  settings.withdraw_fee

      if (payWith) {
        this.selectCrypto(this.cryptoMethods[0]);
        this.selectLocal(this.localMethods[0]);
      }

      return {

        deposit: (self:any) =>{
          const local_banks = this.quickNav.storeData.get("local_banks")
            if (local_banks?.length == 1) {
              self.selectedAccount  = local_banks[0];
            }
        }
      }

    }

    initSetting(){

      const currencies = this.quickNav.storeData.get("init_currencies")
      const settings = this.quickNav.storeData.get('wallet')?.settings
      this.assets.set(
          this.quickNav.storeData.get("assets") ?? []
        );

        const [payWith, savedMethod] = [
          this.quickNav.storeData.get("payWith")?.toLowerCase(),
          this.quickNav.storeData.get("savedMethod")
        ]

      this.selectCrypto(savedMethod || "BNB")
      this.savedAdd = this.quickNav.storeData.get("wallet")?.saved_add
      this.withdraw_fee =  settings.withdraw_fee

      // this.isFirstDevice =
    }

    // ===========================
    // GETTERS
    // ===========================


    get selectedTab() {

        return this.selectedTab$.value;

    }

    get selectedCrypto() {

        return this.selectedCrypto$?.value;
    }

    get activeNetwork() {
      const networks =
      this.selectedCrypto?.networks //|| []

      if (!networks) return []  ;
      const selectedCurrency = networks[0].id

      return networks.find(
        (network:any) =>
          network.id === selectedCurrency

      ) ?? networks[0];
    }

    get selectedLocal() {

        return this.selectedLocal$?.value;

    }

    get paymentMethod(){

      const selectedTab  = this.selectedTab

      if (selectedTab==='crypto') {

        return this.activeNetwork
      }
      return this.selectedLocal

    }

    get Page(){
      return window.location.pathname.replace('/wallet/', '')
    }

    get minimumPayment(){

      const selectedData = this.activeNetwork;

      const page = this.Page
      const code  = selectedData?.code
      const index_by =  'minimum_'+page
      const settings = this.quickNav.storeData.get('wallet')?.settings


      let minimum;

      if (settings) {
        if (code==='TRON') {
          minimum =this.convertUsdToTrx(settings[index_by] ,selectedData.rate)
        }else{
          minimum =settings[index_by] * selectedData?.rate
        }
      }

      return minimum

    }

    get getPayaddress(){

      const payAddresses= this.quickNav.storeData.get("pay_address") //?walletService.selectedCrypto.code]
      const selectedMethod = this.selectedCrypto?.code
      if (payAddresses) {
        if (selectedMethod?.toLowerCase()==='bnb') {
          return payAddresses.bnb
        }else{
          return payAddresses.tether
        }
      }
      return

    }

    get payment() {

        return this.selectedTab === 'crypto'

            ? this.selectedCrypto

            : this.selectedLocal;

    }

    get totalTransaction(){
      const page = this.Page
      const wallet_history = this.quickNav.storeData.get('wallet')?.history

      let total_tra;

      if (wallet_history) {
        total_tra = wallet_history[page]
      }

      return total_tra


    }

    // ===========================
    // ACTIONS
    // ===========================

    activeAssetKey(assetName:string = "BNB"){

      let CryptoAssetkeys = ["BNB", "USD", "TRON"]

      return CryptoAssetkeys.indexOf(assetName);
    }

    changeTab(tab: 'crypto' | 'local') {

        this.selectedTab$.next(tab);

    }

    selectCrypto(assetName:any) {

        const assets = this.quickNav.storeData.get("assets")

        this.selectedCrypto$.next(assets?.[this.activeAssetKey(assetName)]);

    }

    selectLocal(payment: PaymentMethod) {

        this.selectedLocal$.next(payment);

    }

    openSelector(sheet: BehaviorSubject<boolean> = this.paymentSheet$) {

        sheet.next(true);

    }

    closeSelector(sheet: BehaviorSubject<boolean> = this.paymentSheet$) {

        sheet.next(false);
    }

    cancelPayment(type:any, callback:any=null){

      this.quickNav.confirmation.show({
        title:"Cancel Request",
        message: "This transaction will be deleted from your history.",
        confirmText: 'Continue',
        cancelText: 'Cancel',

        onConfirm: async () => {
          this.quickNav.reqServerData.get(`wallet?dir=delete_${type}&showSpinner`)
          .subscribe(()=>{
            this.initSetting()
          })
        }

      })

    }

    //============================
    //HELPER
    //=============================

    convertUsdToTrx(usd: number, rate: number = 0.322407): number {
      return +(usd / rate).toFixed(2);
    }

    convertToUsd(amount: number): number {
      let res;

      let selectedData = this.paymentMethod

      // let [code, rate] = selectedData.code, selectedData.rate
      if (selectedData.code==="TRON") {
        res =  +(amount * selectedData.rate).toFixed(2);
      }else{
        res =  +(amount / selectedData.rate).toFixed(2);
      }

      return res;
    }

    convertAmount(value: number): number {

      return parseFloat(this.currConverter.transform(
        value,
        false,
        this.paymentMethod?.code
      ))

    }



}
