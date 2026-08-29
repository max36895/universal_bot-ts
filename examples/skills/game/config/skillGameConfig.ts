import { IAppConfig } from 'umbot';
import { join } from 'node:path';

export default function (): IAppConfig {
    return {
        // Пример запускается из dist/, поэтому от __dirname (dist/skills/game/config)
        // поднимаемся к папке examples и используем examples/data как хранилище
        json: join(__dirname, '..', '..', '..', '..', 'data'),
        error_log: join(__dirname, '..', '..', '..', '..', 'logs'),
        isLocalStorage: true,
    };
}
