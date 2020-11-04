import {assert} from 'chai'
import {Nlu} from "../../bot/components/nlu/Nlu";
import {INlu} from "../../bot/components/nlu/interfaces/INlu";

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
        assert.isTrue(nlu.getPhone('123456').status);
        assert.isTrue(nlu.getPhone('12-34-56').status);
        assert.isTrue(nlu.getPhone('89999999999').status);
        assert.isTrue(nlu.getPhone('8(999)999-99-99').status);
        assert.isFalse(nlu.getPhone('512').status);
        assert.isFalse(nlu.getPhone('test').status);
    });

    it('Find e-mail', () => {
        assert.isTrue(nlu.getEMail('test@test.ru').status);
        assert.isTrue(nlu.getEMail('test@test.test').status);
        assert.isTrue(nlu.getEMail('test@yandex.ru').status);
        assert.isTrue(nlu.getEMail('test@google.com').status);
        assert.isFalse(nlu.getEMail('test').status);
    });

    it('Find link', () => {
        assert.isTrue(nlu.getLink('https://test.ru').status);
        assert.isTrue(nlu.getLink('https://test.test').status);
        assert.isTrue(nlu.getLink('http://test.ru').status);
        assert.isTrue(nlu.getLink('http://test.test').status);
    });

    it('find user name', () => {
        assert.deepEqual(nlu.getUserName(), {
            username: 'name',
            first_name: 'fn',
            last_name: 'ln'
        });
    });

    it('Get fio', () => {
        assert.isTrue(nlu.getFio().status);
        assert.deepEqual(nlu.getFio().result, [{first_name: 'fn'}]);
    });

    it('Get geo', () => {
        assert.isTrue(nlu.getGeo().status);
        assert.deepEqual(nlu.getGeo().result, [{city: 'city'}]);
    });

    it('Get date time', () => {
        assert.isTrue(nlu.getDateTime().status);
        assert.deepEqual(nlu.getDateTime().result, [{year: 2020}]);
    });

    it('Get number', () => {
        assert.isTrue(nlu.getNumber().status);
        assert.deepEqual(nlu.getNumber().result, [{integer: 512}]);
    });

    it('Get intent', () => {
        assert.deepEqual(nlu.getIntent('custom'), {
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
        assert.isNull(nlu.getIntent('test'));
    });
});
