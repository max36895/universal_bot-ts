/**
 * Регрессионный тест бага дебаунса сборки групп регулярок.
 *
 * Баг: при регистрации группы из N команд (N > 3) #getGroupRegExp на каждом
 * пуше перевзводил 35-мс таймер и присваивал groupData.regExp
 * СКОМПИЛИРОВАННЫЙ RegExp от промежуточного набора (1-3 паттерна). Любой
 * запрос, пришедший раньше срабатывания таймера, получал урезанную группу:
 * команда №20 в группе не находилась, пока таймер не пересоберёт паттерн.
 * Фикс: во время дебаунса regExp остаётся строкой, getGroupRegExpCompiled
 * компилирует полную строку через кэш; таймер затем подменяет её прогретым
 * объектом. Тест проверяет оба состояния: до таймера и после.
 */
import { CommandReg, getGroupRegExpCompiled } from '../../src/core/utils/CommandReg';
import type { ILogger } from '../../src/core/interfaces/ILogger';
import type { TAppPlugin } from '../../src/core/interfaces/IAppContext';

const logger: ILogger = {
    error: () => {},
    warn: () => {},
};
const BS = String.fromCharCode(92) + 'd+'; // '\d+' без heredoc-ловушек

describe('Дебаунс сборки групп регулярок', () => {
    it('до срабатывания таймера группа матчит ВСЕ свои команды (не только первые)', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 320; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_${BS}$`)], () => {});
        }
        const hostName = [...commandReg.regexpGroup.keys()][0];
        const group = commandReg.regexpGroup.get(hostName);
        if (!group) {
            throw new Error('группа не создана');
        }
        // До таймера regExp — строка (дебаунс), компиляция через кэш:
        // группа обязана включать паттерны всех членов, а не первые 3.
        const compiled = getGroupRegExpCompiled(group);
        if (!compiled) {
            throw new Error('компиляция не удалась');
        }
        const lastMember = group.commands[group.commands.length - 1];
        const lastIdx = lastMember.slice('cmd_'.length);
        expect(compiled.test(`zz_cmd_${lastIdx}_42`)).toBe(true);
        // И не только последний: середина группы
        const midMember = group.commands[Math.floor(group.commands.length / 2)];
        const midIdx = midMember.slice('cmd_'.length);
        expect(compiled.test(`zz_cmd_${midIdx}_7`)).toBe(true);
    });

    it('после срабатывания таймера (35 мс) группа остаётся полной', (done) => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 320; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_${BS}$`)], () => {});
        }
        setTimeout(() => {
            const hostName = [...commandReg.regexpGroup.keys()][0];
            const group = commandReg.regexpGroup.get(hostName);
            if (!group?.regExp || typeof group.regExp === 'string') {
                done(new Error('таймер не подменил regExp объектом'));
                return;
            }
            const lastMember = group.commands[group.commands.length - 1];
            expect(group.regExp.test(`zz_cmd_${lastMember.slice(4)}_99`)).toBe(true);
            done();
        }, 60);
    });

    it('компиляция до и после таймера возвращает совместимые результаты', (done) => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        for (let i = 0; i < 320; i++) {
            commandReg.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_${BS}$`)], () => {});
        }
        const hostName = [...commandReg.regexpGroup.keys()][0];
        const group = commandReg.regexpGroup.get(hostName);
        const before = getGroupRegExpCompiled(group);
        setTimeout(() => {
            const after = getGroupRegExpCompiled(group);
            // Обе компиляции матчат одинаковые входы
            const probe = 'zz_cmd_305_11';
            expect(before?.test(probe)).toBe(true);
            expect(after?.test(probe)).toBe(true);
            done();
        }, 60);
    });
});
