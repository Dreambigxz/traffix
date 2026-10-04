// news.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuickNavService } from '../../reuseables/services/quick-nav.service'; // ✅ adjust path as needed


@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private readonly apiUrl =
    'http://localhost:8000/api/news';

  constructor(private quickNav: QuickNavService) {}

  submitComment(
    articleId: number,
    content: string
  ): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.apiUrl}/articles/${articleId}/comment/`,
      {
        content
      },
      {
        withCredentials: true
      }
    );
  }
}
