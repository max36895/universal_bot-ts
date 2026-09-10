/**
 * Тесты группировки команд, у которых ВСЕ слоты — готовые RegExp
 * (isPattern не задан явно).
 *
 * Раньше такие команды никогда не попадали в группы регулярок: счётчик
 * #regExpCommandCount рос только у явных isPattern-команд, и 1000
 * RegExp-слотов сканировались линейно (50 мкс/запрос на 1000 командах).
 * Теперь all-RegExp-команда трактуется как isPattern (без изменения
 * семантики: строк в слотах нет, «строковая» ветка isPattern не нужна)
 * и включается в группировку. Смешанные слоты (строка + RegExp) в группу
 * не попадают — их приоритет относительно строковых команд задаётся
 * позицией в списке, а группа матчит «первый подходящий».
 */
import { CommandReg, getGroupRegExpCompiled } from '../../src/core/utils/CommandReg';
import type { ILogger } from '../../src/core/interfaces/ILogger';
import type { TAppPlugin } from '../../src/core/interfaces/IAppContext';

const logger: ILogger = {
    error: () => {},
    warn: () => {},
};

describe('CommandReg: группировка all-RegExp слотов (isPattern не задан)', () => {
    it('300+ команд с RegExp-слотами без isPattern попадают в группу', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 310; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_\\d+$`)], () => {});
        }
        // Группы появились — счётчик регулярок считал all-RegExp команды
        expect(commandReg.regexpGroup.size).toBeGreaterThan(0);
        // Матч по группе находит правильную команду. До debounce-таймера
        // паттерн группы — строка; компиляция идёт через getGroupRegExpCompiled
        // (как в проде) и обязана вернуть полную группу (см. фикс дебаунса).
        const hostName = [...commandReg.regexpGroup.keys()][0];
        const group = commandReg.regexpGroup.get(hostName);
        expect(group).toBeDefined();
        if (!group) {
            throw new Error('группа не создана');
        }
        const compiled = getGroupRegExpCompiled(group);
        expect(compiled).toBeInstanceOf(RegExp);
        if (!compiled) {
            throw new Error('Для первой группы должен быть создан RegExp');
        }
        // Паттерны всех членов группы вошли в компиляцию
        expect(group.commands.length).toBeGreaterThan(1);
        const probe = group.commands[group.commands.length - 1];
        const m = compiled.exec(`zz_cmd_${probe.slice(4)}_777`);
        expect(m).not.toBeNull();
    });

    it('параметр isPattern у all-RegExp команды выставлен (маршрут группового поиска)', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 310; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_\\d+$`)], () => {});
        }
        // Хост группы обязан иметь isPattern=true, иначе #getCommand пойдёт
        // в индивидуальный матч вместо группового exec
        const hostName = [...commandReg.regexpGroup.keys()][0];
        expect(commandReg.commands.get(hostName)?.isPattern).toBe(true);
    });

    it('пустые слоты не считаются all-RegExp (every на пустом массиве)', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        commandReg.addCommand('empty', [], () => {});
        expect(commandReg.commands.get('empty')?.isPattern).toBeFalsy();
    });

    it('смешанные слоты (строка + RegExp) НЕ группируются', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 310; i++) {
            // Чередуем: смешанная и чистая строковая — все вне группы
            commandReg.addCommand(`mix_${i}`, ['текст', new RegExp(`^mix_${i}_\\d+$`)], () => {});
        }
        expect(commandReg.regexpGroup.size).toBe(0);
        // Смешанная команда не помечена isPattern
        expect(commandReg.commands.get('mix_0')?.isPattern).toBeFalsy();
    });

    it('removeCommand корректно убавляет счётчик группировки у групповой команды', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 320; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_\\d+$`)], () => {});
        }
        expect(commandReg.regexpGroup.size).toBeGreaterThan(0);
        // Удаляем членов групп — счётчик должен уйти к нулю, группы разберутся
        for (let i = 0; i < 320; i++) {
            commandReg.removeCommand(`cmd_${i}`);
        }
        expect(commandReg.regexpGroup.size).toBe(0);
        // После разбора можно снова зарегистрировать — работает
        expect(() => {
            commandReg.addCommand('fresh', [new RegExp('^fresh_\\d+$')], () => {});
        }).not.toThrow();
    });

    it('явный isPattern=false НЕ запрещает группировку all-RegExp слотов', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        // Пользователь мог передать isPattern=false явно — семантика слотов
        // (все RegExp) важнее флага: строки всё равно нет.
        commandReg.setCommandGroupMode('group');
        commandReg.addCommand('r1', [/^r1_\d+$/u], () => {}, false);
        commandReg.addCommand('r2', [/^r2_\d+$/u], () => {}, false);
        expect(commandReg.commands.get('r1')?.isPattern).toBe(true);
        expect(commandReg.regexpGroup.get('r1')?.commands).toEqual(['r1', 'r2']);
    });
});
