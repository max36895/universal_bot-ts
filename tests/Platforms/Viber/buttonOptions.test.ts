/**
 * Регрессионные тесты Viber-кнопок, собранных вручную (без компонента Buttons).
 *
 * Раньше Viber/Button.ts обращался к button.options.request_contact напрямую:
 * единственный адаптер без защиты (Telegram/VK/Max использовали ?.), из-за чего
 * кнопка { title: 'X' } без options роняла весь getContent() с TypeError →
 * webhook отвечал 5xx → Viber после серии 5xx отключал вебхук.
 */
import { AppContext } from '../../../src';
import { buttonProcessing } from '../../../src/plugins/platforms/Viber/Button';
import type { IButtonType } from '../../../src/components/button';

function createContext(): AppContext {
    const context = new AppContext();
    context.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
    return context;
}

describe('Viber buttonProcessing: кнопка без options', () => {
    it('не падает на кнопке, собранной вручную без options', () => {
        const context = createContext();
        const manualButton = {
            title: 'Просто кнопка',
        } as IButtonType;

        expect(() => buttonProcessing([manualButton], context)).not.toThrow();
    });

    it('собирает reply-кнопку без options корректно', () => {
        const context = createContext();
        const manualButton = { title: 'Продолжить' } as IButtonType;

        const keyboard = buttonProcessing([manualButton], context);

        expect(keyboard).not.toBeNull();
        const buttons = keyboard?.Buttons ?? [];
        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.ActionType).toBe('reply');
        expect(buttons[0]?.ActionBody).toBe('Продолжить');
    });

    it('link-кнопка без options не падает и открывает url', () => {
        const context = createContext();
        const manualButton = {
            title: 'Открыть сайт',
            url: 'https://example.com',
        } as IButtonType;

        const keyboard = buttonProcessing([manualButton], context);

        expect(keyboard).not.toBeNull();
        const buttons = keyboard?.Buttons ?? [];
        expect(buttons[0]?.ActionType).toBe('open-url');
        expect(buttons[0]?.ActionBody).toBe('https://example.com');
    });

    it('request_contact из options по-прежнему работает', () => {
        const context = createContext();
        const button = {
            title: 'Поделиться телефоном',
            options: { request_contact: true },
        } as IButtonType;

        const keyboard = buttonProcessing([button], context);

        const buttons = keyboard?.Buttons ?? [];
        expect(buttons[0]?.ActionType).toBe('share-phone');
    });

    it('options с platform-полями (Columns/TextSize) переносятся как раньше', () => {
        const context = createContext();
        const button = {
            title: 'Стилизованная',
            options: { Columns: 3, TextSize: 'large' },
        } as IButtonType;

        const keyboard = buttonProcessing([button], context);

        const buttons = keyboard?.Buttons ?? [];
        expect(buttons[0]?.Columns).toBe(3);
        expect(buttons[0]?.TextSize).toBe('large');
    });
});
