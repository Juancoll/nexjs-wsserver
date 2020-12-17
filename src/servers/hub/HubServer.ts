import 'reflect-metadata';
import { SimpleEventDispatcher } from 'strongly-typed-events';

import { IDecoratorOptionsBase } from '../../decorators/IDecoratorOptionsBase';
import { WSErrorCode } from '../../types/WSErrorCode';
import { RestProtocolServer } from '../../base/rest/RestProtocolServer';
import { ISocketServer } from '../../base/sockets/ISocketServer';
import { ISocketClient } from '../../base/sockets/ISocketClient';
import { Reflection } from '../../types/Reflection';
import { IWSError } from '../../types/IWSError';

import { WSServer } from '../../WSServer';
import { ModuleBase } from '../ModuleBase';

import { IHubDecoratorOptions, hubDecoratorKey } from './HubDecorator';
import { IHubRequest } from './messages/IHubRequest';
import { HubServiceCollection } from './types/HubServiceCollection';
import { IHubEventDescriptor } from './types/IHubEventDescriptor';
import { HubEventType } from './types/HubEventType';
import { IHubResponse } from './messages/IHubResponse';
import { IHubEventMessage } from './messages/IHubEventMessage';

interface PublishEventArgs { clients: ISocketClient[]; descriptor: IHubEventDescriptor; serverCredentials?: any; data?: any; }
interface SucribedEventArgs { client: ISocketClient; service: string; event: string; credentials: any; error?: IWSError; }
interface UnsucribedEventArgs { client: ISocketClient; service: string; event: string; error?: IWSError; }

export class HubServer<TUser, TToken> extends ModuleBase<TUser, TToken> {

    //#region [ constants ]
    private PUBLISH_EVENT = '__hub::publish__';
    //#endregion

    //#endregion [ fields ]
    private _services = new HubServiceCollection();
    private _restProtocol = new RestProtocolServer<IHubRequest, IHubResponse>('hub');
    //#endregion

    //#region [ events ]
    public readonly onRegister = new SimpleEventDispatcher<IHubEventDescriptor>();
    public readonly onPublish = new SimpleEventDispatcher<PublishEventArgs>();
    public readonly onSuscribed = new SimpleEventDispatcher<SucribedEventArgs>();
    public readonly onUnsuscribed = new SimpleEventDispatcher<UnsucribedEventArgs>();
    //#endregion

    //#region [ constructor ]
    constructor(wss: WSServer<TUser, TToken>) {
        super(wss);
        this._restProtocol.on(async (server, client, req: IHubRequest) => {
            switch (req.method) {
                case 'subscribe': await this.subscribe(client, req); break;
                case 'unsubscribe': this.unusbscribe(client, req); break;
                default: throw {
                    code: WSErrorCode.ws_hub_error,
                    message: `method '${req.method}' not implemented`,
                };
            }
        });
    }
    //#endregion

    //#region  [ public ]
    public init(server: ISocketServer): void {
        this._restProtocol.init(server);
        server.onConnection(client => {
            client.onDisconnect(() => this.removeClient(client));
        });
    }

