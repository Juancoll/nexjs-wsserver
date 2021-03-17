// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';
import { HubOptionsType } from '../types/HubOptionsType';

export interface IHubDecoratorSelectorOptions<TInstance, TUser, TSelector> extends IDecoratorOptionsBase {
    select: (instance: TInstance, user: TUser, selector: TSelector) => Promise<boolean>;
}

export const hubDecoratorSelectorKey = 'custom:hubSelector';

type HubSelectorType = <TInstance, TUser, TSelector> (options: IHubDecoratorSelectorOptions<TInstance, TUser, TSelector>) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const HubSelector: HubSelectorType = (options) => {
    (options as any)._type = HubOptionsType.IHubDecoratorSelector
    return Reflect.metadata(hubDecoratorSelectorKey, options);
};
