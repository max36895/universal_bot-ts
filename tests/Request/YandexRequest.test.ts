global.fetch = jest.fn();

import { AppContext } from '../../src';
import { YandexRequest } from '../../src/plugins';

const appContext = new AppContext();
appContext.setLogger({
    error: () => {},
    warn: () => {},
});

describe('YandexRequest', () => {
    let yandex: YandexRequest;

    beforeEach(() => {
        appContext.appConfig.tokens.alisa = { token: 'test-yandex-token' };
        yandex = new YandexRequest(null, appContext);
        (global.fetch as jest.Mock).mockClear();
    });

    afterEach(() => {
        appContext.close();
    });

    it('should set OAuth header correctly', () => {
        expect(yandex.oauth).toBe('test-yandex-token');
    });

    it('should call API with OAuth header', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });

        const result = await yandex.call('https://api.yandex.ru/test');

        expect(result).toEqual({ result: 'ok' });
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.yandex.ru/test',
            expect.objectContaining({}),
        );
    });

    it('should return null on API error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ error: 'Invalid token' }),
        });

        const result = await yandex.call('https://api.yandex.ru/test');
        expect(result).toEqual({ error: 'Invalid token' });
    });
});
