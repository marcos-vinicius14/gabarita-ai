/**
 * Exception utilities barrel export
 */

// Base HTTP Exceptions
export {
    HttpException,
    type HttpExceptionOptions,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    ValidationException,
    TooManyRequestsException,
    InternalServerException,
    ServiceUnavailableException,
} from './_internal/http.exception';

// Auth-specific Exceptions
export {
    InvalidCredentialsException,
    AccountLockedException,
    LoginRateLimitException,
    InvalidTokenException,
    TokenExpiredException,
    TokenReuseException,
    RegistrationFailedException,
    InsufficientPermissionsException,
    AuthenticationRequiredException,
} from './_internal/auth.exception';

// Handler utilities
export { handleException, isHttpException } from './_internal/handler';
