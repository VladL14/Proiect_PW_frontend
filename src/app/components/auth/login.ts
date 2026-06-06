import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

/**
 * Login / registration panel built with native HTML5 form controls
 * (email/password inputs, required + minlength validation).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  @Output() authenticated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  mode: 'login' | 'register' = 'login';
  username = '';
  email = '';
  password = '';
  displayName = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService) {}

  switchMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.error = '';
  }

  submit(): void {
    this.error = '';
    this.loading = true;
    const done = {
      next: () => {
        this.loading = false;
        this.authenticated.emit();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Authentication failed.';
      }
    };

    if (this.mode === 'login') {
      this.auth.login(this.username, this.password).subscribe(done);
    } else {
      this.auth.register(this.username, this.email, this.password, this.displayName || undefined).subscribe(done);
    }
  }
}
