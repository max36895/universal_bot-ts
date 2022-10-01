import {Navigation} from '../../src';

describe('Navigation tests', () => {
    let navigation: Navigation<number | { id: number, title: string }>;
    let elements: any = null;

    beforeEach(() => {
        navigation = new Navigation();
        elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    });

    it('Get max page in navigation', () => {
        expect(navigation.maxVisibleElements).toEqual(5);
        expect(navigation.thisPage).toEqual(0);
        expect(navigation.getMaxPage(elements)).toEqual(2);
        elements.push(11);
        expect(navigation.getMaxPage(elements)).toEqual(3);
    });

    it('Get elements for navigation', () => {
        let tmpElements = navigation.getPageElements(elements, '');
        expect(tmpElements).toEqual([1, 2, 3, 4, 5]);

        tmpElements = navigation.getPageElements(elements, 'дальше');
        expect(navigation.thisPage).toEqual(1);
        expect(tmpElements).toEqual([6, 7, 8, 9, 10]);

        tmpElements = navigation.getPageElements(elements, 'дальше');
        expect(navigation.thisPage).toEqual(1);
        expect(tmpElements).toEqual([6, 7, 8, 9, 10]);

        tmpElements = navigation.getPageElements(elements, 'назад');
        expect(navigation.thisPage).toEqual(0);
        expect(tmpElements).toEqual([1, 2, 3, 4, 5]);

        tmpElements = navigation.getPageElements(elements, 'назад');
        expect(navigation.thisPage).toEqual(0);
        expect(tmpElements).toEqual([1, 2, 3, 4, 5]);
    });

    it('Selected number page', () => {
        navigation.elements = elements;
        expect(navigation.numberPage('1 страница')).toBe(true);
        expect(navigation.thisPage).toEqual(0);

        expect(navigation.numberPage('2 страница')).toBe(true);
        expect(navigation.thisPage).toEqual(1);

        expect(navigation.numberPage('3 страница')).toBe(true);
        expect(navigation.thisPage).toEqual(1);

        expect(navigation.numberPage('-2 страница')).toBe(true);
        expect(navigation.thisPage).toEqual(0);
    });

    it('Selected element', () => {
        navigation.elements = elements;
        let selectedElement = navigation.selectedElement(elements, `2`);
        expect(selectedElement).toEqual(2);
        elements = [];
        for (let i = 0; i < 10; i++) {
            elements.push({
                id: i + 1,
                title: `привет${i}`
            })
        }
        elements[3].title = 'приветствую тебя мир';

        selectedElement = navigation.selectedElement(elements, '2');
        expect(selectedElement).toEqual({id: 2, title: 'привет1'});

        selectedElement = navigation.selectedElement(elements, 'приветствую тебя мир', ['title']);
        expect(selectedElement).toEqual({id: 4, title: 'приветствую тебя мир'});

        selectedElement = navigation.selectedElement(elements, 'привет', ['title'], 1);
        expect(selectedElement).toEqual({id: 6, title: 'привет5'});

        selectedElement = navigation.selectedElement(elements, 'пока', ['title'], 1);
        expect(selectedElement).toEqual(null);
    });

    it('Page navigation arrow', () => {
        navigation.elements = elements;
        expect(navigation.getPageNav()).toEqual(['Дальше 👉']);
        navigation.thisPage = 1;
        expect(navigation.getPageNav()).toEqual(['👈 Назад']);
        navigation.maxVisibleElements = 2;
        expect(navigation.getPageNav()).toEqual(['👈 Назад', 'Дальше 👉']);
    });

    it('Page navigation number', () => {
        navigation.elements = elements;
        expect(navigation.getPageNav(true)).toEqual(['[1]', '2']);
        navigation.thisPage = 1;
        expect(navigation.getPageNav(true)).toEqual(['1', '[2]']);

        navigation.maxVisibleElements = 1;
        navigation.thisPage = 0;
        expect(navigation.getPageNav(true)).toEqual(['[1]', '2', '3', '4', '5', '... 10']);
        navigation.thisPage = 1;
        expect(navigation.getPageNav(true)).toEqual(['1', '[2]', '3', '4', '5', '... 10']);
        navigation.thisPage = 2;
        expect(navigation.getPageNav(true)).toEqual(['1', '2', '[3]', '4', '5', '... 10']);
        navigation.thisPage = 3;
        expect(navigation.getPageNav(true)).toEqual(['1', '2', '3', '[4]', '5', '6', '... 10']);
        navigation.thisPage = 4;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '3', '4', '[5]', '6', '7', '... 10']);
        navigation.thisPage = 5;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '4', '5', '[6]', '7', '8', '... 10']);
        navigation.thisPage = 6;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '5', '6', '[7]', '8', '9', '10']);
        navigation.thisPage = 7;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '6', '7', '[8]', '9', '10']);
        navigation.thisPage = 8;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '7', '8', '[9]', '10']);
        navigation.thisPage = 9;
        expect(navigation.getPageNav(true)).toEqual(['1 ...', '8', '9', '[10]']);
    })
});
