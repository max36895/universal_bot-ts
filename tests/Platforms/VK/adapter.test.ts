import { AppContext, BotController } from '../../../src';
import { T_VK, VkAdapter, VkRequest } from '../../../src/plugins';

class TestVkController extends BotController {
    action(): void {
        return;
    }
}

describe('VkAdapter', () => {
    let appContext: AppContext;
    let controller: TestVkController;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens[T_VK] = { token: 'test-token' };
        controller = new TestVkController(appContext);
        controller.userId = 12345;
        controller.text = 'Карточка';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('keeps carousel template when global buttons are also initialized', async () => {
        const sendMessage = jest
            .spyOn(VkRequest.prototype, 'messagesSend')
            .mockResolvedValue({ message_id: 1 });

        controller.buttons.addBtn('Глобальная кнопка');
        controller.card.addImage('photo1_1', 'Первая', 'Описание', 'Открыть');
        controller.card.addImage('photo1_2', 'Вторая', 'Описание', 'Открыть');

        const adapter = new VkAdapter();
        adapter.init(appContext);

        await adapter.getContent(controller);

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage).toHaveBeenCalledWith(
            12345,
            'Карточка',
            expect.objectContaining({
                template: expect.objectContaining({
                    type: 'carousel',
                }),
            }),
        );
        expect(sendMessage.mock.calls[0][2]?.keyboard).toBeUndefined();
    });

    describe('isCorrectQuery', () => {
        it('returns true when secret_key is not configured', () => {
            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = adapter.isCorrectQuery({
                type: 'message_new',
                group_id: '1',
                secret: 'some-secret',
            });

            expect(result).toBe(true);
        });

        it('returns true when query.secret matches configured secret_key', () => {
            appContext.appConfig.tokens[T_VK]!.secret_key = 'my-secret';
            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = adapter.isCorrectQuery({
                type: 'message_new',
                group_id: '1',
                secret: 'my-secret',
            });

            expect(result).toBe(true);
        });

        it('returns false when query.secret does not match configured secret_key', () => {
            appContext.appConfig.tokens[T_VK]!.secret_key = 'my-secret';
            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = adapter.isCorrectQuery({
                type: 'message_new',
                group_id: '1',
                secret: 'wrong-secret',
            });

            expect(result).toBe(false);
        });

        it('validates the raw JSON body passed by the HTTP webhook handler', () => {
            appContext.appConfig.tokens[T_VK]!.secret_key = 'my-secret';
            const adapter = new VkAdapter();
            adapter.init(appContext);

            expect(
                adapter.isCorrectQuery(
                    JSON.stringify({ type: 'message_new', group_id: '1', secret: 'my-secret' }),
                ),
            ).toBe(true);
            expect(adapter.isCorrectQuery('{invalid-json')).toBe(false);
        });

        it('returns true when query has no secret field but secret_key is configured (confirmation event)', () => {
            appContext.appConfig.tokens[T_VK]!.secret_key = 'my-secret';
            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = adapter.isCorrectQuery({
                type: 'confirmation',
                group_id: '1',
            });

            expect(result).toBe(true);
        });

        it('rejects a non-confirmation callback without configured secret in the body', () => {
            appContext.appConfig.tokens[T_VK]!.secret_key = 'my-secret';
            const adapter = new VkAdapter();
            adapter.init(appContext);

            expect(
                adapter.isCorrectQuery({
                    type: 'message_new',
                    group_id: '1',
                    object: { message: { from_id: 1, peer_id: 1, id: 1, text: 'hi' } },
                }),
            ).toBe(false);
        });
    });

    describe('getContent with message_event', () => {
        it('sends sendMessageEvent with show_snackbar when platformOptions.error is set', async () => {
            const sendMessageEvent = jest
                .spyOn(VkRequest.prototype, 'sendMessageEvent')
                .mockResolvedValue({});
            const sendMessage = jest
                .spyOn(VkRequest.prototype, 'messagesSend')
                .mockResolvedValue({ message_id: 1 });

            controller.platformOptions.eventId = 'event-123';
            controller.platformOptions.error = 'Произошла ошибка обработки';

            const adapter = new VkAdapter();
            adapter.init(appContext);

            await adapter.getContent(controller);

            expect(sendMessageEvent).toHaveBeenCalledTimes(1);
            expect(sendMessageEvent).toHaveBeenCalledWith(
                12345,
                'event-123',
                expect.objectContaining({
                    type: 'show_snackbar',
                    text: 'Произошла ошибка обработки',
                }),
                12345,
            );
            expect(sendMessage).not.toHaveBeenCalled();
        });

        it('sends simple sendMessageEvent when no error', async () => {
            const sendMessageEvent = jest
                .spyOn(VkRequest.prototype, 'sendMessageEvent')
                .mockResolvedValue({});
            const sendMessage = jest
                .spyOn(VkRequest.prototype, 'messagesSend')
                .mockResolvedValue({ message_id: 1 });

            controller.platformOptions.eventId = 'event-456';
            controller.text = 'Успешный ответ';

            const adapter = new VkAdapter();
            adapter.init(appContext);

            await adapter.getContent(controller);

            expect(sendMessageEvent).toHaveBeenCalledTimes(1);
            expect(sendMessageEvent).toHaveBeenCalledWith(12345, 'event-456', undefined, 12345);
            expect(sendMessage).toHaveBeenCalledTimes(1);
            expect(sendMessage).toHaveBeenCalledWith(12345, 'Успешный ответ', expect.any(Object));
        });
    });

    describe('setQueryData', () => {
        it('заполняет имя пользователя из массива users.get', async () => {
            // users.get всегда возвращает массив — адаптер должен взять первый элемент
            const usersGet = jest.spyOn(VkRequest.prototype, 'usersGet').mockResolvedValue([
                {
                    id: 12345,
                    first_name: 'Иван',
                    last_name: 'Петров',
                    is_closed: false,
                    can_access_closed: true,
                },
            ]);

            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = await adapter.setQueryData(
                {
                    type: 'message_new',
                    group_id: '1',
                    object: { message: { from_id: 12345, peer_id: 12345, id: 1, text: 'привет' } },
                },
                controller,
            );

            expect(result).toBe(true);
            expect(usersGet).toHaveBeenCalledWith(12345);
            const thisUser = controller.nlu.getUserName();
            expect(thisUser?.first_name).toBe('Иван');
            expect(thisUser?.last_name).toBe('Петров');
        });

        it('не падает при пустом ответе users.get', async () => {
            jest.spyOn(VkRequest.prototype, 'usersGet').mockResolvedValue([]);

            const adapter = new VkAdapter();
            adapter.init(appContext);

            const result = await adapter.setQueryData(
                {
                    type: 'message_new',
                    group_id: '1',
                    object: { message: { from_id: 12345, peer_id: 12345, id: 1, text: 'привет' } },
                },
                controller,
            );

            expect(result).toBe(true);
            expect(controller.nlu.getUserName()).toBeNull();
        });
    });

    describe('init', () => {
        it('stores vk_secret_key from platform options into tokens', () => {
            const adapter = new VkAdapter('test-token', {
                vk_secret_key: 'my-secret',
            });
            adapter.init(appContext);

            expect(appContext.appConfig.tokens[T_VK]?.secret_key).toBe('my-secret');
        });

        it('does not set secret_key when not provided', () => {
            const adapter = new VkAdapter('test-token');
            adapter.init(appContext);

            expect(appContext.appConfig.tokens[T_VK]?.secret_key).toBeUndefined();
        });
    });
});
