import {assert} from 'chai'
import {Image} from "../../src";

describe('image', () => {
    it('Image init', () => {
        const image = new Image();

        assert.isFalse(image.init('test', ''));

        assert.isTrue(image.init('test', 'title'));
        assert.strictEqual(image.title, 'title');
        assert.strictEqual(image.desc, ' ');
        assert.isTrue(image.imageDir === null);
        assert.strictEqual(image.imageToken, 'test');

        assert.isTrue(image.init('test', 'title', 'desc'));
        assert.strictEqual(image.desc, 'desc');

        assert.isTrue(image.init('https://google.com/image.png', 'title', 'desc'));
        assert.isTrue(image.imageToken === null);

        assert.isTrue(image.init('test', 'title', 'desc', 'btn'));
        assert.strictEqual(image.button.buttons[0].title, 'btn');
        assert.isTrue(image.button.buttons[0].url === null);

        assert.isTrue(image.init('test', 'title', 'desc', {title: 'btn', url: 'https://google.com'}));
        assert.strictEqual(image.button.buttons[1].title, 'btn');
        assert.strictEqual(image.button.buttons[1].url, 'https://google.com');
    });

    it('Image init isToken', () => {
        const image = new Image();
        image.isToken = true;
        assert.isTrue(image.init('https://google.com/image.png', 'title', 'desc'));
        assert.strictEqual(image.imageToken, 'https://google.com/image.png');
    })
});
