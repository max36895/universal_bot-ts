import { Image, AppContext } from '../../src';
const appContext = new AppContext();
describe('image', () => {
    it('Image init', () => {
        const image = new Image(appContext);

        expect(image.init('test', '')).toBe(false);

        expect(image.init('test', 'title')).toBe(true);
        expect(image.title).toEqual('title');
        expect(image.desc).toEqual(' ');
        expect(image.imageDir === null).toBe(true);
        expect(image.imageToken).toEqual('test');

        expect(image.init('test', 'title', 'desc')).toBe(true);
        expect(image.desc).toEqual('desc');

        expect(image.init('https://google.com/image.png', 'title', 'desc')).toBe(true);
        expect(image.imageToken === null).toBe(true);

        expect(image.init('test', 'title', 'desc', 'btn')).toBe(true);
        expect(image.button.buttons[0].title).toEqual('btn');
        expect(image.button.buttons[0].url === null).toBe(true);

        expect(
            image.init('test', 'title', 'desc', { title: 'btn', url: 'https://google.com' }),
        ).toBe(true);
        expect(image.button.buttons[1].title).toEqual('btn');
        expect(image.button.buttons[1].url).toEqual(
            'https://google.com?utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );
    });

    it('Image init isToken', () => {
        const image = new Image(appContext);
        image.isToken = true;
        expect(image.init('https://google.com/image.png', 'title', 'desc')).toBe(true);
        expect(image.imageToken).toEqual('https://google.com/image.png');
    });
});
