import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
// import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { ConfirmationDialogService } from '../modals/confirmation-dialog/confirmation-dialog.service';
import { LoaderService } from '../http-loader/loader.service';
import { StoreDataService } from '../http-loader/store-data.service';
import { RequestDataService } from '../http-loader/request-data.service';
import { HttpClient } from '@angular/common/http';

import { FormHandlerService } from '../http-loader/form-handler.service';
import {  FormBuilder, Validators, AbstractControl } from '@angular/forms';

interface StoredToken {
  created: string;  // ISO string
  exp: string;      // ISO string
  token: string;
}

type FormPageGroup = 'login' | 'register' | 'reset'

@Injectable({
  providedIn: 'root',
})
export class AuthService {


  // private dialog = inject(MatDialog);
  public  router = inject(Router);
  private reqConfirmation = inject(ConfirmationDialogService)
  private storeData = inject(StoreDataService)
  public reqServerData = inject(RequestDataService)

  public tokenKey = 'token';
  public isLoggedIn = false;
  public redirectUrl: string | null = null;
  public token: string | null = null;
  public loaderService = inject(LoaderService);

  public tokenData : any

  public http = inject(HttpClient)

  fb = inject(FormBuilder);
  formHandler=inject(FormHandlerService)

  formView: Record<FormPageGroup, any> = {
    register:this.fb.group({
      username:['',[Validators.required]],
      email:["", [Validators.required]],
      tele:[""],
      password:["", [Validators.required, Validators.minLength(6)]],
      confirm_password:["", [Validators.required]],

      RefCode:[""],
      geolocation:[""],

    },{
      validators: this.passwordMatchValidator
    }),

      login:this.fb.group({
        identifier:['',[Validators.required]],
        password:["", [Validators.required]],
      }),
      reset:this.fb.group({
        email:['',[Validators.required]],
    }),

  }

  invitedBy:any
  RefCode:any
  uplinner:any
  showPassword=false

  isVisible = false;

  mode: 'login' | 'register' | 'reset' = 'login';

  country: any //= {}

  auth_success_messages: any  = {
    // login:"You're now logged in",
    register:"Your registration was successful"
  }

  private addHours(date: Date, hours: number): Date {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  }

  passwordMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirm_password')?.value;

    return password === confirm ? null : { passwordMismatch: true };
  }

  /** ✅ Checks if user is logged in and token still valid */
  checkLogin(): boolean {

    const local = "75e8a7a1a13384ebe6b789de332006e61dae189d"
    const server = "5c534aa7b69a537cae3c8cb65c56049cd08477df"

    const raw = localStorage.getItem(this.tokenKey) ;

    if (!raw) {

      this.isLoggedIn = false;
      return false;
    }

    try {
      const stored: StoredToken = JSON.parse(raw);
      const exp = new Date(stored.exp);
      const now = new Date();

      if (now >= exp) {
        this.logout_now(); // Expired
        return false;
      }

      this.token = stored.token
      this.isLoggedIn = true;
      this.tokenData=stored

      return true;
    } catch (e) {
      this.logout_now();
      return false;
    }
  }

  /** ✅ Save login and token */
  // login(token: string, authAction:any): Observable<boolean> {
  login(token: string, authAction:any) {

    let next_url = "/"
    // if (this.mode==="register")next_url = '/set-pin';

    const payload: StoredToken = {
      created: new Date().toISOString(),
      exp: this.addHours(new Date(), 48).toISOString(),
      token,
    };

    localStorage.setItem(this.tokenKey, JSON.stringify(payload));
    localStorage.setItem("clientAction",authAction)
    localStorage.removeItem('invitedBy')

    this.isLoggedIn = true;

    this.isVisible=false

    //
    const redirectUrl = localStorage['redirectUrl'] || next_url;

    try {

      const [path, query] = redirectUrl.split('?');

      delete this.storeData.store['soccer']


      if (query) {
        const queryParams = Object.fromEntries(new URLSearchParams(query));
        this.router.navigate([path], { queryParams });
      } else {
        this.router.navigate([path]);
      }

    } catch (error) {
      this.router.navigate(['/']);
    }

    delete localStorage['redirectUrl'];

    // return of(true);
  }

  /** ✅ Get current token if logged in */
  getToken(): string | null {
    if (this.checkLogin()) {
      const raw = localStorage.getItem(this.tokenKey);
      return raw ? JSON.parse(raw).token : null;
    }
    return null;
  }

  /** ✅ Force logout */
  logout_now(): void {
    localStorage.removeItem(this.tokenKey);
    this.isLoggedIn = false;
    this.storeData.clear()
    this.loaderService.show()
    window.location.reload()//='/sign-in';
  }

  /** ✅ Optional logout with confirmation */
  logout(force = true): void {
    if (force) {
      this.logout_now();
    } else {
      this.reqConfirmation.show({

          title: 'LOGOUT',

          message:
              `Do you want to continue?`,

          confirmText: 'Continue',

          cancelText: 'Cancel',

          onConfirm: () => {


              this.logout_now();

          }

      });
    }
  }

  onSubmit(form:any,processor:any){

    // if (this.RefCode) {
    //   form.patchValue({ RefCode: this.RefCode });
    //  }

     if (processor==='register') {
       form.patchValue({ geolocation: this.country });
       delete localStorage['useGuide'];

     }
    this.formHandler.submitForm(form,processor, processor+'/?showSpinner',  true, (res) => {
      if (res.key) {
        this.login(res.key, this.mode)
      }

    });

  }

  setRefCode(){

    // http://localhost:4200/auth?invite=5A45173

    let checkUrl = window.location.href.split('?invite')
    console.log({checkUrl});


    if (checkUrl[1]) {
      this.mode = 'register';
      this.RefCode=checkUrl[1].replaceAll('=','')
      localStorage['invitedBy']=this.RefCode
      this.formView.register.patchValue({ RefCode: this.RefCode });
    }else{
      if (localStorage['invitedBy']) {
        this.RefCode=localStorage['invitedBy']
      }
    }
      if (this.RefCode) {
        this.formView["register"].patchValue({ RefCode: this.RefCode });
      }
    // if (this.RefCode&&!this.invitedBy) {
    //   this.reqServerData.get('register?RefCode='+this.RefCode).subscribe({
    //     next:(res:any) =>{
    //
    //       console.log({res});
    //
    //       this.invitedBy=res?.main?.invitedBy||''
    //       if (!this.invitedBy) this.RefCode=null
    //
    //     }
    //   })
    // }

  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  open(mode: 'login' | 'register' | 'reset' = 'login') {

    if (this.isLoggedIn)return;

    this.mode = mode;
    this.isVisible = true;

    if (mode==='register') {
      this.setRefCode()
    }

  }

  close() {

    this.isVisible = false;

  }

  detectCountry() {

    // this.http
    //   .get<any>('https://ipapi.co/json/')
    //   .subscribe({
    //
    //     next: (data:any) => {
    //
    //       const code =
    //         data?.country_code?.toUpperCase();
    //
    //       if (code) {
    //         data.flag =   `https://flagsapi.com/${code}/flat/64.png`
    //         this.country = data
    //       }
    //
    //     },
    //
    //     error: (err:any) => {
    //     }
    //
    //   });

  }

  // social Auth
  loginWithGoogle() {

    const url = "https://traffix.cc"
    // const url = 'http://localhost:4200'
    const googleClientId = '944570288109-vn0fc41qlu672r3qrhg6988kqgd9lbtn.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${url}/authentication?callback=google`);
    const scope = encodeURIComponent('email profile');

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleClientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }




}
