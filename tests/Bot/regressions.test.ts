/**
 * Регрессионные тесты: контракты платформ и поведение ядра.
 */
global.fetch = jest.fn();

import { Bot, BotController, AppContext, Card, ImageTokens } from '../../src';
import {
    FileAdapter,
    TelegramAdapter,
    ViberAdapter,
    MaxButton,
    VkSound,
    IViberContent,
} from '../../src/plugins';
import { Preload } from '../../src/Preload';
import { createTestDir, removeTestDir } from '../helpers/tmpDir';

const silentLogger = { error: (): void => {}, warn: (): void => {}, log: (): void => {} };

class EchoController extends BotController {
    action(): void {
        return;
    }
}

function tgUpdate(text: string, id: number): object {
    return {
        update_id: id,
        message: {
            message_id: id,
            from: { id: 42, is_bot: false, first_name: 'U', username: 'u' },
            chat: { id: 42, first_name: 'U', username: 'u', type: 'private' },
            date: 1700000000,
            text,
        },
    };
}

/** Текст, отправленный последним вызовом sendMessage Telegram. */
function lastTelegramText(): string | undefined {
    const calls = (global.fetch as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes('/sendMessage'),
    );
    const body = calls[calls.length - 1]?.[1]?.body as string | undefined;
    return body ? (JSON.parse(body) as { text?: string }).text : undefined;
}

describe('isLocalStorage: true на чат-платформе с БД (шаги диалога)', () => {
    let dir: string;
    let bot: Bot;

    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });
        dir = createTestDir('review-localstorage');
        bot = new Bot('telegram');
        bot.setLogger(silentLogger);
        bot.initBotController(EchoController);
        bot.use(new TelegramAdapter('tg-token'));
        bot.use(new FileAdapter());
        // Значение, которое flow-редактор выставляет по умолчанию. Telegram
        // localStorage не поддерживает — источником userData обязана быть БД.
        bot.setAppConfig({ isLocalStorage: true, json: dir, error_log: dir });
        bot.addCommand('start', ['начать'], (_t, ctx) => {
            ctx.text = 'Как тебя зовут?';
            ctx.thisIntentName = 'ask_name';
        });
        bot.addStep('ask_name', (ctx) => {
            ctx.text = `Приятно познакомиться, ${ctx.originalUserCommand}!`;
        });
        bot.addCommand('*', [], (_t, ctx) => {
            ctx.text = 'fallback';
        });
    });

    afterEach(async () => {
        await bot.close();
        await removeTestDir(dir);
    });

    it('шаг, записанный в первом запросе, срабатывает на следующем', async () => {
        await bot.run('telegram', tgUpdate('начать', 1));
        expect(lastTelegramText()).toBe('Как тебя зовут?');
        // oldIntentName должен прочитаться из БД, иначе ответ уйдёт в fallback.
        await bot.run('telegram', tgUpdate('Иван', 2));
        expect(lastTelegramText()).toBe('Приятно познакомиться, Иван!');
        await bot.run('telegram', tgUpdate('абракадабра', 3));
        expect(lastTelegramText()).toBe('fallback');
    });
});

describe('BotController: async-шаг и исключения', () => {
    let bot: Bot;

    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });
        bot = new Bot('telegram');
        bot.setLogger(silentLogger);
        bot.use(new TelegramAdapter('tg-token'));
    });

    afterEach(async () => {
        await bot.close();
    });

    it('async-шаг, вернувший false, передаёт управление командам (как sync false)', async () => {
        class StepController extends BotController {
            action(): void {
                return;
            }
        }
        bot.initBotController(StepController);
        bot.addStep('stale', async () => false);
        bot.addCommand('buy', ['купить'], (_t, ctx) => {
            ctx.text = 'Покупаем';
        });
        // Контроллер «помнит» устаревший шаг (как после восстановления из БД).
        bot.use(async (ctx, next) => {
            ctx.oldIntentName = 'stale';
            await next();
        });
        await bot.run('telegram', tgUpdate('купить', 10));
        // Promise<false> от шага передаёт управление командам, как синхронный false.
        expect(lastTelegramText()).toBe('Покупаем');
    });

    it('синхронное исключение из action() не превращается в 500', async () => {
        class ThrowingController extends BotController {
            action(): void {
                throw new Error('bug in user code');
            }
        }
        bot.initBotController(ThrowingController);
        bot.addCommand('hi', ['привет'], () => {});
        // run() не должен отклоняться: webhook ответил бы 500.
        await expect(bot.run('telegram', tgUpdate('привет', 11))).resolves.toBeDefined();
        expect(lastTelegramText()).toBe('Не удалось выполнить команду. Попробуйте ещё раз.');
    });

    it('исключение customCommandResolver ведёт в fallback, а не в 500', async () => {
        bot.initBotController(EchoController);
        bot.setCustomCommandResolver(() => {
            throw new Error('resolver down');
        });
        bot.addCommand('*', [], (_t, ctx) => {
            ctx.text = 'fallback';
        });
        await expect(bot.run('telegram', tgUpdate('что-то', 12))).resolves.toBeDefined();
        expect(lastTelegramText()).toBe('fallback');
    });
});

