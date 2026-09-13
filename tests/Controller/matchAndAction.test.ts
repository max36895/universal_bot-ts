import { AppContext, BotController } from '../../src';

class TestController extends BotController {
    action(): void {
        return;
    }
}

function createContext(): AppContext {
    const context = new AppContext();
    context.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
    return context;
}

describe('controller.match: группы регулярных выражений в обработчике команды', () => {
    it('одиночный RegExp-слот: match содержит группы совпадения', () => {
        const context = createContext();
        let captured: RegExpExecArray | null | undefined;
        context.command.addCommand('order', [/(?:заказ|купить)\s+(\d+)/u] as never, (_t, ctx) => {
            captured = ctx.match;
            ctx.text = 'ок';
        });
        const controller = new TestController(context);
        controller.userCommand = 'заказ 5';
        controller.run();
        expect(controller.text).toBe('ок');
        expect(captured).not.toBeNull();
        expect(captured?.[1]).toBe('5');
    });

    it('isPattern-строка: match заполняется по скомпилированной регулярке', () => {
        const context = createContext();
        let captured: RegExpExecArray | null | undefined;
        // \b в JS не работает с кириллицей (word boundary определён по [A-Za-z0-9_]),
        // поэтому границы задаём lookaround-ами от кириллицы.
        context.command.addCommand(
            'num',
            ['(?<![0-9])(\\d{2})(?![0-9])'],
            (_t, ctx) => {
                captured = ctx.match;
            },
            true,
        );
        const controller = new TestController(context);
        controller.userCommand = 'код 42 готово';
        controller.run();
        expect(captured?.[1]).toBe('42');
    });

    it('строковая команда не заполняет match (null)', () => {
        const context = createContext();
        context.command.addCommand('hi', ['привет'], (_t, ctx) => {
            expect(ctx.match).toBeNull();
            ctx.text = 'привет!';
        });
        const controller = new TestController(context);
        controller.userCommand = 'привет';
        controller.run();
        expect(controller.text).toBe('привет!');
    });

    it('match сбрасывается между запросами (clearStoreData)', () => {
        const controller = new TestController(createContext());
        controller.match = /(x)/.exec('x');
        controller.clearStoreData();
        expect(controller.match).toBeNull();
    });

    it('группа регулярок (много команд): match — от индивидуальной регулярки', () => {
        const context = createContext();
        // Регистрируем 30+ isPattern-команд, чтобы активировать группировку регулярок.
        let captured: RegExpExecArray | null | undefined;
        for (let i = 0; i < 30; i++) {
            context.command.addCommand(
                `cmd${i}`,
                [`zz_cmd_${i}_(\\d+)`],
                (_t, ctx) => {
                    captured = ctx.match;
                },
                true,
            );
        }
        const controller = new TestController(context);
        controller.userCommand = 'zz_cmd_15_77';
        controller.run();
        // Индивидуальная регулярка zz_cmd_15_(\d+) — группа [1] = '77',
        // а не именованные подгруппы объединённого паттерна.
        expect(captured?.[1]).toBe('77');
    });

    it('строковый isPattern-слот: match работает, регулярка кэшируется', () => {
        const context = createContext();
        let captured1: RegExpExecArray | null | undefined;
        let captured2: RegExpExecArray | null | undefined;
        // Два разных строковых паттерна: оба обязаны дать корректный match
        // (прогон по LRU-кэшу #getCachedRegex, а не new RegExp).
        context.command.addCommand(
            'code',
            ['код_(\\d+)'],
            (_t, ctx) => {
                captured1 = ctx.match;
            },
            true,
        );
        context.command.addCommand(
            'order',
            ['заказ_(\\d+)'],
            (_t, ctx) => {
                captured2 = ctx.match;
            },
            true,
        );
        const first = new TestController(context);
        first.userCommand = 'код_42';
        first.run();
        expect(captured1?.[1]).toBe('42');

        const second = new TestController(context);
        second.userCommand = 'заказ_99';
        second.run();
        expect(captured2?.[1]).toBe('99');

        // Прямая проверка кэша: повторный вызов getMatchRegExp для того же
        // строкового паттерна возвращает ТОТ ЖЕ объект RegExp — компиляция
        // не повторяется на каждый запрос.
        const { Text } = require('../../src') as typeof import('../../src');
        const cached1 = Text.getMatchRegExp('код_(\\d+)');
        const cached2 = Text.getMatchRegExp('код_(\\d+)');
        expect(cached2).toBe(cached1);
    });
});

describe('normalizeActionPayload: payload кнопки → имя действия', () => {
    it('строка payload становится именем действия в нижнем регистре', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload('buy')).toBe('buy');
        expect(normalizeActionPayload('  Buy  ')).toBe('buy');
    });

    it('JSON {"command":"..."} извлекает имя действия', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload('{"command":"buy"}')).toBe('buy');
        expect(normalizeActionPayload('{"action":"pay"}')).toBe('pay');
    });

    it('объект payload с полем command извлекает имя действия', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload({ command: 'buy' })).toBe('buy');
    });

    it('JSON без command остаётся как есть (матчинг по слоту)', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload('{"cmd":"x","y":1}')).toBe('{"cmd":"x","y":1}');
    });

    it('пустой payload и null дают пустую строку', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload(null)).toBe('');
        expect(normalizeActionPayload('')).toBe('');
        expect(normalizeActionPayload('   ')).toBe('');
    });

    it('битый JSON используется как строка', () => {
        const { normalizeActionPayload } = require('../../src/plugins/platforms/Base/utils');
        expect(normalizeActionPayload('{command:buy}')).toBe('{command:buy}');
    });
});

describe('bot.addAction: кнопка с payload вызывает команду', () => {
    it('addAction регистрирует команду, срабатывающую по payload-строке', () => {
        const context = createContext();
        // Эквивалент bot.addAction: слот = имя действия.
        context.command.addCommand('buy', ['buy'], (_t, ctx) => {
            ctx.text = 'Оформляем заказ';
        });
        const controller = new TestController(context);
        // После нормализации payload 'buy' попадает в userCommand.
        controller.userCommand = 'buy';
        controller.run();
        expect(controller.text).toBe('Оформляем заказ');
    });
});
