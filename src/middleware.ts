/**
 * Модуль, в котором хранятся middleware, предоставляемые из коробки.
 * Включает middleware для rate limiting, проверки авторизации (authGuard), сквозных request-id (requestId),
 * а также режим "технических работ" (maintenance) и фильтрации по IP (ipFilter).
 *
 * @author Maxim-M <maximco36895@yandex.ru>
 * @packageDocumentation
 * @module middleware
 */
export { rateLimiter, destroyRateLimiter } from './middleware/rateLimiter';
export { authGuard } from './middleware/authGuard';
export type { TAuthCheck, IAuthGuardOptions } from './middleware/authGuard';
export { requestId } from './middleware/requestId';
export { maintenance } from './middleware/maintenance';
export type { TMaintenanceCheck, IMaintenanceOptions } from './middleware/maintenance';
export { ipFilter } from './middleware/ipFilter';
export type { IIpFilterOptions } from './middleware/ipFilter';
