/**
 * Тесты hasAnyNluKey — фильтра пустых NLU-объектов платформ.
 *
 * Голосовые платформы присылают request.nlu всегда, но в большинстве запросов
 * он пуст. setNlu({}) семантически идентичен отсутствию вызова (проверено
 * отдельно: getNluValue/getIntents/getFio/getDateTime/getNumber возвращают
 * то же), поэтому пустые объекты пропускаются — это убирает создание
 * Nlu-компонента (+Map кэша) из каждого запроса Алисы/Маруси.
 */
import { hasAnyNluKey } from '../../src/plugins/platforms/Base/utils';

describe('hasAnyNluKey', () => {
    it('возвращает false для null и undefined', () => {
        expect(hasAnyNluKey(null)).toBe(false);
        expect(hasAnyNluKey(undefined)).toBe(false);
    });

    it('возвращает false для пустого объекта', () => {
        expect(hasAnyNluKey({})).toBe(false);
    });

    it('возвращает false для ключей с null/undefined значениями', () => {
        expect(hasAnyNluKey({ tokens: null, entities: undefined })).toBe(false);
    });

    it('возвращает false для пустых массивов', () => {
        // Типичный «пустой» nlu Алисы
        expect(hasAnyNluKey({ tokens: [], entities: [] })).toBe(false);
    });

    it('возвращает false для пустых вложенных объектов', () => {
        expect(hasAnyNluKey({ tokens: {}, entities: [] })).toBe(false);
    });

    it('возвращает true для непустого массива', () => {
        expect(hasAnyNluKey({ tokens: ['привет'], entities: [] })).toBe(true);
    });

    it('возвращает true для сущностей (YANDEX.FIO и т.п.)', () => {
        expect(
            hasAnyNluKey({ entities: [{ type: 'YANDEX.FIO', value: { first_name: 'Иван' } }] }),
        ).toBe(true);
    });

    it('возвращает true для непустого вложенного объекта', () => {
        expect(hasAnyNluKey({ intents: { 'YANDEX.HELP': {} } })).toBe(true);
    });

    it('возвращает true для скалярного значения', () => {
        expect(hasAnyNluKey({ deepLink: 'some-link' })).toBe(true);
    });
});
