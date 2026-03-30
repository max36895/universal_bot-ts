import { Bot, BotController, AppContext, IPlatformAdapter } from '../../src';

// Мок-адаптер для тестов
class MockPlatformAdapter {
    platformName: string;
    isPlatformOnQuery: jest.Mock;
    setQueryData: (content: object, controller: BotController) => boolean;
    getContent: jest.Mock;
    getRatingContext: jest.Mock;
    updateTimeStart: jest.Mock;
    getProcessingTime: jest.Mock;
    isLocalStorage: jest.Mock;
    getLocalStorage: jest.Mock;
    setLocalStorage: jest.Mock;
    isVoice: boolean;
    limit: number | null;
    init: (appContext: AppContext) => void;

    constructor(name: string) {
        this.platformName = name;
        this.isPlatformOnQuery = jest.fn();
        this.setQueryData = (content: object, controller: BotController): boolean => {
            controller.userCommand = '';
            controller.originalUserCommand = '';
            controller.userId = '';
            return true;
        };
        this.getContent = jest.fn();
        this.getRatingContext = jest.fn();
        this.updateTimeStart = jest.fn();
        this.getProcessingTime = jest.fn();
        this.isLocalStorage = jest.fn();
        this.getLocalStorage = jest.fn();
        this.setLocalStorage = jest.fn();
        this.isVoice = false;
        this.limit = null;
        this.init = (appContext: AppContext): void => {
            appContext.platforms[name] = this as unknown as IPlatformAdapter;
        };
    }
}

class TestBotController extends BotController {
    action(intentName: string | null): void {
        this.text = `action called with ${intentName}`;
    }
}

describe('Bot.setPlatformResolver', () => {
    let bot: Bot;
    let mockAdapterA: MockPlatformAdapter;
    let mockAdapterB: MockPlatformAdapter;

    beforeEach(() => {
        bot = new Bot();
        bot.setAppConfig({ isLocalStorage: true });
        // Регистрируем мок-адаптеры
        mockAdapterA = new MockPlatformAdapter('platform_a');
        mockAdapterB = new MockPlatformAdapter('platform_b');

        // Имитируем их регистрацию через use
        bot.use(mockAdapterA);
        bot.use(mockAdapterB);

        // Устанавливаем контроллер для выполнения run
        bot.initBotController(TestBotController);

        // По умолчанию адаптеры не определяют платформу
        mockAdapterA.isPlatformOnQuery.mockReturnValue(false);
        mockAdapterB.isPlatformOnQuery.mockReturnValue(false);

        // Мокаем метод setQueryData, чтобы он всегда возвращал true
        mockAdapterA.getContent.mockResolvedValue({ text: 'platform_a' });
        mockAdapterB.getContent.mockResolvedValue({ text: 'platform_b' });
    });

    afterEach(() => {
        jest.clearAllMocks();
        bot.close();
    });

    it('should use custom resolver when set and it returns a string', async () => {
        const resolver = jest.fn().mockReturnValue('platform_a');
        bot.setPlatformResolver(resolver);

        const content = JSON.stringify({ test: 'data' });
        const result = await bot.run(null, content);

        // Резолвер вызван
        expect(resolver).toHaveBeenCalledTimes(1);
        // Адаптеры не опрашивались
        expect(mockAdapterA.isPlatformOnQuery).not.toHaveBeenCalled();
        expect(mockAdapterB.isPlatformOnQuery).not.toHaveBeenCalled();
        // Должен использоваться адаптер platform_a
        expect(mockAdapterA.getContent).toHaveBeenCalled();
        expect(mockAdapterB.getContent).not.toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it('should fallback to standard detection if resolver returns null', async () => {
        const resolver = jest.fn().mockReturnValue(null);
        bot.setPlatformResolver(resolver);

        // Настроим, что adapter_b определяет платформу
        mockAdapterB.isPlatformOnQuery.mockReturnValue(true);

        const content = JSON.stringify({ test: 'data' });
        const result = await bot.run(null, content);

        expect(resolver).toHaveBeenCalledTimes(1);
        // Адаптеры опрашиваются, adapter_b должен сработать
        expect(mockAdapterA.isPlatformOnQuery).toHaveBeenCalled();
        expect(mockAdapterB.isPlatformOnQuery).toHaveBeenCalled();
        expect(mockAdapterB.getContent).toHaveBeenCalled();
        expect(mockAdapterA.getContent).not.toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it('should pass detect function to resolver and it should work', async () => {
        // Настроим, что adapter_a определяет платформу
        mockAdapterA.isPlatformOnQuery.mockReturnValue(true);
        const resolver = jest.fn().mockImplementation((query, headers, detect) => {
            // вызываем detect
            const detected = detect?.(query, headers);
            // если определилась 'platform_a', то изменим на 'platform_b'
            if (detected === 'platform_a') {
                return 'platform_b';
            }
            return detected;
        });
        bot.setPlatformResolver(resolver);

        const content = JSON.stringify({ test: 'data' });
        const result = await bot.run(null, content);

        expect(resolver).toHaveBeenCalledTimes(1);
        // detect должна быть вызвана
        const detectFn = resolver.mock.calls[0][2];
        expect(detectFn).toBeDefined();
        // проверим, что detect действительно возвращает 'platform_a'
        const detected = detectFn?.(JSON.parse(content), undefined);
        expect(detected).toBe('platform_a');
        // итоговое решение резолвера должно быть 'platform_b'
        expect(mockAdapterB.getContent).toHaveBeenCalled();
        expect(mockAdapterA.getContent).not.toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it('should throw error if resolver returns platform name without registered adapter', async () => {
        const resolver = jest.fn().mockReturnValue('nonexistent');
        bot.setPlatformResolver(resolver);
        bot.setLogger({
            error: () => {},
            warn: () => {},
        });

        const content = JSON.stringify({ test: 'data' });
        await expect(bot.run(null, content)).rejects.toThrow(
            /Не удалось определить платформу, от которой пришел запрос. Дальнейшая обработка невозможна./,
        );
    });

    it('should handle errors thrown by resolver gracefully', async () => {
        const resolver = jest.fn().mockImplementation(() => {
            throw new Error('Custom resolver error');
        });
        bot.setPlatformResolver(resolver);

        const content = JSON.stringify({ test: 'data' });
        await expect(bot.run(null, content)).rejects.toThrow('Custom resolver error');
        // Адаптеры не должны вызываться
        expect(mockAdapterA.isPlatformOnQuery).not.toHaveBeenCalled();
        expect(mockAdapterB.isPlatformOnQuery).not.toHaveBeenCalled();
    });
});
