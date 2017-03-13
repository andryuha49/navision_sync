import bearerAuthorize from '../../lib/authorization/bearerAuthorize';
import request from 'request';
import sql from 'mssql';
import {Guid} from '../../lib/guid';
import {Logger} from '../../modules/logger';

let _router = null;
let _config = null;
let _logger = null;

var dateToString = function (date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return '' + y + (m < 10 ? '0' + m : m) + (d < 10 ? '0' + d : d);
};

var createAddressText = function (address) {

    return address.countryIso + ', '
    + address.index + ', '
    + address.region + ', '
    + address.city + ', '
    + address.street + ', '
    + address.building
    + address.metro ? ', метро ' + address.metro : '';
};

var addDays = function (date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

var insertNewRow = function (order, lineNumber, dbConn, resultObject, res) {
    var orderDateArray = order.createdAt.split(' ')[0].split('-');
    var orderDate = new Date(orderDateArray[0], parseInt(orderDateArray[1]) + 1, orderDateArray[2]);
    var isDelivery = (order.items && order.items.length <= lineNumber && order.delivery) ? true : false;

    if (order.items && order.items.length >= lineNumber) {

        // IShopID – идентификатор интернет-магазина (см. ниже) – символьное, длина 20,
        // OrderID – уникальный номер WEB-заказа – символьное, длина 10,
        // WHCode – идентификатор Склада выдачи заказа в системе Navision (см. ниже)  – символьное, длина 10,
        // OrderDate – дата заказа – дата в формате ГГГГММДД
        // OrderTime – время заказа – время в формате ЧЧ:ММ:СС
        // PaymentMethod – метод оплаты – символьное, длина 10, допустимые значения {НАЛ, БЕЗНАЛ},
        // DelivRequestDate – требуемая дата доставки покупателю – дата, в формате ГГГГММДД,
        // ReserveTill – дата последнего дня резервирования товара для заказа – дата, в формате ГГГГММДД,
        // ShipToName – имя получателя товара по заказу – символьное, длина до 80, может быть пустым,
        // ShipToAddr – адрес получателя товара по заказу – символьное, длина до 80, может быть пустым,
        // ShipToPhone – телефон получателя товара по заказу – символьное, длина до 30, может быть пустым,
        // OrderComment – комментарий к заказу – символьное, длина до 100, может быть пустым,
        // Manager – менеджер заказа (см. ниже) – символьное, длина 10,
        // MoneyCode – шифр оплаты  (см. ниже) – символьное, длина 8, может быть пустым,
        // BuyerID – уникальный в пределах rCRM идентификатор покупателя – символьное, длина до 20,
        // BuyerGUID – глобально-уникальный идентификатор покупателя – символьное, длина до 36, может быть пустым,
        // BuyerName – имя и/или фамилия и/или иной словесный идентификатор покупателя – символьное, длина до 80,
        // BuyerE-mail – адрес электронной почты покупателя – символьное, длина до 80,
        // BuyerPhone – телефон покупателя – символьное, длина до 30,
        // BuyerType – тип покупателя – целое, допустимые значения {1,2} соответственно 1 – юридическое лицо, 2 – физическое лицо,
        // BuyerDelivAddr – адрес получателя товара по заказу – символьное, длина до 80,
        // LineType – целое, допустимые значения {0,2} соответственно 0 – строка ДОСТАВКА, 2 – строка с товаром,
        // ItemNo – для строк типа 2 код товара в системе Navision, для строк типа 0 код Агента Доставки системе Navision (см. ниже) – символьное, длина до 10,
        // ItemUOM – для строк типа 2 Код единицы измерения товара (см. ниже), для строк типа 0 будет проигнорировано – символьное, длина до 10,
        // Quantity – для строк типа 2 количество, для строк типа 0 будет проигнорировано  – целое положительное,
        // Price – цена за единицу – десятичное положительное, не менее 0,001,
        // LineWHCode – идентификатор Склада наличия товара в системе Navision (см. ниже)  – символьное, длина 10,
        // LastLine – идентификатор последней строки заказа – целое, допустимые значения {0,1} соответственно 0 – строка не последняя, 1 – строка последняя.

        new sql.Request(dbConn)
            .input('IShopID', sql.NVarChar(20), order.site)
            .input('OrderID', sql.NVarChar(20), order.number)
            .input('WHCode', sql.NVarChar(10), order.shipmentStore)
            .input('OrderDate', sql.NVarChar(10), order.createdAt.split(' ')[0].replace(/-/g, ''))
            .input('OrderTime', sql.NVarChar(10), order.createdAt.split(' ')[1])
            .input('PaymentMethod', sql.NVarChar(10), order.paymentType)
            .input('DelivRequestDate', sql.NVarChar(10), order.delivery.date ? order.delivery.date.replace(/-/g, '') : '')
            .input('ReserveTill', sql.NVarChar(10), dateToString(addDays(orderDate, 5)))
            .input('ShipToName', sql.NVarChar(80), order.firstName + ' ' + order.lastName + ' ' + order.patronymic)
            .input('ShipToAddr', sql.NVarChar(80),
                (order.delivery.address.text || createAddressText(order.delivery.address)).substring(0, 80))
            .input('ShipToPhone', sql.NVarChar(30), order.phone || '')
            .input('OrderComment', sql.NVarChar(100), order.customerComment || '')
            .input('Manager', sql.NVarChar(10), order.managerId + '')
            .input('MoneyCode', sql.NVarChar(8), '')
            .input('BuyerID', sql.NVarChar(20), order.customer.externalId)
            .input('BuyerGUID', sql.NVarChar(36), order.customer.externalId)
            .input('BuyerName', sql.NVarChar(80),
                (order.firstName || '') + ' ' + (order.lastName || '') + ' ' + (order.patronymic || ''))
            .input('BuyerEmail', sql.NVarChar(80), order.email)
            .input('BuyerPhone', sql.NVarChar(30), order.phone)
            .input('BuyerType', sql.Int, order.orderType)
            .input('BuyerDelivAddr', sql.NVarChar(80),
                (order.customer.address.text || createAddressText(order.customer.address)).substring(0, 80))
            .input('LineType', sql.Int, isDelivery ? 0 : 2)
            .input('LineNo', sql.Int, lineNumber + 1)
            .input('ItemNo', sql.NVarChar(20),
                isDelivery ? order.delivery.code : order.items[lineNumber].offer.xmlId)
            .input('ItemUOM', sql.NVarChar(10), isDelivery ? '' : 'ШТ')
            .input('Qty', sql.Real, isDelivery ? 1 : order.items[lineNumber].quantity)
            .input('Price', sql.Real,
                isDelivery ? order.delivery.cost : order.items[lineNumber].initialPrice)
            .input('LWHCode', sql.NVarChar(10), isDelivery ? '' : order.items[lineNumber].shipmentStore)
            .input('LastLine', sql.Int, isDelivery ? 1 : 0)
            .execute('WEBKissPoint').then(function (recordsets) {
            var retCode = recordsets[0][0][''];
            if (retCode !== 0) {
                resultObject.status = 'ERROR';
                _logger.error({
                    status: 'ERROR',
                    type: isDelivery ? 'delivery' : 'item',
                    itemId: isDelivery ? 'DELIVERY' : order.items[lineNumber].id,
                    code: retCode
                });
            }
            resultObject.itemsInfo.push({
                status: retCode == 0 ? 'OK' : 'ERROR',
                type: isDelivery ? 'delivery' : 'item',
                itemId: isDelivery ? 'DELIVERY' : order.items[lineNumber].id,
                code: retCode
            });
            insertNewRow(order, lineNumber + 1, dbConn, resultObject, res);
        }).catch(function (err) {
            _logger.error(err);
            resultObject.itemsInfo.push({
                status: 'ERROR',
                itemId: isDelivery ? 'DELIVERY' : order.items[lineNumber].id,
                message: err.message,
                error: err
            });
            if(!isDelivery) {
                insertNewRow(order, lineNumber + 1, dbConn, resultObject, res);
            }
        });
    } else {
        dbConn.close();
        _logger.debug(resultObject);
        res.status(200).json(resultObject);
    }
};

var setOrderInDb = function (order, res) {
    var dbConn = new sql.Connection(_config.orders.sqlServerConnectionConfig);
    try {
        dbConn.connect(function (err) {

            if (err) {
                _logger.error(err);
                return res.status(500).json({status: 'ERROR', message: err.message, error: err});
            }

            var resultObject = {status: 'OK', itemsInfo: []};

            insertNewRow(order, 0, dbConn, resultObject, res);
        });
    } catch (e) {
        dbConn.close();
        _logger.error(e);
        res.status(500).json({status: 'ERROR', message: e.message, error: e});
        throw e;
    }
};

var convertHistoryObject = function (history) {
    var result = {};

    for (var i = 0; i < history.length; i++) {
        var item = history[i];
        if (!result[item.pack.item.id] || result[item.pack.item.id].id < item.id) {
            result[item.pack.item.id] = item;
        }
    }
    return result;
};

var processOrderHistory = function (order, history) {
    var historyObject = convertHistoryObject(history);

    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        item.shipmentStore = historyObject[item.id] ? historyObject[item.id].pack.store.code : '';
    }

    return order;
};

