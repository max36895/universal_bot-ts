/**
 * Интерфейс для прокси
 */
interface ProxyOptions {
    /**
     * Состояние прокси
     */
    state: any;
}

/**
 * Утилита для создания прокси для классов
 * @param target - сам класс
 */
export function ProxyUtils<TTarget extends ProxyOptions>(target: TTarget): TTarget {
    return new Proxy(target, {
        set: (_: TTarget, prop: string, value): true => {
            if ((target.state as object).hasOwnProperty(prop)) {
                target.state[prop as keyof TTarget] = value;
            } else {
                target[prop as keyof TTarget] = value;
            }
            return true;
        },
        get: (_: TTarget, prop: string): unknown => {
            if ((target.state as object).hasOwnProperty(prop)) {
                return target.state[prop as keyof TTarget];
            } else {
                return target[prop as keyof TTarget];
            }
        },
    });
}
