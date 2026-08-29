global.fetch = jest.fn();

import { AppContext } from '../../src';
import { TelegramRequest } from '../../src/plugins';

describe('TelegramRequest file_id', () => {
    it('передаёт Telegram file_id строковым параметром без проверки файловой системы', async () => {
        const appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens.telegram = { token: 'test-token' };
        const telegram = new TelegramRequest(appContext);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: { message_id: 1 } }),
        });

        await telegram.sendPhoto(123, 'AgACAgIAAxkBAAIBQ2_file_id_without_extension');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const options = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
        expect(options.body).toBe(
            JSON.stringify({ photo: 'AgACAgIAAxkBAAIBQ2_file_id_without_extension', chat_id: 123 }),
        );
    });
});
