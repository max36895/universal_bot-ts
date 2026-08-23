import { AppContext } from '../../../src';
import { TelegramButton } from '../../../src/plugins';

describe('Telegram Button', () => {
    let appContext: AppContext;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens.telegram = {
            token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        };
    });

    describe('buttonProcessing', () => {
        it('создаёт inline-кнопку с url', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Сайт', url: 'https://example.com' }],
                appContext,
            );

            expect(result).toEqual({
                inline_keyboard: [[{ text: 'Сайт', url: 'https://example.com' }]],
            });
        });

        it('создаёт inline-кнопку с callback_data', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Купить', payload: 'buy_item' }],
                appContext,
            );

            expect(result).toEqual({
                inline_keyboard: [[{ text: 'Купить', callback_data: 'buy_item' }]],
            });
        });

        it('создаёт inline-кнопку с JSON payload', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Действие', payload: { action: 'open', id: 5 } }],
                appContext,
            );

            expect(result).toEqual({
                inline_keyboard: [
                    [{ text: 'Действие', callback_data: '{"action":"open","id":5}' }],
                ],
            });
        });

        it('создаёт reply-кнопки', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Кнопка 1' }, { title: 'Кнопка 2' }],
                appContext,
            );

            expect(result).toEqual({
                keyboard: [[{ text: 'Кнопка 1' }], [{ text: 'Кнопка 2' }]],
                resize_keyboard: true,
            });
        });

        it('создаёт reply-кнопку с request_contact', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Поделиться номером', options: { request_contact: true } }],
                appContext,
            );

            expect(result).toEqual({
                keyboard: [[{ text: 'Поделиться номером', request_contact: true }]],
                resize_keyboard: true,
            });
        });

        it('создаёт reply-кнопку с request_location', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Поделиться гео', options: { request_location: true } }],
                appContext,
            );

            expect(result).toEqual({
                keyboard: [[{ text: 'Поделиться гео', request_location: true }]],
                resize_keyboard: true,
            });
        });

        it('возвращает remove_keyboard при отсутствии кнопок', () => {
            const result = TelegramButton.buttonProcessing([], appContext);

            expect(result).toEqual({ remove_keyboard: true });
        });

        it('обрезает количество кнопок до 40', () => {
            const manyButtons = Array.from({ length: 50 }, (_, i) => ({
                title: `Кнопка ${i + 1}`,
            }));

            const result = TelegramButton.buttonProcessing(manyButtons, appContext);

            expect(result?.keyboard?.length).toBe(40);
        });

        it('пропускает callback-кнопку длиннее 64 байт без изменения payload', () => {
            const longPayload = 'a'.repeat(100);
            const logWarn = jest.spyOn(appContext, 'logWarn').mockImplementation(() => {});

            const result = TelegramButton.buttonProcessing(
                [{ title: 'Длинный', payload: longPayload }],
                appContext,
            );

            expect(result).toEqual({ remove_keyboard: true });
            expect(logWarn).toHaveBeenCalledWith(
                expect.stringContaining('превышает лимит 64 байт'),
            );
        });

        it('не создаёт изменённый callback_data при многобайтном превышении', () => {
            const result = TelegramButton.buttonProcessing(
                [{ title: 'Действие', payload: `${'a'.repeat(63)}😀` }],
                appContext,
            );
            expect(result).toEqual({ remove_keyboard: true });
        });

        it('не создаёт клавиатуру при пустом массиве кнопок', () => {
            const result = TelegramButton.buttonProcessing([], appContext);

            expect(result).toEqual({ remove_keyboard: true });
        });
    });
});
