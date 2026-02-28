import { getImage, AppContext } from '../../src';
import * as console from 'node:console';

const appContext = new AppContext();
describe('image', () => {
    it('Image init', () => {
        expect(getImage(appContext, 'test', '')).toBe(null);

        let image = getImage(appContext, 'test', 'title');
        expect(image?.title).toEqual('title');
        expect(image?.desc).toEqual(' ');
        expect(image?.imageDir === null).toBe(true);
        expect(image?.imageToken).toEqual('test');

        image = getImage(appContext, 'test', 'title', 'desc');
        expect(image?.desc).toEqual('desc');
        image = getImage(appContext, 'https://google.com/image.png', 'title', 'desc');
        expect(image?.imageToken === null).toBe(true);
        image = getImage(appContext, 'test', 'title', 'desc', 'btn');
        expect(image?.button?.buttons[0].title).toEqual('btn');
        expect(image?.button?.buttons[0].url === null).toBe(true);
        image = getImage(appContext, 'test', 'title', 'desc', {
            title: 'btn',
            url: 'https://google.com',
        });
        expect(image?.button?.buttons[0].title).toEqual('btn');
        expect(image?.button?.buttons[0].url).toEqual(
            'https://google.com?utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );
    });

    it('Image init isToken', () => {
        const image = getImage(
            appContext,
            'https://google.com/image.png',
            'title',
            'desc',
            null,
            true,
        );
        expect(image?.imageToken).toEqual('https://google.com/image.png');
    });
});
