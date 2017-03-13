import * as FileLogger from 'filelogger';
import config from '../config.json';

let logger = null;

export class Logger {
    constructor(){
        var date = new Date();
        var month = parseInt(date.getMonth()) + 1;
        var day = date.getDate();
        let logFile = (config.logger.logFolder + 'log_')
            + date.getFullYear() + '-'
            + (month < 10 ? '0' + month : month) + '-'
            + (day < 10 ? '0' + day : day) + '.log';
        logger = new FileLogger.default('debug', 'warn', logFile);
    }
    error(message) {
        logger.log('error', message);
    }
    warn(message) {
        if(config.logger.logLevel == 'warn' || config.logger.logLevel == 'debug' || config.logger.logLevel == 'info') {
            logger.log('warn', message);
        }
    }
    info(message) {
        if(config.logger.logLevel == 'info' || config.logger.logLevel == 'debug') {
            logger.log('info', message);
        }
    }
    debug(message) {
        if(config.logger.logLevel == 'debug') {
            logger.log('debug', message);
        }
    }
}