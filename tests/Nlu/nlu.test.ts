import {assert} from 'chai'
import {Nlu, INlu} from "../../src";

describe('Nlu test', () => {
    let nlu: Nlu = null;

    beforeEach(() => {
        nlu = new Nlu();
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
                    value: {
                        integer: 512
                    }
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
        assert.isTrue(Nlu.getPhone('123456').status);
        assert.isTrue(Nlu.getPhone('12-34-56').status);
        assert.isTrue(Nlu.getPhone('89999999999').status);
        assert.isTrue(Nlu.getPhone('8(999)999-99-99').status);
        assert.isFalse(Nlu.getPhone('512').status);
        assert.isFalse(Nlu.getPhone('test').status);
    });

    it('Find e-mail', () => {
        assert.isTrue(Nlu.getEMail('test@test.ru').status);
        assert.isTrue(Nlu.getEMail('test@test.test').status);
        assert.isTrue(Nlu.getEMail('test@yandex.ru').status);
        assert.isTrue(Nlu.getEMail('test@google.com').status);
        assert.isFalse(Nlu.getEMail('test').status);
    });

    it('Find link', () => {
        assert.isTrue(Nlu.getLink('https://test.ru').status);
        assert.isTrue(Nlu.getLink('https://test.test').status);
        assert.isTrue(Nlu.getLink('http://test.ru').status);
        assert.isTrue(Nlu.getLink('http://test.test').status);
    });

    it('find user name', () => {
        assert.deepStrictEqual(nlu.getUserName(), {
            username: 'name',
            first_name: 'fn',
            last_name: 'ln'
        });
    });

    it('Get fio', () => {
        assert.isTrue(nlu.getFio().status);
        assert.deepStrictEqual(nlu.getFio().result, [{first_name: 'fn'}]);
    });

    it('Get geo', () => {
        assert.isTrue(nlu.getGeo().status);
        assert.deepStrictEqual(nlu.getGeo().result, [{city: 'city'}]);
    });

    it('Get date time', () => {
        assert.isTrue(nlu.getDateTime().status);
        assert.deepStrictEqual(nlu.getDateTime().result, [{year: 2020}]);
    });

    it('Get number', () => {
        assert.isTrue(nlu.getNumber().status);
        assert.deepStrictEqual(nlu.getNumber().result, [{integer: 512}]);
    });

    it('Get intent', () => {
        assert.deepStrictEqual(nlu.getIntent('custom'), {
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
        assert.isTrue(nlu.getIntent('test') === null);
    });
});
