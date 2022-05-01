import {assert} from 'chai'
import {IQueryData, QueryData} from "../../src/models";

describe('queryData', () => {
    it('getQueryData', () => {
        let result: IQueryData | null = QueryData.getQueryData('');
        assert.isTrue(result === null);

        result = QueryData.getQueryData('`test`=512');
        assert.deepStrictEqual({test: 512}, result);

        result = QueryData.getQueryData('`test`="test"');
        assert.deepStrictEqual({test: "test"}, result);

        result = QueryData.getQueryData('`test1`=512 `test2`="test"');
        assert.deepStrictEqual({test1: 512, test2: "test"}, result);

        result = QueryData.getQueryData('`test`=512 ');
        assert.deepStrictEqual({test: 512}, result);
    });
});
