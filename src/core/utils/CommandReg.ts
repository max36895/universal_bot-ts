import { ILogger, TLoggerCb } from '../interfaces/ILogger'; // Подставьте реальный путь
import { getRegExp, __$usedRe2, isRegex, TPatternRegExp } from '../../utils/standard/RegExp';
import { isRegexLikelySafe } from './utils';
import os from 'os';
import { BotController } from '../../controller';
import { TAppPlugin } from '../interfaces/IAppContext';
import { TCommandGroupMode } from '../interfaces/IBot';

export interface IGroupData {
    commands: string[];
    regExp: RegExp | null | string;
}

// Глобальные лимиты, возможно, можно вынести в конфигурацию
let MAX_COUNT_FOR_GROUP = 0;
let MAX_COUNT_FOR_REG = 0;

/**
 * Устанавливает ограничение на использование активных регулярных выражений. Нужен для того, чтобы приложение не падало под нагрузкой.
 */
function setMemoryLimit(): void {
    const total = os.totalmem();
    // re2 гораздо лучше работает с оперативной память, а также ограничение на использование памяти не такое суровое
    // например нативный reqExp уронит node при 3_400 группах, либо при 68_000 обычных регулярках (В этот лимит никогда не попадем, так как максимум активных регулярок порядка 10_000)
    // Поэтому если нет re2, то лимиты на количество активных регулярок должно быть меньше, для групп сильно меньше
    if (total < 0.8 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 200;
        MAX_COUNT_FOR_REG = 1000;
    } else if (total < 1.5 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 800;
        MAX_COUNT_FOR_REG = 1400;
    } else if (total < 3 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 1500;
        MAX_COUNT_FOR_REG = 3000;
    } else {
        MAX_COUNT_FOR_GROUP = 6800;
        MAX_COUNT_FOR_REG = 7000;
    }

    // Если нет re2, то количество активных регулярок для групп, нужно сильно сократить, иначе возможно падение nodejs
    if (!__$usedRe2) {
        MAX_COUNT_FOR_GROUP /= 20;
        MAX_COUNT_FOR_REG /= 2;
    }
}

setMemoryLimit();

/**
 * Специальное имя команды для обработки неизвестных запросов.
 *
 * Если ни одна из зарегистрированных команд не сработала,
 * и существует команда с именем `FALLBACK_COMMAND`,
 * её callback будет выполнен как fallback-обработчик.
 *
 * @example
 * ```ts
 * bot.addCommand(FALLBACK_COMMAND, [], (cmd, ctrl) => {
 *   ctrl.text = 'Извините, я вас не понял. Скажите "помощь" для списка команд.';
 *   ctrl.buttons.addBtn('Помощь');
 * });
 * ```
 *
 * @remarks
 * - Fallback срабатывает только если нет совпадений по слотам.
 * - Не влияет на стандартные интенты (`welcome`, `help`).
 * - Можно зарегистрировать только одну fallback-команду (последняя перезапишет предыдущую).
 * - Можно просто передать "*"
 */
export const FALLBACK_COMMAND = '*';

interface IDangerRegex {
    status: boolean;
    slots: TSlots;
}

interface IGroup {
    name: string;
    regLength: number;
    butchRegexp: unknown[];
    regExpSize: number;
}

/**
 * Тип для слотов команд
 */
export type TSlots = TPatternRegExp[];

/**
 * Параметры команды
 *
 * Определяет структуру команды, включая триггеры активации,
 * флаг использования регулярных выражений и функцию-обработчик.
 *
 * @example
 * ```ts
 * const command: ICommandParam = {
 *   slots: ['привет', 'здравствуй'],
 *   isPattern: false,
 *   cb: (text, controller) => {
 *     controller.text = 'Привет! Рад вас видеть!';
 *   }
 * };
 * ```
 */
