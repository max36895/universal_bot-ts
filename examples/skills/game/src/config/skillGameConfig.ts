import { IAppConfig } from 'umbot';
import { join } from 'node:path';

export default function (): IAppConfig {
    return {
        json: join(__dirname, '..', 'json'),
        error_log: join(__dirname, '..', 'errors'),
        isLocalStorage: true,
    };
}
