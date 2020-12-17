import 'reflect-metadata';

import { RestProtocolServer } from '../../base/rest/RestProtocolServer';
import { WSErrorCode } from '../../types/WSErrorCode';
import { ISocketServer } from '../../base/sockets/ISocketServer';
import { ISocketClient } from '../../base/sockets/ISocketClient';
import { IDecoratorOptionsBase } from '../../decorators/IDecoratorOptionsBase';
import { RestDecoratorOptions, restDecoratorKey } from './decorators/RestDecorator';
import { IParamMetadata } from '../../decorators/IParamMetadata';
import { Reflection } from '../../types/Reflection';

import { WSServer } from '../../WSServer';
import { ModuleBase } from '../ModuleBase';

import { IRestRequest } from './messages/IRestRequest';
import { RestServiceCollection } from './types/RestServiceCollection';
import { SimpleEventDispatcher } from 'strongly-typed-events';
import { IRestMethodDescriptor } from './types/IRestMethodDescriptor';
import { IWSError } from '../../types/IWSError';
import { IRestResponse } from './messages/IRestResponse';

interface RequestEventArgs { client: ISocketClient; service: string; method: string; data: any; result?: any; error?: IWSError; }

export class RestServer<TUser, TToken> extends ModuleBase<TUser, TToken>  {

    //#region [ fields ]
    private _services = new RestServiceCollection();
    private _restProtocol = new RestProtocolServer<IRestRequest, IRestResponse>('rest');
    //#endregion

    //#region [ events ]
    public readonly onRegister = new SimpleEventDispatcher<IRestMethodDescriptor>();
    public readonly onRequest = new SimpleEventDispatcher<RequestEventArgs>();
    //#endregion

    //#region [ constructor ]
    constructor(wss: WSServer<TUser, TToken>) {
        super(wss);
        this._restProtocol.on(async (server, client, req: IRestRequest) => {
            const data = req.data;
            const service = req.service;
            const method = req.method;

            if (!this._services.exists(service, method)) {
                const error = {
                    code: WSErrorCode.ws_rest_method_error,
                    message: `service '${service}' or method '${method}' not found.`,
                };
                this.onRequest.dispatch({ client, service, method, data, error });
                throw error;
            } else {
                const descriptor = this._services.get(req);
                const code = await this.isValid(
                    client.id,
                    descriptor.metadata.target,
                    descriptor.options,
                );
                if (code != WSErrorCode.none) {
                    const error = {
                        code,
                        message: `unauthorized`,
                    };
                    this.onRequest.dispatch({ client, service, method, data, error });
                    throw error;
                } else {
                    try {
                        const target = descriptor.metadata.target as any;
                        const methodFunc = target[method];
                        const params = descriptor.metadata.params;
                        const args = this.injectParams(client, req, params);

                        let result: any = methodFunc.call(target, ...args);
                        if (Reflection.isPromise(result)) {
                            result = await result;
                        }
                        this.onRequest.dispatch({ client, service, method, data, result });
                        return result;
                    } catch (err) {
                        const error = {
                            code: WSErrorCode.ws_rest_method_error,
                            message: err.message,
                        };
                        this.onRequest.dispatch({ client, service, method, data, error });
                        throw error;
                    }
                }
            }
        });
    }
    //#endregion

    //#region [ ServerBase ]
    public init(server: ISocketServer) {
        this._restProtocol.init(server);
    }

    public register(instance: any) {
        Reflection.getMethods(instance).forEach(propertyKey => {
            const options: RestDecoratorOptions = Reflect.getMetadata(restDecoratorKey, instance, propertyKey);
            if (options) {

                const service = options.service
                    ? options.service
                    : Reflection.extractServicePropertyFromInstance(instance);

                options.isAuth = options.isAuth
                    ? options.isAuth
                    : Reflection.extractIsAuthPropertyFromInstance(instance);

                options.roles = options.roles
                    ? options.roles
                    : Reflection.extractRolesPropertyFromInstance(instance);

                const method = propertyKey;
                const metadata = Reflection.getMethodMetadata(instance, method);

                if (this._services.exists(service, method)) {
                    throw new Error(`rest '${service}.${method}' already registered.`);
                }

                const descriptor = { service, method, options, metadata };
                this._services.add(descriptor);
                this.onRegister.dispatch(descriptor);
            }
        });
    }
    public registerMany(instances: any[]) {
        instances.forEach(instance => this.register(instance));
    }
    //#endregion

    //#region [ reflection ]
    protected injectParams(client: ISocketClient, request: IRestRequest, params: IParamMetadata[]): any[] {
        const args = new Array<any>();
        params.forEach(param => {
            if (!param.inject) {
                args.push(undefined);
            } else {
                switch (param.inject.type) {
                    case 'context':
                        if (!param.inject.name) {
                            args.push(client);
                        } else {
                            switch (param.inject.name) {
                                case 'isAuth': args.push(this.wss.auth.authInfos.exists(client.id)); break;
                                case 'user': args.push(this.wss.auth.authInfos.get(client.id).user); break;
                                case 'token': args.push(this.wss.auth.authInfos.get(client.id).token); break;
                                case 'address': args.push(client.address); break;
                                case 'url': args.push(client.url); break;
                                case 'origin': args.push(client.origin); break;
                                default: throw new Error(`Decorator @Context('${param.inject.name}') not implemented`);
                            }
                        }
                        break;

                    case 'data':
                        if (!param.inject.name) {
                            args.push(request.data);
                        } else {
                            args.push(request.data ? request.data[param.inject.name] : undefined);
                        }
                        break;

                    default:
                        throw {
                            code: WSErrorCode.ws_rest_method_error,
                            message: `Decorator @${param.inject.type} not implemented`,
                        };
                }
            }
        });
        return args;
    }
    //#endregion

    //#region [ validation ]
    protected async isValid(
        clientId: string,
        instance: any,
        options: IDecoratorOptionsBase,
    ): Promise<WSErrorCode> {
        if (options.isAuth) {
            if (!this.wss.auth.authInfos.exists(clientId)) { return WSErrorCode.ws_rest_auth_required; }
            if (options.roles) {
                const user = this.wss.auth.authInfos.get(clientId).user as any;
                if (!user.roles) { return WSErrorCode.ws_rest_auth_invalid_role; }
                if (!Array.isArray(user.roles)) { return WSErrorCode.ws_rest_auth_invalid_role; }
                if (!user.roles.some((role: string) => options.roles.indexOf(role) != -1)) {
                    return WSErrorCode.ws_rest_auth_invalid_role;
                }
            }
        }
        return WSErrorCode.none;
    }
    //#endregion
}
