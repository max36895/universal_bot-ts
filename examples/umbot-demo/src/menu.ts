import { BotController } from 'umbot';
import { ICoffeeOrder, ICoffeeUserData } from './types/ICoffeeUserData';

/**
 * Продуктовый слой «Кофейни-бота».
 *
 * Здесь живёт доменная логика кофейни: меню с ценами, размеры порций,
 * расчёт итога, программа лояльности и оформление заказа. Это обычный
 * TypeScript без какой-либо магии фреймворка — umbot отвечает только за
 * диалог (команды, шаги, формы) в `src/index.ts`.
 */

/**
 * Тип контекста запроса с типизированным `userData`.
 *
 * Дженерик `BotController<ICoffeeUserData>` делает `ctx.userData.favorite`
 * и `ctx.userData.history` типобезопасными в колбэках `addCommand`/`addStep`/
 * `addForm` — без необходимости писать собственный класс-контроллер.
 */
export type CoffeeCtx = BotController<ICoffeeUserData>;

/** Позиция меню: название, базовая цена (за маленький объём), описание. */
export interface IMenuItem {
    title: string;
    price: number;
    desc: string;
}

/** Меню напитков с базовыми ценами в рублях. */
export const MENU: Record<string, IMenuItem> = {
    кофе: { title: 'Кофе', price: 150, desc: 'Эспрессо, американо или капучино' },
    чай: { title: 'Чай', price: 100, desc: 'Чёрный, зелёный или травяной' },
    какао: { title: 'Какао', price: 120, desc: 'Горячий шоколад с молоком' },
};

/** Названия напитков — для валидации формы и нормализации ответов. */
export const DRINKS = Object.keys(MENU);

/** Размеры порции и наценка к базовой цене напитка. */
export const SIZES: Record<string, { title: string; add: number }> = {
    маленький: { title: 'Маленький', add: 0 },
    средний: { title: 'Средний', add: 30 },
    большой: { title: 'Большой', add: 60 },
};

/** Названия размеров — для валидации формы и нормализации ответов. */
export const SIZE_NAMES = Object.keys(SIZES);

/** Программа лояльности: каждый N-й заказ в подарок. */
export const LOYALTY_EVERY = 5;

/**
 * Считает итоговую сумму заказа: базовая цена напитка + наценка за объём.
 *
 * @param drink Название напитка из меню
 * @param size Название размера порции
 * @returns Сумма в рублях (0, если напиток или размер неизвестны)
 */
export function getPrice(drink: string, size: string): number {
    const base = MENU[drink]?.price ?? 0;
    const add = SIZES[size]?.add ?? 0;
    return base + add;
}

/**
 * Словесные числительные для разбора количества порций.
 * В консольном режиме и чатах NLU пуст, поэтому «два кофе» распознаём по словам.
 */
const WORD_NUMBERS: Record<string, number> = {
    один: 1,
    одна: 1,
    два: 2,
    две: 2,
    три: 3,
    четыре: 4,
    пять: 5,
};

/** Максимальное разумное количество порций в одном заказе. */
const MAX_COUNT = 10;

/**
 * Извлекает количество порций из фразы пользователя («закажу два кофе»).
 *
 * Демонстрирует работу с NLU:
 * 1. Сначала спрашиваем платформу — Алиса сама присылает числа
 *    в `YANDEX.NUMBER`.
 * 2. Если NLU пуст (консольный режим, чат-платформы) — разбираем
 *    слова-числительные и цифры из текста вручную.
 *
 * @param ctx Контекст текущего запроса
 * @returns Количество порций от 1 до 10 или `null`, если число не найдено
 */
export function extractCount(ctx: CoffeeCtx): number | null {
    const numbers = ctx.nlu.getNumber();
    if (numbers.status && numbers.result) {
        const found = numbers.result.find(
            (num) => Number.isFinite(num) && num > 0 && num <= MAX_COUNT,
        );
        if (found !== undefined) {
            return Math.floor(found);
        }
    }
    for (const word of (ctx.userCommand || '').toLowerCase().split(/\s+/)) {
        const wordCount = WORD_NUMBERS[word];
        if (wordCount !== undefined) {
            return wordCount;
        }
        const digit = Number(word);
        if (Number.isInteger(digit) && digit > 0 && digit <= MAX_COUNT) {
            return digit;
        }
    }
    return null;
}

/**
 * Оформляет заказ: считает номер и итог, применяет программу лояльности,
 * сохраняет результат в `userData` и показывает подтверждение с кнопками.
 *
 * Одна функция используется и формой заказа (`onComplete`), и шагом
 * подтверждения любимого напитка — чтобы логика оформления не дублировалась.
 *
 * @param ctx Контекст текущего запроса
 * @param drink Название напитка (уже нормализованное к меню)
 * @param size Название размера (уже нормализованное к списку)
 * @param name Имя, на которое готовим заказ
 */
export function completeOrder(ctx: CoffeeCtx, drink: string, size: string, name: string): void {
    const history = ctx.userData.history || [];
    const orderNumber = history.length + 1;
    const isFree = orderNumber % LOYALTY_EVERY === 0;
    const total = isFree ? 0 : getPrice(drink, size);
    const order: ICoffeeOrder = { drink, size, name, total, ts: Date.now() };

    // Данные нужно мержить, а не перезаписывать `ctx.userData` —
    // иначе фреймворк потеряет связь с сохранённым состоянием.
    Object.assign(ctx.userData, {
        favorite: drink,
        history: [...history, order],
    });

    const priceText = isFree
        ? `Заказ №${orderNumber} — в подарок: каждый ${LOYALTY_EVERY}-й кофе за наш счёт!`
        : `Итого: ${total} ₽.`;
    ctx.text = `Заказ №${orderNumber} принят: ${size} ${drink} для ${name}. ${priceText}`;
    ctx.buttons.addBtn('Ещё заказ').addBtn('Меню');
}
