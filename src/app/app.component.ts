import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SnipApiService, SnipLink } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly urlInput = signal('');
  readonly links = signal<SnipLink[]>([]);
  readonly createdShortUrl = signal('');
  readonly error = signal('');
  readonly loading = signal(false);

  constructor(private readonly api: SnipApiService) {}

  ngOnInit(): void {
    void this.refreshLinks();
  }

  onUrlInput(value: string): void {
    this.urlInput.set(value);
  }

  async submitUrl(event: Event): Promise<void> {
    event.preventDefault();

    const url = this.urlInput().trim();
    if (!this.isValidHttpUrl(url)) {
      this.error.set('Please enter a valid http:// or https:// URL.');
      this.createdShortUrl.set('');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const created = await firstValueFrom(this.api.createLink(url));
      this.createdShortUrl.set(created.shortUrl);
      this.urlInput.set('');
      await this.refreshLinks();
    } catch (err: unknown) {
      this.error.set(this.getApiError(err));
      this.createdShortUrl.set('');
    } finally {
      this.loading.set(false);
    }
  }

  trackByCode(_index: number, link: SnipLink): string {
    return link.code;
  }

  private async refreshLinks(): Promise<void> {
    try {
      const allLinks = await firstValueFrom(this.api.listLinks());
      this.links.set(allLinks);
    } catch {
      this.error.set('Could not load links from the backend.');
    }
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getApiError(err: unknown): string {
    if (err && typeof err === 'object') {
      const maybeError = err as { error?: { error?: string } };
      if (maybeError.error?.error) {
        return maybeError.error.error;
      }
    }
    return 'Request failed. Check that backend is running on http://localhost:3000.';
  }
}