var getOrderHistory = function (order, res) {
    var url = _config.orders.crmServerUrl
        + 'api/v4/orders/packs/history?apiKey=' + _config.orders.crmApiKey + '&filter[orderId]=' + encodeURI(order.id);
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            if (body.success === true) {

                if (body.history && body.history.length > 0) {
                    order = processOrderHistory(order, body.history)
                }

                return setOrderInDb(order, res);
            } else {
                var result = {status: 'ERROR', message: body.errorMsg, errors: body.errors, body: body};
                _logger.error(result);
                return res.status(500).json(result);
            }
        } else {
            _logger.error(error);
            return res.status(500).json({status: 'ERROR', message: error});
        }
    });
};

var getOrderParameters = function (orderId, res) {
    var url = _config.orders.crmServerUrl
        + 'api/v4/orders?apiKey=' + _config.orders.crmApiKey + '&filter[externalIds][]=' + encodeURI(orderId);
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            if (body.success === true) {
                if (body.orders.length > 0) {
                    _logger.debug(body.orders[0]);
                    return getOrderHistory(body.orders[0], res);
                } else {
                    _logger.error('Order not found (orderId:' + orderId + ')');
                    return res.status(500).json({status: 'ERROR', message: 'Order not found'});
                }
            } else {
                _logger.error({status: 'ERROR', message: body.errorMsg, errors: body.errors, body: body});
                return res.status(500)
                    .json({status: 'ERROR', message: body.errorMsg, errors: body.errors, body: body});
            }
        } else {
            _logger.error(error);
            return res.status(500).json({status: 'ERROR', message: error});
        }
    });
};

