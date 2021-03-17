// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';
import { HubOptionsType } from '../types/HubOptionsType';

export interface IHubDecoratorOptions extends IDecoratorOptionsBase {
}

export const hubDecoratorKey = 'custom:hub';

type HubType = (options?: IHubDecoratorOptions) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const Hub: HubType = (options) => {
    options = !options ? {} : options;
    (options as any)._type = HubOptionsType.IHubDecorator
    return Reflect.metadata(hubDecoratorKey, options);
};
