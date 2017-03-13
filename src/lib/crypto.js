import crypto from 'crypto';

export class Crypto {

    sha512(text, salt) {
        var hash = crypto.createHmac('sha512', salt);
        /** Hashing algorithm sha512 */
        hash.update(text);
        let value = hash.digest('hex');
        return value;
    }
}