describe('Viber: приветствие на conversation_started', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: 0 }),
        });
    });

    it('возвращается телом webhook-ответа, без REST send_message', async () => {
        const bot = new Bot('viber');
        bot.setLogger(silentLogger);
        bot.initBotController(EchoController);
        bot.use(new ViberAdapter('viber-token', { viber_sender: 'Бот' }));
        bot.addCommand('*', [], (_t, ctx) => {
            ctx.text = 'Добро пожаловать!';
            ctx.buttons.addBtn('Начать');
        });
        const query = {
            event: 'conversation_started',
            timestamp: Date.now(),
            user: { id: 'u-1', name: 'Иван Петров', api_version: 8 },
            subscribed: false,
        } as unknown as IViberContent;

        const result = (await bot.run('viber', query)) as Record<string, unknown>;
        await bot.close();

        // Неподписанному пользователю send_message Viber отклоняет, поэтому
        // приветствие уходит телом webhook-ответа, а не REST-вызовом.
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toEqual(
            expect.objectContaining({
                type: 'text',
                text: 'Добро пожаловать!',
                sender: { name: 'Бот' },
                min_api_version: expect.any(Number),
                keyboard: expect.objectContaining({ Type: 'keyboard' }),
            }),
        );
        expect(result.receiver).toBeUndefined();
    });
});

describe('Telegram: inline-ответ при заполненном только tts', () => {
    it('в answerInlineQuery уходит tts-текст, а не пустой результат', async () => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: true }),
        });
        const bot = new Bot('telegram');
        bot.setLogger(silentLogger);
        bot.initBotController(EchoController);
        bot.use(new TelegramAdapter('tg-token'));
        bot.addCommand('*', [], (_t, ctx) => {
            ctx.tts = 'Ответ голосом';
        });
        await bot.run('telegram', {
            update_id: 5,
            inline_query: { id: 'iq-1', from: { id: 42, is_bot: false }, query: 'x', offset: '' },
        });
        await bot.close();
        const call = (global.fetch as jest.Mock).mock.calls.find((c) =>
            String(c[0]).includes('answerInlineQuery'),
        );
        expect(String(call?.[1]?.body)).toContain('Ответ голосом');
    });
});

describe('Мелкие контракты и утечки состояния', () => {
    it('Card.clear() сбрасывает и кнопки карточки', () => {
        const card = new Card(new AppContext());
        card.button.addBtn('Кнопка карточки');
        card.clear();
        expect(card.button.buttons).toHaveLength(0);
    });

    it('MAX: link-кнопка не несёт payload (он документирован только у callback)', () => {
        const res = MaxButton.buttonProcessing([
            {
                title: 'Купить',
                url: 'https://example.com',
                payload: 'buy',
                options: {},
            } as never,
        ]);
        expect(res.buttons[0]?.[0]).toEqual({
            type: 'link',
            text: 'Купить',
            url: 'https://example.com',
        });
    });

    it('VK: attachment строится из вложенного объекта ответа docs.save', () => {
        expect(
            VkSound.getVkDocAttachment({
                type: 'audio_message',
                audio_message: { id: 5, owner_id: -7 },
            } as never),
        ).toBe('doc-7_5');
        expect(
            VkSound.getVkDocAttachment({ type: 'doc', doc: { id: 1, owner_id: 2 } } as never),
        ).toBe('doc2_1');
        expect(VkSound.getVkDocAttachment({ type: 'doc' } as never)).toBeNull();
    });
});

describe('Preload.removeImages', () => {
    it('находит запись по path+platform и удаляет её после ответа API (Маруся)', async () => {
        const context = new AppContext();
        context.setLogger(silentLogger);
        const whereOne = jest
            .spyOn(ImageTokens.prototype, 'whereOne')
            .mockImplementation(async function (this: ImageTokens) {
                this.imageToken = 'img-token';
                return true;
            });
        const remove = jest.spyOn(ImageTokens.prototype, 'remove').mockResolvedValue(true);
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ response: 1 }),
        });
        context.appConfig.tokens.marusia = { token: 'marusia-token' } as never;

        const preload = new Preload(context);
        const results = await Promise.all(preload.removeImages(['./a.png'], ['marusia']));

        expect(results).toEqual([true]);
        // Запись ищется по path + platform — полям, которые реально есть в модели.
        expect(whereOne).toHaveBeenCalledWith({ path: './a.png', platform: 'marusia' });
        expect(remove).toHaveBeenCalled();
        whereOne.mockRestore();
        remove.mockRestore();
    });
});

