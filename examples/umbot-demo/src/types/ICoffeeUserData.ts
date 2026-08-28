import { IUserData } from 'umbot';

/**
 * Одна запись в истории заказов.
 */
export interface ICoffeeOrder {
    /** Название напитка: «кофе», «чай» или «какао». */
    drink: string;
    /** Объём порции: «маленький», «средний» или «большой». */
    size: string;
    /** Имя, на которое готовим заказ. */
    name: string;
    /** Время создания заказа (unix-миллисекунды). */
    ts: number;
}

/**
 * Типизированные данные пользователя кофейни-бота.
 *
 * Расширяет базовый `IUserData` — в нём фреймворк держит служебные поля
 * (например, `oldIntentName` для многошаговых диалогов). Благодаря дженерику
 * `Bot<ICoffeeUserData>` доступ к `ctx.userData.favorite` и `ctx.userData.history`
 * проверяется компилятором.
 */
export interface ICoffeeUserData extends IUserData {
    /** Любимый напиток пользователя. Обновляется после каждого заказа. */
    favorite?: string;
    /** История заказов в порядке оформления. */
    history?: ICoffeeOrder[];
}
