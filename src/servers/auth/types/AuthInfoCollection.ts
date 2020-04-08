import { IAuthInfo } from './IAuthInfo';

export class AuthInfoCollection<TUser, TToken> {

    private _authInfoByClientId: { [socketId: string]: IAuthInfo<TUser, TToken> } = {};

    addOrUpdate(id: string, value: IAuthInfo<TUser, TToken>) {
        this._authInfoByClientId[id] = value;
    }
    remove(id: string) {
        if (this._authInfoByClientId[id]) {
            delete this._authInfoByClientId[id];
        }
    }
    get(id: string): IAuthInfo<TUser, TToken> {
        return this._authInfoByClientId[id];
    }
    exists(id: string) {
        return this._authInfoByClientId[id] ? true : false;
    }
}
