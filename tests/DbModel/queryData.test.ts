import { IQueryData, getQueryData } from '../../src';

describe('queryData', () => {
    it('getQueryData', () => {
        let result: IQueryData | null = getQueryData('');
        expect(result === null).toBe(true);

        result = getQueryData('`test`=512');
        expect({ test: 512 }).toEqual(result);

        result = getQueryData('`test`="test"');
        expect({ test: 'test' }).toEqual(result);

        result = getQueryData('`test1`=512 `test2`="test"');
        expect({ test1: 512, test2: 'test' }).toEqual(result);

        result = getQueryData('`test`=512 ');
        expect({ test: 512 }).toEqual(result);
    });
});