export interface ICommandParam<TBotController extends BotController = BotController> {
    /**
     * Триггеры активации команды
     *
     * Массив слов или регулярных выражений для активации команды.
     */
    slots?: TSlots;
    /**
     * Флаг использования регулярных выражений
     *
     * Если true, строки в slots интерпретируются как регулярные выражения.
     */
    isPattern?: boolean;
    /**
     * Функция-обработчик команды
     *
     * @param {string} userCommand - Текст команды пользователя
     * @param {BotController} [botController] - Контроллер бота для управления ответом
     * @returns {void | string} - Строка ответа или void
     *
     * Если функция возвращает строку, она автоматически
     * устанавливается как ответ бота.
     */
    cb: (
        userCommand: string,
        botController: TBotController,
    ) => void | string | Promise<void | string>;

    /**
     * Имя группы. Актуально для регулярок
     * @private
     */
    __$groupName?: string | null;
    /**
     * Скомпилированное регулярное выражение
     */
    regExp?: RegExp;
}

/**
 * Параметры шагов
 *
 * Определяет структуру шагов, включая название шага и функцию-обработчик.
 *
 * @example
 * ```ts
 * const step: IStepParam = {
 *   stepName: 'hello',
 *   cb: (controller) => {
 *     controller.text = 'Привет! Рад вас видеть!';
 *   }
 * };
 * ```
 */
export interface IStepParam<TBotController extends BotController = BotController> {
    /**
     * Название шага
     */
    stepName: string;
    /**
     * Функция-обработчик команды
     *
     * @param {BotController} [botController] - Контроллер бота для управления ответом
     */
    cb: (botController: TBotController) => void | Promise<void>;
}

/**
 * Тип для функции обработки кастомного обработчика команд.
 * Кастомный обработчик может быть как синхронным, так и асинхронным. В случае успешного нахождения команды, возвращается название этой команды. В противном случае возвращается null
 * @param userCommand - Команда пользователя
 * @param commands - Список всех зарегистрированных команд
 * @return {string} - Имя команды
 */
export type TCommandResolver = (
    userCommand: string,
    commands: Map<string, ICommandParam>,
) => string | null | Promise<string | null>;

/**
 * Класс, который берет на себя всю обязанность за регистрацию команд и шагов
 */
export class CommandReg {
    #regExpCommandCount = 0;

    /**
     * Сгруппированные регулярные выражения. Начинает отрабатывать как только было задано более 250 регулярных выражений
     */
    public regexpGroup: Map<string, IGroupData> = new Map();
    #noFullGroups: IGroup | null = null;

    /**
     * Добавленные команды для обработки
     */
    public commands: Map<string, ICommandParam> = new Map();

    readonly #exactMatchMap = new Map<string, string>();
    /**
     * Добавленные шаги для обработки
     */
    public steps: Map<string, IStepParam> = new Map();
    /**
     * Флаг строгого режима работы приложения.
     * В строгом режиме работы, все ReDOS регулярные выражения не будут добавляться.
     */
    public strictMode: boolean = false;

    #commandGroupMode: TCommandGroupMode = 'auto';

    /**
     * Кастомизация поиска команд.
     */
    public customCommandResolver: TCommandResolver | undefined;

    private readonly logError: TLoggerCb;
    private readonly logWarn: TLoggerCb;
    private readonly plugins: TAppPlugin;

    constructor(logger: ILogger, plugins: TAppPlugin) {
        this.logWarn = logger.warn as TLoggerCb;
        this.logError = logger.error as TLoggerCb;
        this.plugins = plugins;
    }

    getExactMatchCommand(userCommand: string): string | undefined {
        return this.#exactMatchMap.get(userCommand);
    }

    /**
     * Возвращает кастомный обработчик для обработки регулярных выражений
     */
    getCustomRegExp(): RegExpConstructor | undefined {
        const reg = this.plugins.regExp;
        if (reg) {
            return typeof reg === 'function' ? reg() : reg.getData();
        }
        return undefined;
    }

    setCommandGroupMode(mode: TCommandGroupMode): void {
        this.#commandGroupMode = mode;
    }