var getOrderParametersTest = function (orderId, res) {
    var order = require('../../../tests/api/orders/order.json');
    _logger.debug('getOrderParametersTest:');
    _logger.debug(order);
    if (order) {
        return setOrderInDb(order, res);
    }
    _logger.error({status: 'ERROR', message: 'error parse order.json file'});
    return res.status(500).json({status: 'ERROR', message: 'error parse order.json file'});
};

export class OrdersApi {

    constructor(config, router) {
        _config = config;
        _router = router;
        _logger = new Logger();
    }

    bind() {
        _router.get('/:id', this.get);
        _router.post('/', this.post);
        _router.put('/', bearerAuthorize(), this.put);
        _router.delete('/', bearerAuthorize(), this.delete);

        return _router;
    }


    get(req, res) {
        try {
            let id = req.params.id;
            _logger.debug('GET:api.orders:orderId=' + id);
            if (req.query.test == 'true') {
                return getOrderParametersTest(id, res);
            }
            if (!id) {
                return res.status(500).json({message: "Id is require."});
            }
            return getOrderParameters(id, res);
        } catch (e) {
            _logger.error(e);
            return res.status(500).json(e);
        }
    }

    post(req, res) {
        try {
            let order = req.body;
            _logger.debug('POST:api.orders:orderId=' + order.id);
            return getOrderHistory(order, res);
        } catch (e) {
            _logger.error(e);
            return res.status(500).json(e);
        }
    }

    put(req, res) {
        return res.status(500).json({message: "Method not supported"});
    }

    delete(req, res) {
        return res.status(500).json({message: "Method not supported"});
    }
}
