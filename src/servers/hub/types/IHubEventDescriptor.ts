import { ISocketClient } from '../../../base/sockets/ISocketClient';
import { IHubDecoratorOptions } from '../decorators/HubDecorator';
import { IHubDecoratorSelectorOptions } from '../decorators/HubDecoratorSelector';
import { IHubDecoratorValidatorOptions } from '../decorators/HubDecoratorValidator';
import { IHubDecoratorValidatorSelectorOptions } from '../decorators/HubDecoratorValidatorSelector';

export interface IHubEventDescriptor {
    service: string;
    event: string;
    instance: any;
    options: IHubDecoratorOptions | IHubDecoratorSelectorOptions<any, any, any> | IHubDecoratorValidatorOptions<any, any, any> | IHubDecoratorValidatorSelectorOptions<any, any, any, any, any>
    subscriptions: Array<{
        socket: ISocketClient;
        validator: any;
        validationResult: any;
    }>;
}
