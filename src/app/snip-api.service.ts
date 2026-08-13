import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipApiService {
  private readonly apiBase = this.resolveApiBase();

  constructor(private readonly http: HttpClient) {}

  createLink(url: string): Observable<SnipLink> {
    return this.http.post<SnipLink>(`${this.apiBase}/api/links`, { url });
  }

  listLinks(): Observable<SnipLink[]> {
    return this.http.get<SnipLink[]>(`${this.apiBase}/api/links`);
  }

  private resolveApiBase(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3000';
    }

    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:3000';
    }

    return window.location.origin;
  }
}
