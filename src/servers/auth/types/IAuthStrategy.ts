import { ISocketClient } from '../../../base/sockets/ISocketClient';
import { IAuthInfo } from './IAuthInfo';

export interface IAuthStrategy<TUser, TToken> {
    register(client: ISocketClient, data: any): Promise<IAuthInfo<TUser, TToken>>;
    login(client: ISocketClient, data: any): Promise<IAuthInfo<TUser, TToken>>;
    logout(client: ISocketClient): Promise<void>;
    authenticate(client: ISocketClient, data: any): Promise<TUser>;
}
