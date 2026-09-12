import { Nlu, INlu } from '../../src';
const nluContent: INlu = {
    thisUser: {
        username: 'name',
        first_name: 'fn',
        last_name: 'ln',
    },
    entities: [
        {
            type: Nlu.T_GEO,
            tokens: {
                start: 0,
                end: 1,
            },
            value: {
                city: 'city',
            },
        },
        {
            type: Nlu.T_NUMBER,
            tokens: {
                start: 0,
                end: 1,
            },
            value: 512,
        },
        {
            type: Nlu.T_FIO,
            tokens: {
                start: 0,
                end: 1,
            },
            value: {
                first_name: 'fn',
            },
        },
        {
            type: Nlu.T_DATETIME,
            tokens: {
                start: 0,
                end: 1,
            },
            value: {
                year: 2020,
            },
        },
    ],
    intents: {
        custom: {
            slots: {
                name: {
                    type: 'YANDEX.STRING',
                    tokens: {
                        start: 1,
                        end: 2,
                    },
                    value: 'test',
                },
                action: {
                    type: 'YANDEX.STRING',
                    tokens: {
                        start: 2,
                        end: 4,
                    },
                    value: 'спит',
                },
            },
        },
    },
};
describe('Nlu test', () => {
    const nlu: Nlu = new Nlu();

    beforeEach(() => {
        nlu.setNlu(nluContent);
    });

    it('Find phone', () => {
        expect(Nlu.getPhone('123456').status).toBe(true);
        expect(Nlu.getPhone('12-34-56').status).toBe(true);
        expect(Nlu.getPhone('89999999999').status).toBe(true);
        expect(Nlu.getPhone('8(999)999-99-99').status).toBe(true);
        expect(Nlu.getPhone('512').status).toBe(false);
        expect(Nlu.getPhone('test').status).toBe(false);
    });

    it('Find e-mail', () => {
        expect(Nlu.getEMail('test@test.ru').status).toBe(true);
        expect(Nlu.getEMail('test@test.test').status).toBe(true);
        expect(Nlu.getEMail('test@yandex.ru').status).toBe(true);
        expect(Nlu.getEMail('test@google.com').status).toBe(true);
        expect(Nlu.getEMail('test').status).toBe(false);
    });

    it('Find link', () => {
        expect(Nlu.getLink('https://test.ru').status).toBe(true);
        expect(Nlu.getLink('https://test.test').status).toBe(true);
        expect(Nlu.getLink('http://test.ru').status).toBe(true);
        expect(Nlu.getLink('http://test.test').status).toBe(true);
    });

    it('Find link: полное значение не обрезается на точках', () => {
        // Регрессия: регулярка исключала точку из совпадения и резала любую ссылку
        // на первой же точке (https://example.com/path.html -> https://example).
        expect(Nlu.getLink('https://example.com/path/page.html').result).toEqual([
            'https://example.com/path/page.html',
        ]);
        expect(Nlu.getLink('http://site.ru:3000/app').result).toEqual(['http://site.ru:3000/app']);
        expect(Nlu.getLink('Зайди на https://ya.ru сегодня').result).toEqual(['https://ya.ru']);
        expect(Nlu.getLink('Две: https://a.ru и http://b.com/x?y=1').result).toEqual([
            'https://a.ru',
            'http://b.com/x?y=1',
        ]);
    });

    it('Find link: концевая пунктуация не попадает в ссылку', () => {
        expect(Nlu.getLink('Ссылка: https://ya.ru.').result).toEqual(['https://ya.ru']);
        expect(Nlu.getLink('Смотрите (https://example.com/page).').result).toEqual([
            'https://example.com/page',
        ]);
        expect(Nlu.getLink('Перечень: https://a.ru, https://b.ru!').result).toEqual([
            'https://a.ru',
            'https://b.ru',
        ]);
    });

    it('find user name', () => {
        expect(nlu.getUserName()).toEqual({
            username: 'name',
            first_name: 'fn',
            last_name: 'ln',
        });
    });

    it('Get fio', () => {
        expect(nlu.getFio().status).toBe(true);
        expect(nlu.getFio().result).toEqual([{ first_name: 'fn' }]);
    });

    it('Get geo', () => {
        expect(nlu.getGeo().status).toBe(true);
        expect(nlu.getGeo().result).toEqual([{ city: 'city' }]);
    });

    it('Get date time', () => {
        expect(nlu.getDateTime().status).toBe(true);
        expect(nlu.getDateTime().result).toEqual([{ year: 2020 }]);
    });

    it('Get number', () => {
        expect(nlu.getNumber().status).toBe(true);
        expect(nlu.getNumber().result).toEqual([512]);
    });

    it('Get intent', () => {
        expect(nlu.getIntent('custom')).toEqual({
            slots: {
                name: {
                    type: 'YANDEX.STRING',
                    tokens: {
                        start: 1,
                        end: 2,
                    },
                    value: 'test',
                },
                action: {
                    type: 'YANDEX.STRING',
                    tokens: {
                        start: 2,
                        end: 4,
                    },
                    value: 'спит',
                },
            },
        });
        expect(nlu.getIntent('test') === null).toBe(true);
    });

    it('isIntentConfirm', () => {
        expect(nlu.isIntentConfirm('да')).toBe(true);
        expect(nlu.isIntentConfirm('конечно')).toBe(true);
        expect(nlu.isIntentConfirm('подтверждаю')).toBe(true);
        expect(nlu.isIntentConfirm('подтверждаю')).toBe(true);
        expect(nlu.isIntentConfirm('нет')).toBe(false);
        expect(nlu.isIntentConfirm('неа')).toBe(false);
        expect(nlu.isIntentConfirm('не')).toBe(false);
        expect(nlu.isIntentConfirm('незнайка')).toBe(false);
        const nluConfig: INlu = {
            ...nluContent,
            intents: {
                [Nlu.T_INTENT_CONFIRM]: {
                    slots: [],
                },
            },
        };
        nlu.setNlu(nluConfig);
        expect(nlu.isIntentConfirm('нет')).toBe(true);
    });
    it('isIntentReject', () => {
        expect(nlu.isIntentReject('да')).toBe(false);
        expect(nlu.isIntentReject('конечно')).toBe(false);
        expect(nlu.isIntentReject('подтверждаю')).toBe(false);
        expect(nlu.isIntentReject('подтверждаю')).toBe(false);
        expect(nlu.isIntentReject('нет')).toBe(true);
        expect(nlu.isIntentReject('неа')).toBe(true);
        expect(nlu.isIntentReject('не')).toBe(true);
        expect(nlu.isIntentReject('незнайка')).toBe(false);
        const nluConfig: INlu = {
            ...nluContent,
            intents: {
                [Nlu.T_INTENT_REJECT]: {
                    slots: [],
                },
            },
        };
        nlu.setNlu(nluConfig);
        // Если платформа прислала REJECT-интент (даже с пустыми slots),
        // он в приоритете над текстовой эвристикой: 'да' трактуется как отказ.
        expect(nlu.isIntentReject('да')).toBe(true);
    });

    it('isIntentHelp', () => {
        expect(nlu.isIntentHelp()).toBe(false);

        const nluConfig: INlu = {
            ...nluContent,
            intents: {
                [Nlu.T_INTENT_HELP]: {
                    slots: [],
                },
            },
        };
        nlu.setNlu(nluConfig);
        expect(nlu.isIntentHelp()).toBe(true);
    });

    it('isIntentRepeat', () => {
        expect(nlu.isIntentRepeat()).toBe(false);

        const nluConfig: INlu = {
            ...nluContent,
            intents: {
                [Nlu.T_INTENT_REPEAT]: {
                    slots: [],
                },
            },
        };
        nlu.setNlu(nluConfig);
        expect(nlu.isIntentRepeat()).toBe(true);
    });
});

describe('Nlu.getLink: граничные случаи', () => {
    it('схема без адреса ссылкой не считается', () => {
        expect(Nlu.getLink('http://...').result).toBeNull();
        expect(Nlu.getLink('см. https://). и дальше http://ok.ru').result).toEqual([
            'http://ok.ru',
        ]);
    });

    it('не зависает на длинной строке без пробелов', () => {
        const start = performance.now();
        Nlu.getLink('http://'.repeat(20_000) + '.'.repeat(20_000));
        expect(performance.now() - start).toBeLessThan(500);
    });
});
