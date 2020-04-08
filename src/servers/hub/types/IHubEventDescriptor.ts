import { ISocketClient } from '../../../base/sockets/ISocketClient';
import { IHubDecoratorOptions } from '../HubDecorator';

export interface IHubEventDescriptor {
    service: string;
    event: string;
    instance: any;
    options: IHubDecoratorOptions;
    subscriptions: Array<{
        socket: ISocketClient;
        credentials: string;
    }>;
}
