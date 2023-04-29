import {Nlu, INlu} from '../../src';

describe('Nlu test', () => {
    let nlu: Nlu = new Nlu();

    beforeEach(() => {
        const nluContent: INlu = {
            thisUser: {
                username: 'name',
                first_name: 'fn',
                last_name: 'ln'
            },
            entities: [
                {
                    type: Nlu.T_GEO,
                    tokens: {
                        start: 0,
                        end: 1
                    },
                    value: {
                        city: "city"
                    }
                },
                {
                    type: Nlu.T_NUMBER,
                    tokens: {
                        start: 0,
                        end: 1
                    },
                    value: 512
                },
                {
                    type: Nlu.T_FIO,
                    tokens: {
                        start: 0,
                        end: 1
                    },
                    value: {
                        first_name: "fn"
                    }
                },
                {
                    type: Nlu.T_DATETIME,
                    tokens: {
                        start: 0,
                        end: 1
                    },
                    value: {
                        year: 2020
                    }
                },
            ],
            intents: {
                custom: {
                    slots: {
                        name: {
                            type: "YANDEX.STRING",
                            tokens: {
                                start: 1,
                                end: 2
                            },
                            value: "test"
                        },
                        action: {
                            type: "YANDEX.STRING",
                            tokens: {
                                start: 2,
                                end: 4
                            },
                            value: "спит"
                        }
                    }
                }
            }
        };
        nlu.setNlu(nluContent);
    });

    it('Find phone', () => {
        expect(Nlu.getPhone('123456').status).toBe(true);
        expect(Nlu.getPhone('12-34-56').status).toBe(true);
        expect(Nlu.getPhone('89999999999').status).toBe(true);
        expect(Nlu.getPhone('8(999).toBe(true)999-99-99').status);
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

    it('find user name', () => {
        expect(nlu.getUserName()).toEqual({
            username: 'name',
            first_name: 'fn',
            last_name: 'ln'
        });
    });

    it('Get fio', () => {
        expect(nlu.getFio().status).toBe(true);
        expect(nlu.getFio().result).toEqual([{first_name: 'fn'}]);
    });

    it('Get geo', () => {
        expect(nlu.getGeo().status).toBe(true);
        expect(nlu.getGeo().result).toEqual([{city: 'city'}]);
    });

    it('Get date time', () => {
        expect(nlu.getDateTime().status).toBe(true);
        expect(nlu.getDateTime().result).toEqual([{year: 2020}]);
    });

    it('Get number', () => {
        expect(nlu.getNumber().status).toBe(true);
        expect(nlu.getNumber().result).toEqual([512]);
    });

    it('Get intent', () => {
        expect(nlu.getIntent('custom')).toEqual({
            slots: {
                name: {
                    type: "YANDEX.STRING",
                    tokens: {
                        start: 1,
                        end: 2
                    },
                    value: "test"
                },
                action: {
                    type: "YANDEX.STRING",
                    tokens: {
                        start: 2,
                        end: 4
                    },
                    value: "спит"
                }
            }
        });
        expect(nlu.getIntent('test') === null).toBe(true);
    });
});
