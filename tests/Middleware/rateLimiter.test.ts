import { rateLimiter } from '../../src/middleware/rateLimiter';
import { BaseBotController } from '../../src';
import { T_TELEGRAM, TelegramAdapter } from '../../src/plugins';

describe('rateLimiter middleware', () => {
    let ctx: BaseBotController;
    let next: jest.Mock;

    beforeEach(() => {
        ctx = new BaseBotController();
        new TelegramAdapter().init(ctx.appContext);
        // Эмулируем ограничение в 2 запроса в минуту
        ctx.appContext.platforms[T_TELEGRAM].limit = 2;
        ctx.appType = T_TELEGRAM;
        ctx.userId = 'user123';
        next = jest.fn().mockResolvedValue(undefined);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should allow requests under limit', async () => {
        const middleware = rateLimiter();
        const promise1 = middleware(ctx, next);
        const promise2 = middleware(ctx, next);

        await Promise.all([promise1, promise2]);

        expect(next).toHaveBeenCalledTimes(2);
    });

    it('should queue requests when limit exceeded', async () => {
        const middleware = rateLimiter(2);
        // Первые два пройдут сразу
        await middleware(ctx, next);
        await middleware(ctx, next);
        // Третий должен встать в очередь
        const third = middleware(ctx, next);
        // Убедимся, что next ещё не вызван
        expect(next).toHaveBeenCalledTimes(2);
        // Продвигаем время на 1 секунду, чтобы сбросился счётчик
        jest.advanceTimersByTime(1000);
        // Даём возможность очереди обработаться
        await third;
        expect(next).toHaveBeenCalledTimes(3);
    });

    it('should throw error when queue size exceeded', async () => {
        const middleware = rateLimiter(2); // макс очередь 2
        // Заполняем лимит (2 запроса)
        await middleware(ctx, next);
        await middleware(ctx, next);
        // Добавляем 3 в очередь (2 поместятся)
        const p1 = middleware(ctx, next);
        const p2 = middleware(ctx, next);
        // Третий должен выбросить ошибку
        const p3 = middleware(ctx, next);

        await expect(p3).rejects.toThrow('rateLimit - Превышено ограничение на размер очереди');
        // Проверяем, что p1 и p2 выполнятся после таймера
        jest.advanceTimersByTime(1000);
        await Promise.all([p1, p2]);
        expect(next).toHaveBeenCalledTimes(4); // два первых + два из очереди
    });

    it('should handle multiple users separately', async () => {
        const middleware = rateLimiter();
        const ctx2 = new BaseBotController();
        ctx2.appType = T_TELEGRAM;
        ctx2.userId = 'user456';

        // Для первого юзера превышаем лимит
        await middleware(ctx, next); // 1
        await middleware(ctx, next); // 2
        const third = middleware(ctx, next); // в очередь

        // Для второго юзера должно работать независимо
        await middleware(ctx2, next); // 1
        await middleware(ctx2, next); // 2
        expect(next).toHaveBeenCalledTimes(4); // первые два от каждого юзера

        jest.advanceTimersByTime(1000);
        await third;
        expect(next).toHaveBeenCalledTimes(5);
    });
});