describe('Preload: skill_id Алисы', () => {
    it('без alisaSkillId Алиса пропускается с предупреждением', () => {
        const context = new AppContext();
        const warns: string[] = [];
        context.setLogger({ ...silentLogger, warn: (m: string) => warns.push(String(m)) });
        context.appConfig.tokens.alisa = { token: 'oauth' } as never;

        const preload = new Preload(context);
        expect(preload.loadImages(['./a.png'], ['alisa'])).toHaveLength(0);
        expect(preload.removeImages(['./a.png'], ['alisa'])).toHaveLength(0);
        expect(warns.some((w) => w.includes('alisaSkillId'))).toBe(true);
    });

    it('удаление изображения Алисы адресуется по переданному навыку', async () => {
        const context = new AppContext();
        context.setLogger(silentLogger);
        context.appConfig.tokens.alisa = { token: 'oauth' } as never;
        const whereOne = jest
            .spyOn(ImageTokens.prototype, 'whereOne')
            .mockImplementation(async function (this: ImageTokens) {
                this.imageToken = 'img-1';
                return true;
            });
        const remove = jest.spyOn(ImageTokens.prototype, 'remove').mockResolvedValue(true);
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });

        const preload = new Preload(context);
        const results = await Promise.all(
            preload.removeImages(['./a.png'], ['alisa'], { alisaSkillId: 'skill-42' }),
        );

        expect(results).toEqual([true]);
        const url = String((global.fetch as jest.Mock).mock.calls[0]?.[0]);
        // Без skill_id запрос к Алисе не отправить.
        expect(url).toContain('skills/skill-42/images/img-1');
        expect(remove).toHaveBeenCalled();
        whereOne.mockRestore();
        remove.mockRestore();
    });
});

describe('Контракты кнопок MAX по схеме SDK', () => {
    it('quick/contact_id/intent выставляются только своим типам кнопок', () => {
        const res = MaxButton.buttonProcessing([
            {
                title: 'Текст',
                options: { quick: true, contact_id: 5, intent: 'positive' },
            } as never,
            { title: 'Купить', payload: 'buy', options: { intent: 'positive' } } as never,
            { title: 'Где я', options: { request_location: true, quick: true } } as never,
            { title: 'Апп', options: { web_app: 'app', contact_id: 7, quick: true } } as never,
        ]);
        const [message, callback, geo, app] = res.buttons.map((row) => row[0]);
        expect(message).toEqual({ type: 'message', text: 'Текст' });
        expect(callback).toEqual({
            type: 'callback',
            text: 'Купить',
            payload: 'buy',
            intent: 'positive',
        });
        expect(geo).toEqual({ type: 'request_geo_location', text: 'Где я', quick: true });
        expect(app).toEqual({ type: 'open_app', text: 'Апп', web_app: 'app', contact_id: 7 });
    });
});

describe('Команды из одних RegExp без isPattern', () => {
    let bot: Bot;

    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });
        bot = new Bot('telegram');
        bot.setLogger(silentLogger);
        bot.initBotController(EchoController);
        bot.use(new TelegramAdapter('tg-token'));
        bot.addCommand('*', [], (_t, ctx) => {
            ctx.text = 'fallback';
        });
    });

    afterEach(async () => {
        await bot.close();
    });

    it('сохраняют собственные флаги слотов, а не получают ium при склейке', async () => {
        // Без флага m «^» означает начало всего текста: «ну\nда» не должно
        // совпасть с /^да$/. Склейка с 'ium' молча включала бы многострочный режим.
        bot.addCommand('yes-no', [/^да$/, /^нет$/], (_t, ctx) => {
            ctx.text = 'ответ';
        });
        await bot.run('telegram', tgUpdate('ну\nда', 30));
        expect(lastTelegramText()).toBe('fallback');
        await bot.run('telegram', tgUpdate('нет', 31));
        expect(lastTelegramText()).toBe('ответ');
    });

    it('с одинаковыми флагами склеиваются в одно выражение с этими же флагами', () => {
        bot.addCommand('yes-no', [/^да$/s, /^нет$/s], () => {});
        const command = bot.getAppContext().commands.get('yes-no');
        expect(command?.regExp).toBeInstanceOf(RegExp);
        expect(command?.regExp?.flags).toBe('s');
    });

    it('с разными флагами проверяются по отдельности', async () => {
        bot.addCommand('mixed', [/^да$/i, /^нет$/], (_t, ctx) => {
            ctx.text = 'ответ';
        });
        expect(bot.getAppContext().commands.get('mixed')?.regExp).toBeUndefined();
        await bot.run('telegram', tgUpdate('нет', 32));
        expect(lastTelegramText()).toBe('ответ');
        await bot.run('telegram', tgUpdate('ну\nнет', 33));
        expect(lastTelegramText()).toBe('fallback');
    });
});

describe('Служебные апдейты Telegram не запускают бизнес-логику', () => {
    let bot: Bot;

    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });
        bot = new Bot('telegram');
        bot.setLogger(silentLogger);
        bot.initBotController(EchoController);
        bot.use(new TelegramAdapter('tg-token'));
    });

    afterEach(async () => {
        await bot.close();
    });

    it('my_chat_member подтверждается без fallback и middleware', async () => {
        const fallback = jest.fn();
        const middleware = jest.fn(async (_ctx: BotController, next: () => Promise<void>) => {
            await next();
        });
        bot.use(middleware);
        bot.addCommand('*', [], fallback);

        const result = await bot.run('telegram', {
            update_id: 40,
            my_chat_member: { chat: { id: 1 }, from: { id: 1 } },
        });

        expect(result).toBe('ok');
        expect(fallback).not.toHaveBeenCalled();
        expect(middleware).not.toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
