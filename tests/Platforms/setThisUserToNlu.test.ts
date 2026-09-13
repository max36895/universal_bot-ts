/**
 * Тесты setThisUserToNlu — фильтра пустых данных отправителя у чат-платформ
 * и ленивой передачи thisUser в Nlu.
 *
 * Чат-адаптеры (Telegram/VK/MAX/Viber) кладут в NLU только thisUser. Значение
 * записывается в приватный буфер контроллера (setThisUser): объект Nlu
 * создаётся лениво при первом обращении логики к controller.nlu — если NLU
 * никто не читает, аллокации нет вовсе. Когда все поля отправителя пусты,
 * запись пропускается — зеркально hasAnyNluKey для голосовых платформ.
 */
import { BotController } from '../../src';
import { setThisUserToNlu } from '../../src/plugins/platforms/Base/utils';

class TestController extends BotController {
    action(): void {
        // не используется: тест работает напрямую с NLU-компонентом
    }
}

describe('setThisUserToNlu', () => {
    let controller: TestController;

    beforeEach(() => {
        controller = new TestController();
    });

    it('записывает thisUser в буфер, не создавая Nlu до первого обращения', () => {
        setThisUserToNlu(controller, {
            username: 'ivan',
            first_name: null,
            last_name: null,
        });
        // Ключевая ленивость: хелпер записал данные, но объект Nlu ещё не создан
        expect(controller.isNluInit()).toBe(false);
    });

    it('буфер доезжает до Nlu при первом обращении к геттеру', () => {
        setThisUserToNlu(controller, { username: 'ivan', first_name: null, last_name: null });
        // Обращение к геттеру создаёт Nlu и переносит буфер
        expect(controller.nlu.getUserName()).toEqual({
            username: 'ivan',
            first_name: null,
            last_name: null,
        });
        expect(controller.isNluInit()).toBe(true);
    });

    it('setThisUser после создания Nlu пишет напрямую в него', () => {
        setThisUserToNlu(controller, { username: 'a', first_name: null, last_name: null });
        expect(controller.nlu.getUserName()?.username).toBe('a');
        setThisUserToNlu(controller, { username: null, first_name: 'Иван', last_name: null });
        const user = controller.nlu.getUserName();
        expect(user?.username).toBeNull();
        expect(user?.first_name).toBe('Иван');
    });

    it('не создаёт Nlu и не буферизует, если все поля пусты', () => {
        setThisUserToNlu(controller, {
            username: null,
            first_name: null,
            last_name: null,
        });
        expect(controller.isNluInit()).toBe(false);
        // Буфер не должен попасть в Nlu и при последующем обращении
        expect(controller.nlu.getUserName()).toBeNull();
    });

    it('не создаёт Nlu, если полей нет вовсе', () => {
        setThisUserToNlu(controller, {});
        expect(controller.isNluInit()).toBe(false);
    });

    it('пустая строка считается отсутствием данных (как в адаптерах: || null)', () => {
        // Адаптеры приводят falsy к null до вызова, но хелпер обязан
        // интерпретировать пустые строки так же безопасно.
        setThisUserToNlu(controller, { username: '', first_name: '', last_name: '' });
        expect(controller.isNluInit()).toBe(false);
    });

    it('clearStoreData сбрасывает буфер несозданного Nlu', () => {
        setThisUserToNlu(controller, { username: 'ivan', first_name: null, last_name: null });
        expect(controller.isNluInit()).toBe(false);
        controller.clearStoreData();
        // После сброса буфер не должен доехать до нового Nlu
        expect(controller.nlu.getUserName()).toBeNull();
    });

    it('несколько записей до обращения: остаётся последняя', () => {
        setThisUserToNlu(controller, { username: 'first', first_name: null, last_name: null });
        setThisUserToNlu(controller, { username: 'second', first_name: null, last_name: null });
        expect(controller.nlu.getUserName()?.username).toBe('second');
    });
});
