import {IQueryData, QueryData} from '../../src/models/db';

describe('queryData', () => {
    it('getQueryData', () => {
        let result: IQueryData | null = QueryData.getQueryData('');
        expect(result === null).toBe(true);

        result = QueryData.getQueryData('`test`=512');
        expect({test: 512}).toEqual(result);

        result = QueryData.getQueryData('`test`="test"');
        expect({test: "test"}).toEqual( result);

        result = QueryData.getQueryData('`test1`=512 `test2`="test"');
        expect({test1: 512, test2: "test"}).toEqual( result);

        result = QueryData.getQueryData('`test`=512 ');
        expect({test: 512}).toEqual( result);
    });
});
