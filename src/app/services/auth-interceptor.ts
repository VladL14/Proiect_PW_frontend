import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth';

/**
 * Functional HTTP interceptor that attaches the bearer token to every request
 * sent to the Dice Duel API. Requests to other origins are left untouched.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  if (token && req.url.includes('/api/')) {
    return next(
      req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    );
  }
  return next(req);
};
