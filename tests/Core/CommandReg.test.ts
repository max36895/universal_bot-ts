import { CommandReg } from '../../src/core/utils/CommandReg';
import { isRegex } from '../../src/utils/standard/RegExp';
import type { ILogger } from '../../src/core/interfaces/ILogger';
import type { TAppPlugin } from '../../src/core/interfaces/IAppContext';

const logger: ILogger = {
    error: () => {},
    warn: () => {},
};

describe('CommandReg', () => {
    it('регистрирует более 300 pattern-команд с дефисом в имени', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);

        for (let index = 0; index <= 300; index++) {
            expect(() => {
                commandReg.addCommand(
                    `command-${index}`,
                    [new RegExp(`^command-${index}$`)],
                    () => {},
                    true,
                );
            }).not.toThrow();
        }

        const group = commandReg.regexpGroup.get('command-300');
        expect(group?.commands).toEqual(['command-300']);
        // При подключённом re2 группа компилируется им: объект RE2 не наследует RegExp,
        // поэтому проверяем по интерфейсу test/exec, как это делает сам фреймворк.
        const groupRegExp = group?.regExp;
        expect(isRegex(groupRegExp)).toBe(true);
        if (!isRegex(groupRegExp)) {
            throw new Error('Для первой группы должен быть создан RegExp');
        }

        expect(groupRegExp.exec('command-300')?.groups?._0).toBe('command-300');
    });

    it('закрывает открытую группу перед небезопасной отдельной regexp-командой', () => {
        const commandReg = new CommandReg(logger, {} as TAppPlugin);
        commandReg.setCommandGroupMode('group');
        commandReg.addCommand('safe-1', [/^safe-1$/u], () => {}, true);
        commandReg.addCommand('safe-2', [/^safe-2$/u], () => {}, true);
        // eslint-disable-next-line security/detect-unsafe-regex -- небезопасный шаблон нужен как регресс-вход для non-strict режима
        commandReg.addCommand('unsafe', [/(a+)+$/u], () => {}, true);
        commandReg.addCommand('safe-3', [/^safe-3$/u], () => {}, true);

        expect(commandReg.commands.get('unsafe')?.__$groupName).toBe('unsafe');
        expect(commandReg.commands.get('safe-3')?.__$groupName).toBe('safe-3');
        expect(commandReg.regexpGroup.get('safe-1')?.commands).toEqual(['safe-1', 'safe-2']);
    });
});
