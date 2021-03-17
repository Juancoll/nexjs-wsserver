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

import { hubDecoratorKey } from './decorators/HubDecorator';
import { hubDecoratorSelectorKey } from './decorators/HubDecoratorSelector';
import { hubDecoratorValidatorKey } from './decorators/HubDecoratorValidator';
import { hubDecoratorValidatorSelectorKey } from './decorators/HubDecoratorValidatorSelector';

import { IHubRequest } from './messages/IHubRequest';
import { HubServiceCollection } from './types/HubServiceCollection';
import { IHubEventDescriptor } from './types/IHubEventDescriptor';
import { HubEventType } from './types/HubEventType';
import { IHubResponse } from './messages/IHubResponse';
import { IHubEventMessage } from './messages/IHubEventMessage';
import { IHubDecoratorValidatorOptions } from './decorators/HubDecoratorValidator';
import { IHubDecoratorValidatorSelectorOptions } from './decorators/HubDecoratorValidatorSelector';
import { HubOptionsType } from './types/HubOptionsType';

interface PublishEventArgs { clients: ISocketClient[]; descriptor: IHubEventDescriptor; selector?: any; data?: any; }
interface SucribedEventArgs { client: ISocketClient; service: string; event: string; validator: any; error?: IWSError; }
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

            const options: any = this.getMetadata(instance, propertyKey)

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
            this.checkEventAndDecoratorType(instance[event]._type, options._type)

            const descriptor = { service, event, instance, options, subscriptions: [] } as IHubEventDescriptor;

            switch (instance[event]._type) {
                case HubEventType.HubEvent:
                    instance[event].on(async () => await this.publish(service, event, null, null));
                    break;
                case HubEventType.HubEventData:
                    instance[event].on(async (data: any) => await this.publish(service, event, data, null));
                    break;

                case HubEventType.HubEventSelection:
                    instance[event].on(async (selector: any) => await this.publish(service, event, null, selector));
                    break;
                case HubEventType.HubEventSelectionData:
                    instance[event].on(async (selector: any, data: any) => await this.publish(service, event, data, selector));
                    break;

                case HubEventType.HubEventValidation:
                    instance[event].on(async () => await this.publish(service, event, null, null));
                    break;
                case HubEventType.HubEventValidationData:
                    instance[event].on(async (data: any) => await this.publish(service, event, data, null));
                    break;

                case HubEventType.HubEventValidationSelection:
                    instance[event].on(async (selector: any) => await this.publish(service, event, null, selector));
                    break;
                case HubEventType.HubEventValidationSelectionData:
                    instance[event].on(async (selector: any, data: any) => await this.publish(service, event, data, selector));
                    break;
            }

            this._services.add(descriptor);
            this.onRegister.dispatch(descriptor);
        });
    }
    //#endregion

    //#region  [ private ]
    private getMetadata(instance: any, propertyKey: string) {
        switch (instance[propertyKey]._type) {
            case HubEventType.HubEvent:
            case HubEventType.HubEventData:
                return Reflect.getMetadata(hubDecoratorKey, instance, propertyKey);

            case HubEventType.HubEventSelection:
            case HubEventType.HubEventSelectionData:
                return Reflect.getMetadata(hubDecoratorSelectorKey, instance, propertyKey);

            case HubEventType.HubEventValidation:
            case HubEventType.HubEventValidationData:
                return Reflect.getMetadata(hubDecoratorValidatorKey, instance, propertyKey);

            case HubEventType.HubEventValidationSelection:
            case HubEventType.HubEventValidationSelectionData:
                return Reflect.getMetadata(hubDecoratorValidatorSelectorKey, instance, propertyKey);
        }
    }
    private getEventDispatcherProperties(instance: any): string[] {
        const props: string[] = Object.getOwnPropertyNames(instance);

        return props.sort().filter((name) => instance[name].constructor && instance[name]._type && (
            instance[name]._type == HubEventType.HubEvent ||
            instance[name]._type == HubEventType.HubEventData ||
            instance[name]._type == HubEventType.HubEventSelection ||
            instance[name]._type == HubEventType.HubEventSelectionData ||
            instance[name]._type == HubEventType.HubEventValidation ||
            instance[name]._type == HubEventType.HubEventValidationData ||
            instance[name]._type == HubEventType.HubEventValidationSelection ||
            instance[name]._type == HubEventType.HubEventValidationSelectionData
        ));
    }
    private async subscribe(client: ISocketClient, req: IHubRequest) {
        const service = req.service;
        const event = req.eventName;
        const validator = req.validator;


        if (!this._services.exists(service, event)) {
            const error = {
                code: WSErrorCode.ws_hub_subscribe_error,
                message: `service '${service}' or event '${event} not found.`,
            };
            this.onSuscribed.dispatch({ client, service, event, validator, error });
            throw error;
        }
        const descriptor = this._services.get(service, event);
        const subscriptions = descriptor.subscriptions;
        const subscription = subscriptions.find(x => x.socket.id == client.id);

        // Auth verification
        const code = this.isAuth(client.id, descriptor.options)
        if (code != WSErrorCode.none) {
            const error = { code, message: `unauthorized` };
            this.onSuscribed.dispatch({ client, service, event, validator, error });
            throw error;
        }

        // Validation verification
        let user = undefined;
        if (this.wss.auth && this.wss.auth.authInfos && this.wss.auth.authInfos.exists(client.id)) {
            user = this.wss.auth.authInfos.get(client.id).user as any;
        }
        let validationResult: any;
        try {
            switch ((descriptor.options as any)._type) {
                case HubOptionsType.IHubDecoratorValidator: {
                    const options = descriptor.options as IHubDecoratorValidatorOptions<any, any, any>

                    const isValid = await options.validate(descriptor.instance, user, validator);
                    if (!isValid) { throw new Error(); }
                } break

                case HubOptionsType.IHubDecoratorValidatorSelector: {
                    const options = descriptor.options as IHubDecoratorValidatorSelectorOptions<any, any, any, any, any>
                    const result = await options.validate(descriptor.instance, user, validator);
                    if (typeof result == 'boolean') {
                        if (result) { validationResult = validator } else { throw new Error() }
                    } else {
                        validationResult = result
                    }
                }
            }
        } catch (err) {
            if (subscription) {
                this.unusbscribe(subscription.socket, req)
            }
            const error = {
                code: WSErrorCode.ws_hub_auth_credentials_error,
                message: err.message
                    ? `unauthorized: ${err.message}`
                    : 'unauthorized'
            }
            this.onSuscribed.dispatch({ client, service, event, validator, error });
            throw error;
        }

        // Continue process
        if (subscription) {
            subscription.validator = validator;
            subscription.validationResult = validationResult;
            this.onSuscribed.dispatch({ client, service, event, validator });

        } else {
            subscriptions.push({
                socket: client,
                validator,
                validationResult
            });
            this.onSuscribed.dispatch({ client, service, event, validator });
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
    private async publish(service: string, event: string, data: any, selector: any) {
        const descriptor = this._services.get(service, event);
        const select = (descriptor.options as any).select;
        const clients = descriptor.subscriptions;
        const selectedClients: ISocketClient[] = [];

        for (const client of clients) {
            if (!select) {
                selectedClients.push(client.socket);
            } else {
                let user = undefined;
                if (this.wss.auth && this.wss.auth.authInfos && this.wss.auth.authInfos.exists(client.socket.id))
                    user = this.wss.auth.authInfos.get(client.socket.id).user;
                const validationResult = client.validationResult;
                const isValid = await select(descriptor.instance, user, validationResult, selector);
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

        this.onPublish.dispatch({ clients: selectedClients, descriptor, data, selector });
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
    isAuth(clientId: string, options: IDecoratorOptionsBase): WSErrorCode {
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
        return WSErrorCode.none
    }

    checkEventAndDecoratorType(eventType: HubEventType, optionsType: HubOptionsType): void {
        switch (eventType) {
            case HubEventType.HubEvent:
            case HubEventType.HubEventData:
                if (optionsType != HubOptionsType.IHubDecorator) throw new Error('Invalid Hub Decorator. Require "Hub"')
                break;

            case HubEventType.HubEventSelection:
            case HubEventType.HubEventSelectionData:
                if (optionsType != HubOptionsType.IHubDecoratorSelector) throw new Error('Invalid Hub Decorator. Require "HubSelector"')
                break;

            case HubEventType.HubEventValidation:
            case HubEventType.HubEventValidationData:
                if (optionsType != HubOptionsType.IHubDecoratorValidator) throw new Error('Invalid Hub Decorator. Require "HubValidator"')
                break;

            case HubEventType.HubEventValidationSelection:
            case HubEventType.HubEventValidationSelectionData:
                if (optionsType != HubOptionsType.IHubDecoratorValidatorSelector) throw new Error('Invalid Hub Decorator. Require "HubValidatorSelector')
                break;
        }
    }
    //#endregion
}
