import { CommandReg } from '../../src/core/utils/CommandReg';
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
        expect(group?.regExp).toBeInstanceOf(RegExp);

        if (!(group?.regExp instanceof RegExp)) {
            throw new Error('Для первой группы должен быть создан RegExp');
        }

        expect(group.regExp.exec('command-300')?.groups?._0).toBe('command-300');
    });
});
