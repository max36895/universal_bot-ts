import {IAppConfig} from "../../src/core/mmApp";

export default function (): IAppConfig {
    return {
        json: __dirname + '/../json',
        error_log: __dirname + '/../errors',
    };
}
