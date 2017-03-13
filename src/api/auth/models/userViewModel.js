export class UserViewModel {
    constructor(user) {
        this.login = user.login;
        this.email = user.email;
        this.createdDate = user.createdDate;
        this.isLocked = user.isLocked;
    }

    login = null;
    email = null;
    createdDate = null;
    isLocked = null;
}