    public register(instance: any): void {
        this.getEventDispatcherProperties(instance).forEach(propertyKey => {
            const options: IHubDecoratorOptions = Reflect.getMetadata(hubDecoratorKey, instance, propertyKey);
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

                const event = propertyKey;

                if (this._services.exists(service, event)) {
                    throw new Error(`service '${service}' already contains event '${event}'`);
                }
                const descriptor = { service, event, instance, options, subscriptions: [] } as IHubEventDescriptor;
                this._services.add(descriptor);
                this.onRegister.dispatch(descriptor);

                switch (instance[event]._type) {
                    case HubEventType.HubEvent:
                        instance[event]
                            .on(async () => await this.publish(service, event, null, null));
                        break;
                    case HubEventType.HubEventSelector:
                        instance[event]
                            .on(async (credentials: any) => await this.publish(service, event, null, credentials));
                        break;
                    case HubEventType.HubEventData:
                        instance[event]
                            .on(async (data: any) => await this.publish(service, event, data, null));
                        break;
                    case HubEventType.HubEventSelectorData:
                        instance[event]
                            .on(async (credentials: any, data: any) => await this.publish(service, event, data, credentials));
                        break;
                }
            }
        });
    }
    //#endregion

    //#region  [ private ]
    private getEventDispatcherProperties(instance: any): string[] {
        const props: string[] = Object.getOwnPropertyNames(instance);

        return props.sort().filter((name) => instance[name].constructor && instance[name]._type && (
            instance[name]._type == HubEventType.HubEvent ||
            instance[name]._type == HubEventType.HubEventData ||
            instance[name]._type == HubEventType.HubEventSelector ||
            instance[name]._type == HubEventType.HubEventSelectorData
        ));
    }
    private async subscribe(client: ISocketClient, req: IHubRequest) {
        const service = req.service;
        const event = req.eventName;
        const credentials = req.credentials;

        if (!this._services.exists(service, event)) {
            const error = {
                code: WSErrorCode.ws_hub_subscribe_error,
                message: `service '${service}' or event '${event} not found.`,
            };
            this.onSuscribed.dispatch({ client, service, event, credentials, error });
            throw error;
        } else {
            const descriptor = this._services.get(service, event);
            const code = await this.isValid(
                client.id,
                descriptor.instance,
                descriptor.options,
                req.credentials,
            );
            if (code != WSErrorCode.none) {
                const error = {
                    code,
                    message: `unauthorized`,
                };
                this.onSuscribed.dispatch({ client, service, event, credentials, error });
                throw error;
            } else {
                const subscriptions = descriptor.subscriptions;
                const subscription = subscriptions.find(x => x.socket.id == client.id);
                if (subscription) {
                    subscription.credentials = credentials;
                    this.onSuscribed.dispatch({ client, service, event, credentials });

                } else {
                    subscriptions.push({ socket: client, credentials: req.credentials });
                    this.onSuscribed.dispatch({ client, service, event, credentials });
                }
            }
        }
    }
    private unusbscribe(client: ISocketClient, req: IHubRequest) {
        const service = req.service;
        const event = req.eventName;

        if (!this._services.exists(service, event)) {
            const error = {
                code: WSErrorCode.ws_hub_subscribe_error,
                message: `service '${service}' or event '${event} not found.`,
            };
            this.onUnsuscribed.dispatch({ client, service, event, error });
            throw error;
        } else {
            const descriptor = this._services.get(service, event);
            const subscriptions = descriptor.subscriptions;
            const idx = subscriptions.findIndex(x => x.socket.id == client.id);
            if (idx > -1) {
                subscriptions.splice(idx, 1);
                this.onUnsuscribed.dispatch({ client, service, event });
            }
        }
    }
    private async publish(service: string, event: string, data: any, serverCredentials: any) {
        const descriptor = this._services.get(service, event);
        const select = descriptor.options.select;
        const clients = descriptor.subscriptions;
        const selectedClients: ISocketClient[] = [];

        for (const client of clients) {
            if (!select) {
                selectedClients.push(client.socket);
            } else {
                let user = undefined;
                if (this.wss.auth && this.wss.auth.authInfos && this.wss.auth.authInfos.exists(client.socket.id))
                    user = this.wss.auth.authInfos.get(client.socket.id).user;
                const userCredentials = client.credentials;
                const isValid = await select(descriptor.instance, user, userCredentials, serverCredentials);
                if (isValid) {
                    selectedClients.push(client.socket);
                }
            }
        }
        selectedClients.forEach(x => x.emit(this.PUBLISH_EVENT, {
            service,
            eventName: event,
            data,
        } as IHubEventMessage));
        this.onPublish.dispatch({ clients: selectedClients, descriptor, data, serverCredentials });
    }
    private removeClient(client: ISocketClient) {
        this._services.list().forEach(descriptor => {
            const subscriptions = descriptor.subscriptions;
            const idx = subscriptions.findIndex(x => x.socket.id == client.id);
            if (idx > -1) {
                subscriptions.splice(idx, 1);
            }
        });
    }
    //#endregion

    //#region [ validation ]
    protected async isValid(
        clientId: string,
        instance: any,
        options: IHubDecoratorOptions,
        credentials: any,
    ): Promise<WSErrorCode> {
        if (options.isAuth) {
            if (!this.wss.auth.authInfos.exists(clientId)) { return WSErrorCode.ws_hub_auth_required; }
            if (options.roles) {
                const user = this.wss.auth.authInfos.get(clientId).user as any;
                if (!user.roles) { return WSErrorCode.ws_hub_auth_invalid_role; }
                if (!Array.isArray(user.roles)) { return WSErrorCode.ws_hub_auth_invalid_role; }
                if (!user.roles.some((role: string) => options.roles.indexOf(role) != -1)) {
                    return WSErrorCode.ws_hub_auth_invalid_role;
                }
            }
        }
        if (options.validate) {
            try {
                let user = undefined;
                if (this.wss.auth && this.wss.auth.authInfos && this.wss.auth.authInfos.exists(clientId)) {
                    user = this.wss.auth.authInfos.get(clientId).user as any;
                }
                const isValid = await options.validate(instance, user, credentials);
                if (!isValid) { return WSErrorCode.ws_hub_auth_credentials_error; }
            } catch (err) {
                return WSErrorCode.ws_hub_auth_credentials_error;
            }
        }
        return WSErrorCode.none;
    }
    //#endregion
}
