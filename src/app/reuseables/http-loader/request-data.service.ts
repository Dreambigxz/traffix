import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize, Observable, throwError} from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class RequestDataService {

  // Detect where Angular is running
  private hostname = window.location.hostname;

  // True when running on a live server
  production = ![
    'localhost',
    '127.0.0.1',
    '0.0.0.0'
  ].includes(this.hostname);

  // Local Django API
  useUrl = 'http://127.0.0.1:8000/api';

  // Automatically select API URL
  private apiUrl = this.production
    ? '/api'
    : this.useUrl;

  private mediaUrl = '';

  constructor(
    private http: HttpClient
  ) {
    console.log('Production:', this.production);
    console.log('API URL:', this.apiUrl);
  }

  get(endpoint: string) {
    return this.http.get(`${this.apiUrl}/${endpoint}`);
  }

  post(endpoint: string, body: any) {
    return this.http.post(`${this.apiUrl}/${endpoint}`, body);
  }

  patch(endpoint: string, body: any) {
    return this.http.patch(`${this.apiUrl}/${endpoint}`, body);
  }

  getMedia(
    path: string | null | undefined,
    url: string = 'https://www.oddsportal.com'
  ): string {

    this.mediaUrl = url;

    if (!path) {
      return 'assets/img/logo.svg';
    }

    if (path.startsWith('http')) {
      return path;
    }

    return this.mediaUrl + path;
  }
}
