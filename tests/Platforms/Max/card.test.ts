import { BotController } from '../../../src';
import { T_MAX_APP, MaxCard, MaxRequest } from '../../../src/plugins';

class TestController extends BotController {
    action(): void {
        return;
    }
}

describe('Max Card', () => {
    let controller: TestController;

    beforeEach(() => {
        const appContext = new (jest.requireActual('../../../src').AppContext)();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens[T_MAX_APP] = { token: 'test-max-token' };
        controller = new TestController(appContext);
        controller.userId = 12345;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('cardProcessing', () => {
        it('возвращает null для пустого массива изображений', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: false,
                    images: [],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );
            expect(result).toBeNull();
        });

        it('возвращает одну карточку для одного изображения с imageToken (url)', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: false,
                    images: [{ imageToken: 'https://example.com/img.jpg', desc: 'Фото' }],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            expect(result![0]).toEqual({
                type: 'image',
                payload: { url: 'https://example.com/img.jpg' },
            });
        });

        it('возвращает одну карточку для одного изображения с imageToken (токен)', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: false,
                    images: [{ imageToken: 'local_token_123', desc: 'Фото' }],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).not.toBeNull();
            expect(result![0]).toEqual({
                type: 'image',
                payload: { token: 'local_token_123' },
            });
        });

        it('возвращает null для одного изображения если imageDir не дал imageToken', async () => {
            jest.spyOn(MaxRequest.prototype, 'upload').mockResolvedValue(null);

            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: false,
                    images: [{ imageDir: '/local/path/img.jpg', desc: 'Локальное' }],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).toBeNull();
        });

        it('возвращает массив карточек для нескольких изображений (галерея)', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: true,
                    images: [
                        { imageToken: 'token_1', desc: 'Фото 1' },
                        { imageToken: 'https://example.com/2.jpg', desc: 'Фото 2' },
                        { imageToken: 'token_3', desc: 'Фото 3' },
                    ],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).not.toBeNull();
            expect(result).toHaveLength(3);
            expect(result![0]).toEqual({ type: 'image', payload: { token: 'token_1' } });
            expect(result![1]).toEqual({
                type: 'image',
                payload: { url: 'https://example.com/2.jpg' },
            });
            expect(result![2]).toEqual({ type: 'image', payload: { token: 'token_3' } });
        });

        it('ограничивает количество элементов до 12', async () => {
            const images = Array.from({ length: 15 }, (_, i) => ({
                imageToken: `token_${i}`,
                desc: `Фото ${i + 1}`,
            }));

            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: true,
                    images,
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).not.toBeNull();
            expect(result).toHaveLength(12);
        });

        it('пропускает изображения без imageToken в галерее', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: true,
                    images: [
                        { imageDir: '/local/1.jpg', desc: '1' },
                        { imageToken: 'remote_2', desc: '2' },
                    ],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            // Только одно изображение с токеном должно попасть в результат
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            expect(result![0]).toEqual({ type: 'image', payload: { token: 'remote_2' } });
        });

        it('возвращает null если ни одно изображение не содержит токен', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: true,
                    images: [
                        // Без imageToken и imageDir
                        {} as { imageToken?: string; imageDir?: string; desc: string },
                        {} as { imageToken?: string; imageDir?: string; desc: string },
                    ],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                },
                controller,
            );

            expect(result).toBeNull();
        });

        it('showOne=true обрабатывает одно изображение как одиночную карточку', async () => {
            const result = await MaxCard.cardProcessing(
                {
                    usedGallery: false,
                    images: [{ imageToken: 'single_token', desc: 'Одно' }],
                    buttons: controller.buttons,
                    title: null,
                    description: null,
                    showOne: true,
                },
                controller,
            );

            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            expect(result![0]).toEqual({ type: 'image', payload: { token: 'single_token' } });
        });
    });
});
