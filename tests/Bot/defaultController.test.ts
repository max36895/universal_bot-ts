/**
 * Регресс-тест на ленивую загрузку дефолтного контроллера.
 *
 * Суть: `Bot` больше не импортирует `BaseBotController` статически в шапке файла —
 * это разрывает runtime-цикл `core/Bot → controller → core`. Дефолтный контроллер
 * подгружается лениво через `require` внутри `#getBotController` в момент вызова
 * конструктора. Этот тест проверяет, что `new Bot()` БЕЗ переданного контроллера
 * корректно резолвит дефолтный `BaseBotController` и тот реально обрабатывает запрос.
 *
 * ВАЖНО: файл намеренно импортирует из корневого `'../../src'` ПЕРВЫМ —
 * именно такой порядок загрузки у реального пользователя.
 */
import { Bot } from '../../src';
import { AlisaAdapter, T_ALISA, IAlisaWebhookResponse } from '../../src/plugins';

function getContent(query: string, count = 0): string {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'test',
            interfaces: { screen: true },
        },
        session: {
            message_id: count,
            session_id: 'local',
            skill_id: 'local_test',
            user_id: 'test',
            new: count === 0,
        },
        request: {
            command: query.toLowerCase(),
            original_utterance: query,
            nlu: {},
            type: 'SimpleUtterance',
        },
        state: { session: {} },
        version: '1.0',
    });
}

describe('Дефолтный контроллер из ленивой загрузки', () => {
    let bot: Bot;

    beforeEach(() => {
        // Намеренно НЕ вызываем initBotController — проверяем дефолт из require
        bot = new Bot();
        bot.setLogger({ error: () => {}, warn: () => {} });
        bot.use(new AlisaAdapter());
    });

    afterEach(() => {
        bot.close();
        bot.clearCommands();
    });

    it('new Bot() без контроллера не бросает "Не определен класс с логикой приложения"', async () => {
        // Если ленивый require в #getBotController сломается, #botControllerClass
        // останется пустым и run() бросит ошибку об отсутствии контроллера.
        bot.setPlatformParams({ empty_text: 'OK' });
        await expect(bot.run(T_ALISA, getContent('привет', 5))).resolves.toBeDefined();
    });

    it('дефолтный контроллер отвечает empty_text на нераспознанный ввод', async () => {
        bot.setPlatformParams({ empty_text: 'DEFAULT_EMPTY' });
        // НЕ регистрируем ни одной команды и НЕ задаём свой контроллер —
        // должен отработать дефолтный BaseBotController из ленивой загрузки.
        const res = (await bot.run(T_ALISA, getContent('абракадабра', 5))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('DEFAULT_EMPTY');
    });

    it('дефолтный контроллер обрабатывает welcome на новой сессии', async () => {
        bot.setPlatformParams({ welcome_text: 'DEFAULT_WELCOME' });
        const res = (await bot.run(T_ALISA, getContent('', 0))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('DEFAULT_WELCOME');
    });

    it('дефолтный контроллер обрабатывает help', async () => {
        bot.setPlatformParams({ help_text: 'DEFAULT_HELP' });
        const res = (await bot.run(T_ALISA, getContent('помощь', 5))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('DEFAULT_HELP');
    });
});