    /**
     * Определяет опасная передана регулярка или нет
     * @param slots
     */
    isDangerRegex(slots: TSlots | RegExp): IDangerRegex {
        if (isRegex(slots, this.getCustomRegExp())) {
            if (!isRegexLikelySafe(slots.source, true)) {
                this[this.strictMode ? 'logError' : 'logWarn'](
                    `Найдено небезопасное регулярное выражение, проверьте его корректность: ${slots.source}`,
                    {},
                );
                if (this.strictMode) {
                    return {
                        status: false,
                        slots: [],
                    };
                } else {
                    return { status: true, slots: [slots] };
                }
            }
            return {
                status: true,
                slots: [slots],
            };
        } else {
            const correctSlots: TSlots | undefined = [];
            const errors: string[] | undefined = [];
            slots.forEach((slot) => {
                const slotStr = isRegex(slot, this.getCustomRegExp()) ? slot.source : slot;
                if (isRegexLikelySafe(slotStr, isRegex(slot, this.getCustomRegExp()))) {
                    correctSlots.push(slot);
                } else {
                    errors.push(slotStr);
                }
            });
            const status = errors.length === 0;
            if (!status) {
                this[this.strictMode ? 'logError' : 'logWarn']?.(
                    `Найдены небезопасные регулярные выражения (ReDOS), проверьте их корректность: ${errors.join(', ')}`,
                    {},
                );
                errors.length = 0;
            }
            return { status, slots: this.strictMode ? correctSlots : slots };
        }
    }

    #timeOutReg: ReturnType<typeof setTimeout> | undefined;
    #oldFnGroup: (() => void) | undefined;
    #oldGroupName: string | undefined;

