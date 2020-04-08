import { IWSError } from '../../types/IWSError';
import { WSErrorCode } from '../../types/WSErrorCode';
import { ISocketServer } from '../../base/sockets/ISocketServer';
import { ISocketClient } from '../../base/sockets/ISocketClient';
import { RestProtocolServer } from '../../base/rest/RestProtocolServer';

import { WSServer } from '../../WSServer';
import { ModuleBase } from '../ModuleBase';

import { IAuthRequest } from './messages/IAuthRequest';
import { IAuthStrategy } from './types/IAuthStrategy';
import { AuthInfoCollection } from './types/AuthInfoCollection';
import { SimpleEventDispatcher } from 'strongly-typed-events';
import { IAuthInfo } from './types/IAuthInfo';
import { IAuthResponse } from './messages/IAuthResponse';

export interface RegisterEventArgs<TUser, TToken> { client: ISocketClient; data: any; authInfo: IAuthInfo<TUser, TToken>; }
export interface LoginEventArgs<TUser, TToken> { client: ISocketClient; data: any; authInfo: IAuthInfo<TUser, TToken>; }
export interface AuthenticateEventArgs<TUser, TToken> { client: ISocketClient; authInfo: IAuthInfo<TUser, TToken>; }
export interface LogoutEventArgs<TUser, TToken> { client: ISocketClient; authInfo: IAuthInfo<TUser, TToken>; }

export class AuthServer<TUser, TToken> extends ModuleBase<TUser, TToken> {

    //#region [ field ]
    private _restProtocol = new RestProtocolServer<IAuthRequest, IAuthResponse>('auth');
    private _isLoginRequired = false;
    private _loginRequiredTimeoutHandles: { [clientId: string]: NodeJS.Timeout } = {};
    private _server: ISocketServer;
    //#endregion

    //#region [ events ]
    public readonly onRegister = new SimpleEventDispatcher<RegisterEventArgs<TUser, TToken>>();
    public readonly onLogin = new SimpleEventDispatcher<LoginEventArgs<TUser, TToken>>();
    public readonly onAuthenticate = new SimpleEventDispatcher<AuthenticateEventArgs<TUser, TToken>>();
    public readonly onLogout = new SimpleEventDispatcher<LogoutEventArgs<TUser, TToken>>();
    public readonly onTimeout = new SimpleEventDispatcher<ISocketClient>();
    //#endregion

    //#region  [ public ]
    public get isLoginRequired() {
        return this._isLoginRequired;
    }
    public set isLoginRequired(value: boolean) {
        this._isLoginRequired = value;
        if (value == false) {
            Object.keys(this._loginRequiredTimeoutHandles).forEach(id => {
                clearTimeout(this._loginRequiredTimeoutHandles[id]);
                delete this._loginRequiredTimeoutHandles[id];
            });
        }
    }
    public loginRequiredTimeout = 10000;
    public strategy: IAuthStrategy<TUser, TToken>;
    public readonly authInfos = new AuthInfoCollection<TUser, TToken>();
    //#endregion

    //#region [ constructor ]
    constructor(wss: WSServer<TUser, TToken>, strategy: IAuthStrategy<TUser, TToken>) {
        super(wss);
        this.strategy = strategy;
        this._restProtocol.on(async (server, client, req) => {
            switch (req.method) {
                case 'register': {
                    try {
                        const res = await this.strategy.register(client, req.data);
                        this.authInfos.addOrUpdate(client.id, res);
                        this.onRegister.dispatch({ client, data: req.data, authInfo: res });
                        this.removeClient(client);
                        return res;
                    } catch (err) {
                        throw { code: WSErrorCode.ws_auth_invalid_data, message: err.message ? err.message : `register error` } as IWSError;
                    }
                }
                case 'login': {
                    try {
                        const res = await this.strategy.login(client, req.data);
                        this.authInfos.addOrUpdate(client.id, res);
                        this.onLogin.dispatch({ client, data: req.data, authInfo: res });
                        this.removeClient(client);
                        return res;
                    } catch (err) {
                        throw { code: WSErrorCode.ws_auth_invalid_data, message: err.message ? err.message : `login error` } as IWSError;
                    }
                }
                case 'authenticate': {
                    try {
                        const token = req.data;
                        const user = await this.strategy.authenticate(client, token);
                        const authInfo = { token, user };
                        this.authInfos.addOrUpdate(client.id, authInfo);
                        this.onAuthenticate.dispatch({ client, authInfo });
                        this.removeClient(client);
                        return authInfo;
                    } catch (err) {
                        this.authInfos.remove(client.id);
                        throw { code: WSErrorCode.ws_auth_invalid_token, message: err.message ? err.message : undefined } as IWSError;
                    }
                }
                case 'logout':
                    if (this.authInfos.exists(client.id)) {
                        await this.strategy.logout(client);
                        const authInfo = this.authInfos.get(client.id);
                        this.authInfos.remove(client.id);
                        this.onLogout.dispatch({ client, authInfo });
                    }
                    this.addClient(client);
                    break;
                default: throw {
                    code: WSErrorCode.ws_auth_error,
                    message: new Error(`method '${req.method} not implemented`),
                };
            }
        });
    }
    //#endregion

    //#region [ ServerBase ]
    public init(server: ISocketServer): void {
        this._server = server;
        this._restProtocol.init(server);
        server.onConnection(client => {
            this.addClient(client);
            client.onDisconnect(() => {
                this.removeClient(client);
                this.authInfos.remove(client.id);
            });
        });
    }
    //#endregion

    //#region [ private ]
    public addClient(client: ISocketClient) {
        if (this._isLoginRequired) {
            this._loginRequiredTimeoutHandles[client.id] = setTimeout(() => {
                clearTimeout(this._loginRequiredTimeoutHandles[client.id]);
                delete this._loginRequiredTimeoutHandles[client.id];
                client.disconnect();
                this.onTimeout.dispatch(client);
            }, this.loginRequiredTimeout);
        }
    }
    public removeClient(client: ISocketClient) {
        if (this._isLoginRequired) {
            clearTimeout(this._loginRequiredTimeoutHandles[client.id]);
            delete this._loginRequiredTimeoutHandles[client.id];
        }
    }
    //#endregion
}
