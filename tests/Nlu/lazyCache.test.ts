/**
 * Тесты ленивой инициализации кэша сущностей Nlu.
 *
 * Раньше Map #cachedData создавался в конструкторе на каждый объект Nlu,
 * то есть на каждый запрос любой платформы, даже если к сущностям никто
 * не обращался (типичный случай чат-платформ: адаптеры пишут только thisUser).
 * Теперь Map создаётся при первом обращении #getData / setNlu(clearCache).
 */
import { Nlu } from '../../src';

describe('Nlu: ленивый кэш сущностей', () => {
    it('конструктор не аллоцирует данные — getNluValue работает без обращений', () => {
        const nlu = new Nlu();
        expect(nlu.getNluValue()).toEqual({});
        expect(nlu.getUserName()).toBeNull();
    });

    it('сущности извлекаются с первого обращения (кэш создаётся лениво)', () => {
        const nlu = new Nlu();
        nlu.setNlu({
            entities: [{ type: 'YANDEX.FIO', value: { first_name: 'Иван', last_name: 'Иванов' } }],
        });
        const fio = nlu.getFio();
        expect(fio.status).toBe(true);
        if (fio.status) {
            expect(fio.result[0].first_name).toBe('Иван');
        }
    });

    it('повторное извлечение возвращает тот же результат (кэш работает)', () => {
        const nlu = new Nlu();
        nlu.setNlu({
            entities: [{ type: 'YANDEX.FIO', value: { first_name: 'Пётр', last_name: 'Петров' } }],
        });
        const first = nlu.getFio();
        const second = nlu.getFio();
        expect(second.status).toBe(true);
        if (first.status && second.status) {
            expect(second.result[0]).toEqual(first.result[0]);
        }
    });

    it('setNlu с isClearCache сбрасывает кэш и без предварительных обращений', () => {
        const nlu = new Nlu();
        // Вызов не должен падать на null-кэше (раньше Map уже существовал).
        expect(() => nlu.setNlu({}, true)).not.toThrow();
        expect(nlu.getNluValue()).toEqual({});
    });

    it('setNlu(clearCache) действительно сбрасывает результаты по старым данным', () => {
        const nlu = new Nlu();
        nlu.setNlu({
            entities: [{ type: 'YANDEX.FIO', value: { first_name: 'Иван', last_name: 'Иванов' } }],
        });
        expect(nlu.getFio().status).toBe(true);
        // Новые данные + очистка кэша: старый результат не должен возвращаться.
        nlu.setNlu({ entities: [] }, true);
        expect(nlu.getFio().status).toBe(false);
    });

    it('поиск по пустым сущностям возвращает status=false', () => {
        const nlu = new Nlu();
        nlu.setNlu({ entities: [] });
        expect(nlu.getFio().status).toBe(false);
    });
});
