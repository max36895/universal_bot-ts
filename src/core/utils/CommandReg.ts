import { ILogger, TLoggerCb } from '../interfaces/ILogger';
import { getRegExp, __$usedRe2, isRegex, TPatternRegExp } from '../../utils/standard/RegExp';
import { isRegexLikelySafe } from './utils';
import os from 'os';
import { BotController } from '../../controller';
import { TAppPlugin } from '../interfaces/IAppContext';
import { TCommandGroupMode } from '../interfaces/IBot';
import { Text } from '../../utils';
import { FALLBACK_COMMAND } from '../constants';

/**
 * Данные группы команд для оптимизации поиска.
 * Используется внутренне фреймворком для группировки команд с RegExp.
 */
export interface IGroupData {
    /** Имена команд в этой группе */
    commands: string[];
    /** Объединённое регулярное выражение для группы (или null) */
    regExp: RegExp | null | string;
}

/**
 * Кэш скомпилированных регулярных выражений групп, чей паттерн хранится строкой
 * (случай, когда количество групп превысило MAX_COUNT_FOR_GROUP). Ключ — объект
 * группы, значение — паттерн, для которого собран RegExp: строка паттерна растёт
 * при добавлении команд, поэтому кэш сверяет её и пересобирает только при изменении.
 */
const groupCompiledRegExp = new WeakMap<IGroupData, { pattern: string; regExp: RegExp }>();

/**
 * Возвращает скомпилированное регулярное выражение группы.
 * Для строкового паттерна результат кэшируется: перекомпиляция на каждом запросе
 * в горячем пути поиска команд стоила заметного CPU.
 * @param groupData Данные группы
 * @param customReg Кастомный конструктор RegExp (например, re2)
 * @returns Скомпилированное выражение или null, если группа пуста
 */
export function getGroupRegExpCompiled(
    groupData: IGroupData,
    customReg?: RegExpConstructor,
): RegExp | null {
    if (groupData.regExp === null) {
        return null;
    }
    if (typeof groupData.regExp !== 'string') {
        return groupData.regExp;
    }
    const cached = groupCompiledRegExp.get(groupData);
    if (cached && cached.pattern === groupData.regExp) {
        return cached.regExp;
    }
    const regExp = getRegExp(groupData.regExp, 'ium', customReg);
    groupCompiledRegExp.set(groupData, { pattern: groupData.regExp, regExp });
    return regExp;
}

const LIMIT_COMMANDS = [1e4, 5e4, 1e5];
// Глобальные лимиты, возможно, можно вынести в конфигурацию
let MAX_COUNT_FOR_GROUP = 0;
let MAX_COUNT_FOR_REG = 0;

/**
 * Устанавливает ограничение на количество активных регулярных выражений. Нужна для того, чтобы приложение не падало под нагрузкой.
 */
function setMemoryLimit(): void {
    const total = os.totalmem();
    // re2 гораздо лучше работает с оперативной памятью, а также ограничение на использование памяти не такое суровое:
    // например, нативный RegExp уронит node при 3 400 группах либо при 68 000 обычных регулярках
    // (в этот лимит никогда не попадём, так как максимум активных регулярок порядка 10 000)
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

    // Если re2 нет, количество активных регулярок для групп нужно сильно сократить, иначе возможно падение nodejs:
    // для групп — в 20 раз, для одиночных регулярных выражений — вдвое
    if (!__$usedRe2) {
        MAX_COUNT_FOR_GROUP /= 20;
        MAX_COUNT_FOR_REG /= 2;
    }
}

setMemoryLimit();

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
     * @param {BotController} [botController] - Контроллер с бизнес-логикой приложения для управления ответом
     * @returns {void | string} - Строка ответа или void
     *
     * Если функция возвращает строку, она автоматически устанавливается как ответ для платформы.
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
    /** true, если слот-строка скомпилирована как регулярное выражение (isPattern). */
    isRegExpString: boolean;
    /**
     * Предвычисленный быстрый путь: у команды ровно один слот, он RegExp без
     * stateful-флагов `g`/`y`, и кастомный движок regexp не подключён.
     * Горячий цикл поиска вызывает `test` напрямую, минуя обёртку Text.isSayText
     * (экономит ~15 нс и ~40 байт транзиентного мусора на каждый вызов).
     * @private
     */
    __$singleStatelessRegExp?: RegExp;
}

