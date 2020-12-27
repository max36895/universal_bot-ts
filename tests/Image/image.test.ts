import {assert} from 'chai'
import {Image} from "../../src/components/image/Image";

describe('image', () => {
    it('Image init', () => {
        const image = new Image();

        assert.isFalse(image.init('test', ''));

        assert.isTrue(image.init('test', 'title'));
        assert.equal(image.title, 'title');
        assert.equal(image.desc, ' ');
        assert.isTrue(image.imageDir === null);
        assert.equal(image.imageToken, 'test');

        assert.isTrue(image.init('test', 'title', 'desc'));
        assert.equal(image.desc, 'desc');

        assert.isTrue(image.init('https://google.com/image.png', 'title', 'desc'));
        assert.isTrue(image.imageToken === null);

        assert.isTrue(image.init('test', 'title', 'desc', 'btn'));
        assert.equal(image.button.buttons[0].title, 'btn');
        assert.isTrue(image.button.buttons[0].url === null);

        assert.isTrue(image.init('test', 'title', 'desc', {title: 'btn', url: 'https://google.com'}));
        assert.equal(image.button.buttons[1].title, 'btn');
        assert.equal(image.button.buttons[1].url, 'https://google.com');
    });

    it('Image init isToken', () => {
        const image = new Image();
        image.isToken = true;
        assert.isTrue(image.init('https://google.com/image.png', 'title', 'desc'));
        assert.equal(image.imageToken, 'https://google.com/image.png');
    })
});
