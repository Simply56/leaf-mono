import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

// Reads are safe to repeat, so GETs are retried; mutations fail on the first error
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.method !== 'GET') return next(req);

    return next(req).pipe(
        retry({
            count: 5,
            delay: (error, retryCount) => {
                console.error(`Retry attempt ${retryCount} failed:`, error);
                return timer(1000); // wait 1s before retry
            },
        }),
    );
};
