import { AppContext, BotController } from '../../../src';
import { ViberCard } from '../../../src/plugins';

class TestController extends BotController {
    action(): void {
        return;
    }
}

describe('Viber Card', () => {
    it('пропускает локальные файлы вместо создания пустых ячеек', () => {
        const appContext = new AppContext();
        const logWarn = jest.fn();
        appContext.setLogger({ warn: logWarn, error: () => {}, log: () => {} });
        const controller = new TestController(appContext);

        const result = ViberCard.cardProcessing(
            {
                usedGallery: true,
                showOne: false,
                images: [
                    { imageDir: 'C:\\private\\image.jpg', title: 'Локальная' },
                    { imageDir: 'https://example.com/image.jpg', title: 'Публичная' },
                ],
                buttons: controller.buttons,
                title: null,
                description: null,
            },
            controller,
        );

        expect(Array.isArray(result)).toBe(false);
        expect(result).toEqual(expect.objectContaining({ Image: 'https://example.com/image.jpg' }));
        expect(logWarn).toHaveBeenCalledWith(
            expect.stringContaining('Локальные изображения'),
            undefined,
        );
    });

    it('предупреждает при сокращении галереи до шести карточек', () => {
        const appContext = new AppContext();
        const logWarn = jest.fn();
        appContext.setLogger({ warn: logWarn, error: () => {}, log: () => {} });
        const controller = new TestController(appContext);
        const images = Array.from({ length: 7 }, (_, index) => ({
            imageDir: `https://example.com/${index}.jpg`,
        }));

        const result = ViberCard.cardProcessing(
            {
                usedGallery: true,
                showOne: false,
                images,
                buttons: controller.buttons,
                title: null,
                description: null,
            },
            controller,
        );

        expect(result).toHaveLength(6);
        expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('6 карточками'), undefined);
    });

    it('сохраняет заголовок и описание карточки без кнопки', () => {
        // Регрессия: Text заполнялся только в ветке с кнопкой, и карточка
        // с ActionType 'none' молча теряла title/description.
        const appContext = new AppContext();
        appContext.setLogger({ warn: () => {}, error: () => {}, log: () => {} });
        const controller = new TestController(appContext);

        const result = ViberCard.cardProcessing(
            {
                usedGallery: false,
                showOne: false,
                images: [
                    {
                        imageDir: 'https://example.com/image.jpg',
                        title: 'Заголовок',
                        desc: 'Описание',
                    },
                ],
                buttons: controller.buttons,
                title: null,
                description: null,
            },
            controller,
        );

        expect(result).toEqual(
            expect.objectContaining({
                ActionType: 'none',
                Text: expect.stringContaining('Заголовок'),
            }),
        );
        expect((result as { Text: string }).Text).toContain('Описание');
    });

    it('не добавляет пустой Text карточке без кнопки и без текста', () => {
        const appContext = new AppContext();
        appContext.setLogger({ warn: () => {}, error: () => {}, log: () => {} });
        const controller = new TestController(appContext);

        const result = ViberCard.cardProcessing(
            {
                usedGallery: false,
                showOne: false,
                images: [{ imageDir: 'https://example.com/image.jpg' }],
                buttons: controller.buttons,
                title: null,
                description: null,
            },
            controller,
        );

        expect(result).toEqual(expect.objectContaining({ ActionType: 'none' }));
        expect((result as { Text?: string }).Text).toBeUndefined();
    });
});
