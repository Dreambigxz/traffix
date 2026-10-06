import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize, Observable, throwError} from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RequestDataService {

  production = false
  // useUrl = 'http://127.0.0.1:8000/api'
  useUrl = "https://web-production-f0389.up.railway.app/api"
  // ng serve --host 0.0.0.0


  private apiUrl = this.production
      ? '/api'
      : this.useUrl;

  private mediaUrl = this.production
      ? ''
      : '';

  constructor(
      private http: HttpClient
  ) {}

  get(endpoint: string) {

      return this.http.get(`${this.apiUrl}/${endpoint}`);
  }

  post(endpoint: string, body: any) {
      return this.http.post(`${this.apiUrl}/${endpoint}`, body);
  }

  patch(endpoint: string, body: any) {
      return this.http.patch(`${this.apiUrl}/${endpoint}`, body);
  }

  getMedia(path: string | null | undefined, url:string = "https://www.oddsportal.com"): string {

      this.mediaUrl  = url

      if (!path)
          return 'assets/img/logo.svg';

      if (path.startsWith('http'))
          return path;

        let req_url = this.mediaUrl + path

      return req_url;

  }

}
