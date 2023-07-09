"use strict";
const CreateController = require('./CreateController').create;

const VERSION = '1.5.0';

/**
 * Консольный скрипт, позволяющий создать пустой проект.
 * @param param
 */
function main(param = {appName: null, command: null, mode: 'prod', hostname: 'localhost', port: 3000}) {
    const infoText = "Доступные параметры:\n\ncreate (project name) - Создать новый навык/бот. В качестве параметра передается название проекта(На Английском языке) или json файл с параметрами.";
    if (param && param.command) {
        switch (param.command) {
            case 'create':
                const create = new CreateController();
                create.params = param.params;
                let type = CreateController.T_DEFAULT;
                if (param.params && param.params.type) {
                    let paramType = param.params.type.toLowerCase();
                    paramType = paramType.substr(0, 1).toUpperCase() + paramType.substr(1);
                    if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].indexOf(paramType)) {
                        type = paramType;
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
