import {assert} from 'chai';
import {Navigation} from "../../src/components/standard/Navigation";

describe('Navigation tests', () => {
    let navigation;
    let elements = null;

    beforeEach(() => {
        navigation = new Navigation();
        elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    });

    it('Get max page in navigation', () => {
        assert.equal(navigation.maxVisibleElements, 5);
        assert.equal(navigation.thisPage, 0);
        assert.equal(navigation.getMaxPage(elements), 2);
        elements.push(11);
        assert.equal(navigation.getMaxPage(elements), 3);
    });

    it('Get elements for navigation', () => {
        let tmpElements = navigation.nav(elements, '');
        assert.deepEqual(tmpElements, [1, 2, 3, 4, 5]);

        tmpElements = navigation.nav(elements, 'дальше');
        assert.equal(navigation.thisPage, 1);
        assert.deepEqual(tmpElements, [6, 7, 8, 9, 10]);

        tmpElements = navigation.nav(elements, 'дальше');
        assert.equal(navigation.thisPage, 1);
        assert.deepEqual(tmpElements, [6, 7, 8, 9, 10]);

        tmpElements = navigation.nav(elements, 'назад');
        assert.equal(navigation.thisPage, 0);
        assert.deepEqual(tmpElements, [1, 2, 3, 4, 5]);

        tmpElements = navigation.nav(elements, 'назад');
        assert.equal(navigation.thisPage, 0);
        assert.deepEqual(tmpElements, [1, 2, 3, 4, 5]);
    });

    it('Selected number page', () => {
        navigation.elements = elements;
        assert.isTrue(navigation.numberPage('1 страница'));
        assert.equal(navigation.thisPage, 0);

        assert.isTrue(navigation.numberPage('2 страница'));
        assert.equal(navigation.thisPage, 1);

        assert.isTrue(navigation.numberPage('3 страница'));
        assert.equal(navigation.thisPage, 1);

        assert.isTrue(navigation.numberPage('-2 страница'));
        assert.equal(navigation.thisPage, 0);
    });

    it('Selected element', () => {
        navigation.elements = elements;
        let selectedElement = navigation.selectedElement(elements, `2`);
        assert.equal(selectedElement, 2);
        elements = [];
        for (let i = 0; i < 10; i++) {
            elements.push({
                id: i + 1,
                title: `привет${i}`
            })
        }
        elements[3].title = 'приветствую тебя мир';

        selectedElement = navigation.selectedElement(elements, '2');
        assert.deepEqual(selectedElement, {id: 2, title: 'привет1'});

        selectedElement = navigation.selectedElement(elements, 'приветствую тебя мир', ['title']);
        assert.deepEqual(selectedElement, {id: 4, title: 'приветствую тебя мир'});

        selectedElement = navigation.selectedElement(elements, 'привет', ['title'], 1);
        assert.deepEqual(selectedElement, {id: 10, title: 'привет9'});

        selectedElement = navigation.selectedElement(elements, 'пока', ['title'], 1);
        assert.deepEqual(selectedElement, null);
    });

    it('Page navigation arrow', () => {
        navigation.elements = elements;
        assert.deepEqual(navigation.getPageNav(), ['Дальше 👉']);
        navigation.thisPage = 1;
        assert.deepEqual(navigation.getPageNav(), ['👈 Назад']);
        navigation.maxVisibleElements = 2;
        assert.deepEqual(navigation.getPageNav(), ['👈 Назад', 'Дальше 👉']);
    });

    it('Page navigation number', () => {
        navigation.elements = elements;
        assert.deepEqual(navigation.getPageNav(true), ['[1]', '2']);
        navigation.thisPage = 1;
        assert.deepEqual(navigation.getPageNav(true), ['1', '[2]']);

        navigation.maxVisibleElements = 1;
        assert.deepEqual(navigation.getPageNav(true), ['1', '[2]', '3', '4', '5']);
        navigation.thisPage = 9;
        assert.deepEqual(navigation.getPageNav(true), ['8', '9', '[10]']);

        navigation.thisPage = 4;
        assert.deepEqual(navigation.getPageNav(true), ['3', '4', '[5]', '6', '7']);

    })
});
