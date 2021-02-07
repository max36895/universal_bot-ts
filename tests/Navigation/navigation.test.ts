import {assert} from 'chai';
import {Navigation} from "../../src";

describe('Navigation tests', () => {
    let navigation;
    let elements = null;

    beforeEach(() => {
        navigation = new Navigation();
        elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    });

    it('Get max page in navigation', () => {
        assert.strictEqual(navigation.maxVisibleElements, 5);
        assert.strictEqual(navigation.thisPage, 0);
        assert.strictEqual(navigation.getMaxPage(elements), 2);
        elements.push(11);
        assert.strictEqual(navigation.getMaxPage(elements), 3);
    });

    it('Get elements for navigation', () => {
        let tmpElements = navigation.nav(elements, '');
        assert.deepStrictEqual(tmpElements, [1, 2, 3, 4, 5]);

        tmpElements = navigation.nav(elements, 'дальше');
        assert.strictEqual(navigation.thisPage, 1);
        assert.deepStrictEqual(tmpElements, [6, 7, 8, 9, 10]);

        tmpElements = navigation.nav(elements, 'дальше');
        assert.strictEqual(navigation.thisPage, 1);
        assert.deepStrictEqual(tmpElements, [6, 7, 8, 9, 10]);

        tmpElements = navigation.nav(elements, 'назад');
        assert.strictEqual(navigation.thisPage, 0);
        assert.deepStrictEqual(tmpElements, [1, 2, 3, 4, 5]);

        tmpElements = navigation.nav(elements, 'назад');
        assert.strictEqual(navigation.thisPage, 0);
        assert.deepStrictEqual(tmpElements, [1, 2, 3, 4, 5]);
    });

    it('Selected number page', () => {
        navigation.elements = elements;
        assert.isTrue(navigation.numberPage('1 страница'));
        assert.strictEqual(navigation.thisPage, 0);

        assert.isTrue(navigation.numberPage('2 страница'));
        assert.strictEqual(navigation.thisPage, 1);

        assert.isTrue(navigation.numberPage('3 страница'));
        assert.strictEqual(navigation.thisPage, 1);

        assert.isTrue(navigation.numberPage('-2 страница'));
        assert.strictEqual(navigation.thisPage, 0);
    });

    it('Selected element', () => {
        navigation.elements = elements;
        let selectedElement = navigation.selectedElement(elements, `2`);
        assert.strictEqual(selectedElement, 2);
        elements = [];
        for (let i = 0; i < 10; i++) {
            elements.push({
                id: i + 1,
                title: `привет${i}`
            })
        }
        elements[3].title = 'приветствую тебя мир';

        selectedElement = navigation.selectedElement(elements, '2');
        assert.deepStrictEqual(selectedElement, {id: 2, title: 'привет1'});

        selectedElement = navigation.selectedElement(elements, 'приветствую тебя мир', ['title']);
        assert.deepStrictEqual(selectedElement, {id: 4, title: 'приветствую тебя мир'});

        selectedElement = navigation.selectedElement(elements, 'привет', ['title'], 1);
        assert.deepStrictEqual(selectedElement, {id: 10, title: 'привет9'});

        selectedElement = navigation.selectedElement(elements, 'пока', ['title'], 1);
        assert.deepStrictEqual(selectedElement, null);
    });

    it('Page navigation arrow', () => {
        navigation.elements = elements;
        assert.deepStrictEqual(navigation.getPageNav(), ['Дальше 👉']);
        navigation.thisPage = 1;
        assert.deepStrictEqual(navigation.getPageNav(), ['👈 Назад']);
        navigation.maxVisibleElements = 2;
        assert.deepStrictEqual(navigation.getPageNav(), ['👈 Назад', 'Дальше 👉']);
    });

    it('Page navigation number', () => {
        navigation.elements = elements;
        assert.deepStrictEqual(navigation.getPageNav(true), ['[1]', '2']);
        navigation.thisPage = 1;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1', '[2]']);

        navigation.maxVisibleElements = 1;
        navigation.thisPage = 0;
        assert.deepStrictEqual(navigation.getPageNav(true), ['[1]', '2', '3', '4', '5', '... 10']);
        navigation.thisPage = 1;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1', '[2]', '3', '4', '5', '... 10']);
        navigation.thisPage = 2;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1', '2', '[3]', '4', '5', '... 10']);
        navigation.thisPage = 3;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1', '2', '3', '[4]', '5', '6', '... 10']);
        navigation.thisPage = 4;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '3', '4', '[5]', '6', '7', '... 10']);
        navigation.thisPage = 5;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '4', '5', '[6]', '7', '8', '... 10']);
        navigation.thisPage = 6;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '5', '6', '[7]', '8', '9', '10']);
        navigation.thisPage = 7;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '6', '7', '[8]', '9', '10']);
        navigation.thisPage = 8;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '7', '8', '[9]', '10']);
        navigation.thisPage = 9;
        assert.deepStrictEqual(navigation.getPageNav(true), ['1 ...', '8', '9', '[10]']);
    })
});
