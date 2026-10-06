import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';


import { StoreDataService } from '../http-loader/store-data.service'; // ✅ adjust path as needed
import { FormHandlerService } from '../http-loader/form-handler.service';
import { ConfirmationDialogService } from '../modals/confirmation-dialog/confirmation-dialog.service';
import { QuickMessageService } from '../modals/quick-message/quick-message.service';
import { RequestDataService } from '../http-loader/request-data.service';
import { ToastService } from '../toast/toast.service';
import { AuthService } from '../auth/auth.service';
import { CurrencyConverterPipe } from '../pipes/currency-converter.pipe';

import { copyContent } from '../helper';


@Injectable({
  providedIn: 'root'
})
export class QuickNavService {
  constructor(public router: Router) {}

  /**
   * Navigate quickly to any route.
   * @param url - Route path or full URL.
   * @param extras - Optional router navigation extras.
   */

   currConverter = inject(CurrencyConverterPipe)
   storeData = inject(StoreDataService)
   reqServerData = inject(RequestDataService)
   authService=inject(AuthService)

   toast=inject(ToastService)
   confirmation = inject(ConfirmationDialogService)
   quickMessage = inject(QuickMessageService)

   emptyDataUrl = 'assets/images/empty-box.png'
   changePassword = false
   languageModalOpen = false

   modal:any

   availableLang : any =  {
     "English": ["en", "US"],
     "French": ["fr", "FR"],
     "Spanish": ["es", "ES"],
     "Vietnam": ["vi", "VN"],
     // "Tanzania": ["sw", "TZ"],
     "Indonedia": ["id", "ID"],
     "Zambia": ["bem", "ZM"],

     "Portuguese (Brazil)": ["pt", "PT"],
     "Arabic": ["ar", "AE"],
     "Chinese": ["zh-CN", "CN"],
     "Italian": ["it", "IT"],
     "Greek": ["el", "GL"]
   }

  langKeys = Object.keys(this.availableLang)

  readonly selectedLang =
    signal(localStorage.getItem("lang") || "English")

  helpLinks = {

    'tech': ""
  }

   go(url: string,  queryParams?: any, fragment?: string,): void {


    if(url==='home')url = '/';

     this.router.navigate([url], {
       queryParams,
       fragment
     });

   }


  alert(message:any,status:string='success'){
    this.toast.show({message,status})
  }

  copy(item:any, message:any="Data copied"){
    copyContent(this.quickMessage,item,message)
  }

  open(url:any){

    window.location.assign(url);

  }

  openTab(url:any){

    window.open(url, '_blank')
  }

  openModal(modalName:any) {
    if (this.modal) {
      this.closeModal();
    }
    const modalEl = document.getElementById(modalName);
    if (modalEl) {
      this.modal = new (window as any).bootstrap.Modal(modalEl);
      this.modal.show();
    }
  }

  closeModal(){
    this.modal.hide()
  }

  reload(url:string){

    this.reqServerData.get(url+'/?showSpinner').subscribe()

  }

  changeLanguage(event: any) {

    const lang = event.target.value;

    const interval = setInterval(() => {

      const select:any = document.querySelector('.goog-te-combo');

      if (select) {

        select.value = lang;
        select.dispatchEvent(new Event('change'));

        clearInterval(interval);
      }

    }, 800);
  }

  generatePassword(length: number = 12): string {

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~';

    const allChars = upper + lower + numbers + symbols;

    let password = '';

    for (let i = 0; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    return password;
  }

  getDateRange() {
    const now = new Date();

    const currentDate = new Date(now);

    const firstNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    return {
      currentDate,
      firstNextMonth
    };
  }

  checkIn(){

    if (!this.storeData.store['checked_in']&&this.authService.isLoggedIn) {

      this.reqServerData.get("dashboard?check_in=check_in")
      .subscribe()
    }
  }

  maskUsername(username: string): string {
    if (!username) return '';

    const prefixLength = username.length <= 3 ? 1 : 3;
    const prefix = username.substring(0, prefixLength);

    // Calculate unmasked remaining length, but cap at maximum 4 asterisks
    const asteriskCount = Math.min(username.length - prefixLength, 4);

    return prefix + '*'.repeat(asteriskCount);
  }

  convertAmount(value: number, code:any=this.storeData.store['wallet']?.init_currency?.code): number {

    return parseFloat(this.currConverter.transform(
      value,
      false,
      code
    ))

  }

  goBack(){
    window.history.go(-1)
  }

  get daysSinceJoined(): number {

    const joinedAt = this.storeData.get("date_joined")

    if (!joinedAt) {
      return 0;
    }

    const joined =
      new Date(joinedAt);

    const today =
      new Date();

    const diff =
      today.getTime() -
      joined.getTime();

    const res = Math.floor(
      diff / (1000 * 60 * 60 * 24)
    );

    return res;

  }

}
