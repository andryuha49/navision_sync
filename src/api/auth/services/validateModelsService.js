
export class ValidateModelsService {

    validateLoginModel(model) {
        if (!model.login) {
            return false;
        }
        if (!model.password) {
            return false;
        }
        return true;
    }

    validateRegisterModel(model) {
        if (!model.login) {
            return false;
        }
        if (!model.email) {
            return false;
        }
        if (!model.password) {
            return false;
        }
        return true;
    }
}