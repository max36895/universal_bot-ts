const CreateController = require('./CreateController').create;

VERSION = '1.0';

/**
 * Консольный скрипт, позволяющий моментально создать проект.
 * @param param
 */
function main(param = {appName: null, command: null}) {
    const infoText = "Доступные параметры:\n\ncreate (project name) - Создать новый навык/бот. В качестве параметра передается название проекта(На Английском языке) или json файл с параметрами.";
    if (param && param.command) {
        switch (param.command) {
            case 'create':
                const create = new CreateController();
                create.params = param.params;
                let type = CreateController.T_DEFAULT;
                if (param.params && param.params.type) {
                    let pType = param.params.type.toLowerCase();
                    pType = pType.substr(0, 1).toUpperCase() + pType.substr(1);
                    if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(pType)) {
                        type = pType;
                    } else {
                        throw new Exception('Указан не поддерживаемый тип для создания шаблона!');
                    }
                }
                create.init(param.appName, type);
                break;

            case '-v':
            case 'version':
                console.log(`version: ${VERSION}\n`);
                break;

            default:
                console.log(infoText);
                break;
        }
    } else {
        console.log(infoText);
    }
}

exports.main = main;