/**
 * Параметры конфигурации шага диалога.
 *
 * Используется для регистрации шагов в системе. Шаги сохраняются между сессиями
 * и автоматически восстанавливаются при повторном входе пользователя в навык.
 *
 * @example
 * ```ts
 * // Обычный шаг
 * const step: IStepParam = {
 *   stepName: 'hello',
 *   cb: (ctx) => {
 *     ctx.text = 'Привет! Рад вас видеть!';
 *   }
 * };
 *
 * // Шаг с условием пропуска (возврат false)
 * const stepWithFallback: IStepParam = {
 *   stepName: 'expired_game',
 *   cb: (ctx) => {
 *     if (ctx.messageId === 0) {
 *          return false; // Пропустить шаг
 *     }
 *     ctx.text = 'Продолжаем игру...';
 *   }
 * };
 * ```
 */
export interface IStepParam<TBotController extends BotController = BotController> {
    /**
     * Уникальное имя шага. Используется для идентификации и сохранения в сессии.
     */
    stepName: string;
    /**
     * Функция-обработчик шага. Вызывается при активации шага.
     * Если шаг обрабатывать не нужно, то можно вернуть false. В таком случае фреймворк посчитает что шаг не был найден, и продолжит выполнение своей логики с поиском команд.
     *
     * @param {BotController} botController - Контроллер с бизнес-логикой приложения для управления ответом
     * @returns
     * - `void` или `undefined` — шаг активен. Обработка останавливается на этом шаге, ожидается ввод пользователя.
     * - `false` — шаг **игнорируется**. Фреймворк считает, что шаг не применим, и передаёт управление дальше.
     */
    cb: (botController: TBotController) => void | Promise<void> | false;
}

/**
 * Тип для функции обработки кастомного обработчика команд.
 * Кастомный обработчик может быть как синхронным, так и асинхронным. В случае успешного нахождения команды, возвращается название этой команды. В противном случае возвращается null
 * @param userCommand - Команда пользователя
 * @param commands - Список всех зарегистрированных команд
 * @returns {string} - Имя команды
 */
export type TCommandResolver = (
    userCommand: string,
    commands: Map<string, ICommandParam>,
) => string | null | Promise<string | null>;

/**
 * Класс, который берет на себя всю обязанность за регистрацию команд и шагов
 * @internal Используется только внутри фреймворка
 */
export class CommandReg {
    #regExpCommandCount = 0;

    /**
     * Сгруппированные регулярные выражения. Начинает отрабатывать как только было задано более 300 регулярных выражений
     */
    public regexpGroup: Map<string, IGroupData> = new Map();
    #noFullGroups: IGroup | null = null;

    /**
     * Добавленные команды для обработки
     */
    public commands: Map<string, ICommandParam> = new Map();

    readonly #exactMatchMap = new Map<string, string>();
    /**
     * Снимок команд для горячего цикла поиска.
     *
     * `for...of` по Map на каждой итерации аллоцирует пару-массив `[ключ, значение]`
     * (спецификация итератора), что при скане 1500 команд даёт десятки КБ
     * транзиентного мусора на каждый запрос. Снимок живёт как обычный массив пар
     * (ключ — строка уже существующая в Map, значение — ссылка на объект команды,
     * копий данных не создаётся) и пересобирается лениво: мутации только
     * инвалидируют его флагом, а пересборка происходит один раз при первом
     * поиске после изменения набора команд. Так регистрация 20 000 команд
     * остаётся O(n), а не O(n²).
     * Источником правды остаётся {@link commands} (Map): он нужен для O(1)-get
     * по имени команды.
     */
    public commandsList: [string, ICommandParam][] = [];

    #commandsListDirty = true;

    /**
     * Возвращает актуальный снимок команд, пересобирая его при необходимости.
     * Выывается из горячего цикла поиска команд: при неизменном наборе команд
     * (обычный прод-режим) стоимость — одна проверка булевого флага.
     */
    public getActualCommandsList(): [string, ICommandParam][] {
        if (this.#commandsListDirty) {
            this.commandsList = [];
            for (const entry of this.commands) {
                this.commandsList.push(entry);
            }
            this.#commandsListDirty = false;
        }
        return this.commandsList;
    }

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

    /**
     * Конструктор класса CommandReg.
     *
     * @param {ILogger} logger - Логгер для вывода предупреждений и ошибок
     * @param {TAppPlugin} plugins - Плагины приложения (для получения кастомного RegExp)
     */
    constructor(logger: ILogger, plugins: TAppPlugin) {
        this.logWarn = logger.warn as TLoggerCb;
        this.logError = logger.error as TLoggerCb;
        this.plugins = plugins;
    }

    /**
     * Поиск команды по точному совпадению (без RegExp).
     *
     * @param {string} userCommand - Команда пользователя (в нижнем регистре)
     * @returns {string | undefined} Имя найденной команды или undefined
     */
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

    /**
     * Устанавливает режим группировки регулярных выражений.
     *
     * @param {TCommandGroupMode} mode - Режим группировки: 'auto', 'group' или 'no-group'
     */
    setCommandGroupMode(mode: TCommandGroupMode): void {
        this.#commandGroupMode = mode;
    }