    #getGroupRegExp(
        groupData: IGroupData,
        slots: TSlots,
        group: IGroup,
        useReg: boolean = true,
        isRegUp: boolean = true,
    ): void {
        group.butchRegexp ??= [];
        const parts = slots.map((s) => {
            return `(${typeof s === 'string' ? s : s.source})`;
        });
        const groupIndex = group.butchRegexp.length;
        // Для уменьшения длины регулярного выражения, а также для исключения случая,
        // когда имя команды может быть не корректным для имени группы, сами задаем корректное имя с учетом индекса
        const pat = `(?<_${groupIndex}>${parts?.join('|')})`;
        group.butchRegexp.push(pat);
        group.regExpSize += pat.length;
        const pattern = group.butchRegexp.join('|');
        if (useReg) {
            if (group.name !== this.#oldGroupName && this.#timeOutReg) {
                this.#oldFnGroup?.();
                this.#oldGroupName = group.name;
            }
            if (this.#timeOutReg) {
                clearTimeout(this.#timeOutReg);
                this.#timeOutReg = undefined;
            }
            this.#oldFnGroup = (): void => {
                const pattern = group.butchRegexp.join('|');
                const regExp = getRegExp(pattern, 'ium', this.getCustomRegExp());
                if (isRegUp) {
                    // прогреваем регулярку
                    regExp.test('__umbot_testing');
                    regExp.test('');
                }
                groupData.regExp = regExp;
                this.#timeOutReg = undefined;
                this.#oldFnGroup = undefined;
            };

            this.#timeOutReg = setTimeout(this.#oldFnGroup, 100);
            return;
        } else {
            if (this.#timeOutReg && this.#oldGroupName !== group.name) {
                this.#oldFnGroup?.();
            }
            clearTimeout(this.#timeOutReg);
            this.#oldFnGroup = undefined;
            this.#oldGroupName = undefined;
            this.#timeOutReg = undefined;
        }
        groupData.regExp = pattern;
    }

    #addRegexpInGroup(commandName: string, slots: TSlots, isRegexp: boolean): string | null {
        // Если количество команд до 300, то нет необходимости в объединении регулярок, так как это не даст сильного преимущества
        if (
            this.#commandGroupMode === 'no-group' ||
            (this.#commandGroupMode === 'auto' && this.#regExpCommandCount < 300)
        ) {
            return commandName;
        }
        if (isRegexp) {
            if (!isRegexLikelySafe(slots.join('|'), false)) {
                return commandName;
            }
            if (this.#noFullGroups) {
                let groupName = this.#noFullGroups.name;
                let groupData = this.regexpGroup.get(groupName) || { commands: [], regExp: null };
                if (
                    this.#noFullGroups.butchRegexp.length === 1 &&
                    this.#noFullGroups.name !== commandName
                ) {
                    const command = this.commands.get(this.#noFullGroups.name);
                    if (command) {
                        command.regExp = undefined;
                        this.commands.set(this.#noFullGroups.name, command);
                    }
                }
                // В среднем 9 символов зарезервировано под стандартный шаблон для группы регулярки. Даем примерно 60 регулярок по 5 символов
                if (
                    this.#noFullGroups.regLength >= 60 ||
                    (this.#noFullGroups.regExpSize || 0) > 850
                ) {
                    groupData = { commands: [], regExp: null };
                    groupName = commandName;
                    this.#noFullGroups = {
                        name: commandName,
                        regLength: 0,
                        butchRegexp: [],
                        regExpSize: 0,
                    };
                }
                groupData.commands.push(commandName);
                this.#getGroupRegExp(
                    groupData,
                    slots,
                    this.#noFullGroups,
                    this.regexpGroup.size < MAX_COUNT_FOR_GROUP,
                );

                this.regexpGroup.set(groupName, groupData);
                this.#noFullGroups.regLength += slots.length;
                return groupName;
            } else {
                const butchRegexp = [];
                const parts = slots.map((s) => {
                    return `(${typeof s === 'string' ? s : s.source})`;
                });
                butchRegexp.push(`(?<${commandName}>${parts?.join('|')})`);
                const regExp = getRegExp(`${butchRegexp.join('|')}`, 'ium', this.getCustomRegExp());
                this.#noFullGroups = {
                    name: commandName,
                    regLength: slots.length,
                    butchRegexp,
                    regExpSize: regExp.source.length,
                };
                this.regexpGroup.set(commandName, {
                    commands: [commandName],
                    regExp,
                });
                return commandName;
            }
        } else {
            if (this.#noFullGroups) {
                if (this.regexpGroup.has(this.#noFullGroups.name)) {
                    const groupCommandCount =
                        this.regexpGroup.get(this.#noFullGroups.name)?.commands?.length || 0;
                    if (groupCommandCount < 2) {
                        this.regexpGroup.delete(this.#noFullGroups.name);
                    }
                }
                this.#noFullGroups = null;
            }
            return null;
        }
    }

    #removeRegexpInGroup(commandName: string): void {
        const getReg = (
            groupData: IGroupData,
            newCommandName: string,
            newCommands: string[],
            group: IGroup,
            useReg: boolean,
        ): void => {
            newCommands.forEach((cName) => {
                const command = this.commands.get(cName);
                if (command) {
                    command.__$groupName = newCommandName;
                    this.commands.set(cName, command);
                    this.#getGroupRegExp(groupData, command.slots as TSlots, group, useReg, false);
                }
            });
        };
        if (this.regexpGroup.has(commandName)) {
            const group = this.regexpGroup.get(commandName);
            this.regexpGroup.delete(commandName);
            if (group?.commands?.length) {
                const newCommands = group?.commands.filter((gCommand) => {
                    return gCommand !== commandName;
                });
                const newCommandName = newCommands[0];
                const nGroup: IGroup = {
                    name: newCommandName,
                    regLength: 0,
                    butchRegexp: [],
                    regExpSize: 0,
                };
                const groupData: IGroupData = {
                    commands: newCommands,
                    regExp: null,
                };
                getReg(
                    groupData,
                    newCommandName,
                    newCommands,
                    nGroup,
                    typeof group.regExp !== 'string',
                );
                this.regexpGroup.set(newCommandName, groupData);
            }
        } else if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command?.__$groupName && this.regexpGroup.has(command?.__$groupName)) {
                const group = this.regexpGroup.get(command.__$groupName);
                if (group) {
                    const newCommands = group?.commands.filter((gCommand) => {
                        return gCommand !== commandName;
                    });
                    const nGroup: IGroup = {
                        name: commandName,
                        regLength: 0,
                        butchRegexp: [],
                        regExpSize: 0,
                    };
                    const groupData: IGroupData = {
                        commands: newCommands,
                        regExp: null,
                    };
                    getReg(
                        groupData,
                        commandName,
                        newCommands,
                        nGroup,
                        typeof group.regExp !== 'string',
                    );
                    this.regexpGroup.set(command.__$groupName, groupData);
                }
            }
        }
    }

    /**
     * Добавляет команду для обработки пользовательских запросов
     *
     * ⚙️ Оптимизация: при регистрации более 300 команд с регулярными выражениями
     * фреймворк автоматически объединяет их в группы для повышения производительности.
     *
     * @param {string} commandName - Уникальный идентификатор команды
     * @param {TSlots} slots - Триггеры для активации команды
     *   - Если элемент — строка → ищется как подстрока (`text.includes(...)`).
     *   - Если элемент — RegExp → проверяется как регулярное выражение (`.test(text)`).
     *   - Параметр `isPattern` учитывается **только если в `slots` нет RegExp**.
     *   - Если в slots присутствует хотя бы один RegExp, параметр isPattern игнорируется. Каждый элемент обрабатывается по своему типу:
     *        - string → как литерал (поиск подстроки),
     *        - RegExp → как регулярное выражение
     * @param {ICommandParam['cb']} cb - Функция-обработчик команды
     * @param {boolean} isPattern - Использовать регулярные выражения (по умолчанию false)
     *
     * @example
     * Простая команда со словами:
     * ```ts
     * commandReg.addCommand(
     *   'greeting',
     *   ['привет', 'здравствуй'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = 'Здравствуйте!';
     *   }
     * );
     * ```
     *
     * @example
     * Команда с регулярными выражениями:
     * ```ts
     * // Обработка чисел от 1 до 999
     * commandReg.addCommand(
     *   'number',
     *   ['\\b([1-9]|[1-9][0-9]|[1-9][0-9][0-9])\\b'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = `Вы ввели число: ${cmd}`;
     *   },
     *   true  // включаем поддержку регулярных выражений
     * );
     * ```
     *
     * @example
     * Команда с доступом к состоянию:
     * ```ts
     * commandReg.addCommand(
     *   'stats',
     *   ['статистика'],
     *   async (cmd, ctrl) => {
     *     if (ctrl) {
     *       // Доступ к пользовательским данным
     *       const visits = ctrl.userData?.visits || 0;
     *       ctrl.text = `Вы использовали бота ${visits} раз`;
     *
     *       // Доступ к кнопкам и другим UI элементам
     *       ctrl.buttons
     *         .addBtn('Сбросить статистику')
     *         .addBtn('Закрыть');
     *     }
     *   }
     * );
     * ```
     *
     * @remarks
     * Поиск команд оптимизирован:
     * 1. Сначала проверяется точное совпадение
     * 2. Если точного совпадения нет — выполняется последовательный перебор
     *
     * При регистрации более 300 команд с регулярными выражениями
     * фреймворк автоматически объединяет их в группы для повышения производительности.
     *
     * При isPattern=true используются регулярные выражения JavaScript
     * В callback доступен весь функционал BotController
     * Можно использовать async функции в callback
     */
    public addCommand<TBotController extends BotController = BotController>(
        commandName: string,
        slots: TSlots,
        cb: ICommandParam<TBotController>['cb'],
        isPattern: boolean = false,
    ): void {
        if (commandName === FALLBACK_COMMAND) {
            this.commands.set(commandName, {
                slots: undefined,
                isPattern: false,
                cb: cb as ICommandParam['cb'],
                regExp: undefined,
                __$groupName: commandName,
            });
            return;
        }
        if (
            this.commands.size === 1e4 ||
            this.commands.size === 5e4 ||
            this.commands.size === 1e5
        ) {
            this.logWarn(
                `Задано более ${this.commands.size} команд, скорей всего команды задаются через цикл, который отработал не корректно. Проверьте корректность работы приложения, а также добавленные команды.`,
            );
        }
        let correctSlots: TSlots = this.strictMode ? [] : slots;
        let regExp;
        let groupName;
        if (isPattern) {
            correctSlots = this.isDangerRegex(slots).slots;
            if (correctSlots.length) {
                groupName = this.#addRegexpInGroup(commandName, correctSlots, true);
                if (groupName === commandName) {
                    this.#regExpCommandCount++;
                    if (this.#regExpCommandCount < MAX_COUNT_FOR_REG) {
                        regExp = getRegExp(correctSlots, 'ium', this.getCustomRegExp());
                        regExp.test('__umbot_testing');
                        regExp.test('');
                    }
                }
            }
        } else {
            this.#addRegexpInGroup(commandName, correctSlots, false);
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                if (isRegex(slot, this.getCustomRegExp())) {
                    const res = this.isDangerRegex(slot);
                    if (res.status && this.strictMode) {
                        correctSlots.push(slot);
                    }
                } else {
                    if (this.strictMode) {
                        correctSlots.push(slot);
                    }
                    if (this.#exactMatchMap.has(slot)) {
                        const tCommandName = this.#exactMatchMap.get(slot);
                        if (tCommandName !== commandName) {
                            this.logError(
                                `Для команды "${commandName}", используется та же активационная фраза что и для команды "${tCommandName}". Проверьте корректность регистрации команд.`,
                            );
                        }
                    } else {
                        this.#exactMatchMap.set(slot, commandName);
                    }
                }
            }
        }
        if (correctSlots.length) {
            this.commands.set(commandName, {
                slots: correctSlots,
                isPattern,
                cb: cb as ICommandParam['cb'],
                regExp,
                __$groupName: groupName,
            });
        }
    }

    /**
     * Удаляет команду
     * @param commandName - Имя команды
     */
    public removeCommand(commandName: string): void {
        if (commandName === FALLBACK_COMMAND) {
            this.commands.delete(commandName);
            return;
        }
        if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command?.isPattern && command.regExp) {
                this.#regExpCommandCount--;
                if (this.#regExpCommandCount < 0) {
                    this.#regExpCommandCount = 0;
                }
            }
            command?.slots?.forEach((slot) => {
                if (!isRegex(slot, this.getCustomRegExp())) {
                    this.#exactMatchMap.delete(slot);
                }
            });
            this.commands.delete(commandName);
        }
        this.#removeRegexpInGroup(commandName);
    }

    /**
     * Удаляет все команды
     */
    public clearCommands(): void {
        this.commands.clear();
        this.#noFullGroups = null;
        this.#regExpCommandCount = 0;
        this.regexpGroup.clear();
        this.#exactMatchMap.clear();
        this.#oldGroupName = undefined;
        this.#oldFnGroup = undefined;
        clearTimeout(this.#timeOutReg);
        this.#timeOutReg = undefined;
    }

    /**
     * Регистрирует обработчик для именованного шага диалога.
     *
     * Шаг — это часть **многошагового сценария** (например: "регистрация", "оформление заказа").
     * После вызова `ctx.thisIntentName = 'myStep'` в команде или другом шаге,
     * следующее сообщение пользователя будет обработано этим обработчиком.
     *
     * > 💡 Обработчик получает полный `BotController`, как и в командах:
     * > доступны `this.text`, `this.userData`, `this.buttons`, `this.setStep()` и т.д.
     *
     * @param stepName — Уникальное имя шага (например, `'enter_email'`).
     * @param handler — Функция, вызываемая при получении сообщения в этом шаге.
     * @returns Текущий экземпляр `Bot` (для цепочки вызовов).
     *
     * @example
     * ```ts
     * bot.addStep('confirm_age', (ctx) => {
     *   if (ctx.userCommand === 'да') {
     *     ctx.text = 'Отлично! Добро пожаловать.';
     *     ctx.clearStep(); // завершаем сценарий
     *   } else {
     *     ctx.text = 'Извините, вход запрещён.';
     *     ctx.setStep('goodbye'); // переходим к другому шагу
     *   }
     * });
     * ```
     */
    public addStep<TBotController extends BotController = BotController>(
        stepName: string,
        handler: IStepParam<TBotController>['cb'],
    ): this {
        this.steps.set(stepName, {
            stepName: stepName,
            cb: handler as IStepParam['cb'],
        });
        return this;
    }

    /**
     * Удаляет зарегистрированный шаг по имени.
     *
     * После удаления шаг больше не будет обрабатываться, даже если активен у пользователя.
     * (Рекомендуется завершать активные сценарии через `ctx.clearStep()` перед удалением.)
     *
     * @param stepName — Имя шага для удаления.
     * @returns Текущий экземпляр `Bot`.
     */
    public removeStep(stepName: string): this {
        this.steps.delete(stepName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные шаги.
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики бота).
     *
     * @returns Текущий экземпляр `Bot`.
     */
    public clearSteps(): this {
        this.steps.clear();
        return this;
    }
}
