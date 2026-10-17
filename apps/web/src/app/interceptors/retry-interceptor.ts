import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { retry, throwError, timer } from "rxjs";

// Reads are safe to repeat, so GETs are retried; mutations fail on the first error.
// A 4xx (a refused key, a missing plant) would fail the same way again, so it is not retried.
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.method !== "GET") return next(req);

    return next(req).pipe(
        retry({
            count: 5,
            delay: (error, retryCount) => {
                if (
                    error instanceof HttpErrorResponse &&
                    error.status >= 400 &&
                    error.status < 500
                ) {
                    return throwError(() => error);
                }
                console.error(`Retry attempt ${retryCount} failed:`, error);
                return timer(1000); // wait 1s before retry
            },
        }),
    );
};