    /**
     * Сообщает о найденном небезопасном регулярном выражении.
     *
     * Уровень намеренно зависит от окружения. Без `re2` движок регулярных выражений
     * Node подвержен катастрофическому бэктрекингу: одно сообщение пользователя
     * может занять поток на минуты, и бот перестанет отвечать вообще всем.
     * Поэтому такая связка — это ошибка, а не предупреждение.
     *
     * @param patterns Небезопасные шаблоны
     */
    #logDangerRegex(patterns: string): void {
        const base = `Найдено небезопасное регулярное выражение (ReDoS), проверьте его корректность: ${patterns}`;
        if (this.strictMode) {
            this.logError(`${base}. Выражение отключено (strictMode).`, {});
            return;
        }
        if (!__$usedRe2) {
            this.logError(
                `${base}. Пакет re2 не установлен, поэтому выражение выполняется штатным движком Node ` +
                    'с экспоненциальным бэктрекингом: специально подобранное сообщение пользователя ' +
                    'заблокирует поток и бот перестанет отвечать всем. Установите re2 (npm i re2) ' +
                    'либо включите strictMode, либо перепишите выражение.',
                {},
            );
            return;
        }
        this.logWarn(`${base}. Выражение выполняется через re2 без бэктрекинга.`, {});
    }

    /**
     * Проверяет, что переданное регулярное выражение не содержит уязвимых к ReDoS конструкций.
     *
     * Если выражение признано небезопасным:
     * - В обычном режиме — пишется предупреждение, и выражение используется как есть.
     * - В `strictMode` — пишется ошибка, и слоты возвращаются пустыми (`status: false`).
     *
     * @param slots Слот(ы) или регулярное выражение для проверки.
     * @returns Исходные слоты или пустой массив с флагом ошибки.
     */
    isDangerRegex(slots: TSlots | RegExp): IDangerRegex {
        if (isRegex(slots)) {
            if (!isRegexLikelySafe(slots.source, true)) {
                this.#logDangerRegex(slots.source);
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
            for (const slot of slots) {
                const isReg = isRegex(slot);
                const slotStr = isReg ? slot.source : slot;
                if (isRegexLikelySafe(slotStr, isReg)) {
                    correctSlots.push(slot);
                } else {
                    errors.push(slotStr);
                }
            }
            const status = errors.length === 0;
            if (!status) {
                this.#logDangerRegex(errors.join(', '));
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
        // когда имя команды может быть некорректным для имени группы, сами задаём корректное имя с учётом индекса
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

            this.#timeOutReg = setTimeout(this.#oldFnGroup, 35).unref();
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

    /** Закрывает текущую группу, чтобы следующая отдельная команда не попала внутрь её диапазона. */
    #closeRegexpGroup(): void {
        if (!this.#noFullGroups) {
            return;
        }
        if (
            this.regexpGroup.has(this.#noFullGroups.name) &&
            ((this.regexpGroup.get(this.#noFullGroups.name) as IGroupData).commands.length || 0) < 2
        ) {
            this.regexpGroup.delete(this.#noFullGroups.name);
        }
        this.#noFullGroups = null;
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
                this.#closeRegexpGroup();
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
                        command.isRegExpString = false;
                        this.commands.set(this.#noFullGroups.name, command);
                    }
                }
                // В среднем 9 символов резервируется под стандартный шаблон группы.
                // Позволяет примерно 60 команд с регулярками при суммарной длине шаблонов до 850 символов
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
                // Имя команды — публичный произвольный идентификатор и не может быть
                // именем capture-группы: например, дефис недопустим в RegExp.
                // Поиск группы всегда использует числовые имена _0, _1, … .
                butchRegexp.push(`(?<_0>${parts.join('|')})`);
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
            this.#closeRegexpGroup();
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
                // Если других команд в группе не осталось — группа не нужна
                if (!newCommands.length) {
                    return;
                }
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
                        // Хост группы не меняется — удаляемая команда не была хостом
                        name: command.__$groupName as string,
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
                        command.__$groupName as string,
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
     *   - При `isPattern = true` строковые слоты компилируются в одно объединённое
     *     регулярное выражение с флагом `ium`.
     *   - Если в slots присутствует хотя бы один RegExp, параметр isPattern для строк
     *     игнорируется. Каждый элемент обрабатывается по своему типу:
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
     *       ctrl.text = `Вы использовали приложение ${visits} раз`;
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
        if (this.commands.get(commandName)) {
            this.logWarn(
                `Команда с названием "${commandName === FALLBACK_COMMAND ? '* (fallback command)' : commandName}" уже создавалась ранее. Ранее созданная команда будет перезаписана. Рекомендуется проверить корректность регистрации команды`,
            );
        }
        if (commandName === FALLBACK_COMMAND) {
            this.commands.set(commandName, {
                slots: undefined,
                isPattern: false,
                cb: cb as ICommandParam['cb'],
                regExp: undefined,
                isRegExpString: false,
                __$groupName: commandName,
            });
            this.#commandsListDirty = true;
            return;
        }

        const size = this.commands.size;
        if (LIMIT_COMMANDS.includes(size)) {
            this.logWarn(
                `Задано ${this.commands.size} команд, скорее всего команды задаются через цикл, который возможно отработал некорректно. Проверьте корректность работы приложения, а также корректность добавленных команд.`,
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
                if (isRegex(slot)) {
                    const res = this.isDangerRegex(slot);
                    if (res.status && this.strictMode) {
                        correctSlots.push(slot);
                    }
                } else {
                    if (this.strictMode) {
                        correctSlots.push(slot);
                    }
                    const tCommandName = this.#exactMatchMap.get(slot);
                    if (!tCommandName) {
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
                isRegExpString: typeof regExp !== 'string',
                __$groupName: groupName,
                __$singleStatelessRegExp: this.#getSingleStatelessRegExp(correctSlots),
            });
            this.#commandsListDirty = true;
        }
    }

    /**
     * Вычисляет RegExp для быстрого пути поиска: команда с ровно одним слотом-RegExp
     * без stateful-флагов `g`/`y` и без кастомного движка может проверяться
     * прямым `.test` в горячем цикле, минуя обёртку Text.isSayText.
     *
     * Наличие движка проверяем по plugins.regExp напрямую, БЕЗ вызова
     * getCustomRegExp(): у плагина-функции могут быть сайд-эффекты
     * (например, подсчёт вызовов в тестах), лишний вызов ломал контракт.
     *
     * @param slots Слоты команды после валидации ReDoS
     * @returns Готовый к прямому тесту RegExp или undefined, если условия не выполнены
     */
    #getSingleStatelessRegExp(slots: TSlots): RegExp | undefined {
        if (
            !this.plugins.regExp &&
            slots.length === 1 &&
            isRegex(slots[0]) &&
            !slots[0].global &&
            !slots[0].sticky
        ) {
            return slots[0];
        }
        return undefined;
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
                if (!isRegex(slot)) {
                    this.#exactMatchMap.delete(slot);
                }
            });
            // Сначала удаляем из regexp-групп (пока информация о команде ещё доступна),
            // и только потом удаляем из this.commands — иначе #removeRegexpInGroup
            // не сможет найти принадлежность к группе через __$groupName.
            this.#removeRegexpInGroup(commandName);
            this.commands.delete(commandName);
        } else {
            // Команды нет в this.commands, но она могла остаться хостом группы
            this.#removeRegexpInGroup(commandName);
        }
        this.#commandsListDirty = true;
    }

    /**
     * Удаляет все зарегистрированные команды
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
        this.#commandsListDirty = true;
        Text.clearCache();
    }

    /**
     * Регистрирует обработчик для именованного шага диалога.
     *
     * Шаг — это часть **многошагового сценария** (например: "регистрация", "оформление заказа").
     * После вызова `ctx.thisIntentName = 'myStep'` в команде или другом шаге,
     * следующее сообщение пользователя будет обработано этим обработчиком.
     *
     * > 💡 Обработчик получает полный `BotController`, как и в командах:
     * > доступны `this.text`, `this.userData`, `this.buttons`, `this.thisIntentName` и т.д.
     *
     * @param stepName — Уникальное имя шага (например, `'enter_email'`).
     * @param handler — Функция, вызываемая при получении сообщения в этом шаге.
     * @returns Текущий экземпляр `CommandReg`.
     *
     * @example
     * ```ts
     * bot.addStep('confirm_age', (ctx) => {
     *   if (ctx.userCommand === 'да') {
     *     ctx.text = 'Отлично! Добро пожаловать.';
     *     ctx.thisIntentName = null; // завершаем сценарий
     *   } else {
     *     ctx.text = 'Извините, вход запрещён.';
     *     ctx.thisIntentName = 'goodbye'; // переходим к другому шагу
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
     * (Рекомендуется завершать активные сценарии через `ctx.thisIntentName = null` перед удалением.)
     *
     * @param stepName — Имя шага для удаления.
     * @returns Текущий экземпляр `CommandReg`.
     */
    public removeStep(stepName: string): this {
        this.steps.delete(stepName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные шаги.
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики приложения).
     *
     * @returns Текущий экземпляр `CommandReg`.
     */
    public clearSteps(): this {
        this.steps.clear();
        return this;
    }
}
