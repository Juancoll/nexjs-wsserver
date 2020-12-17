// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../../decorators/IDecoratorOptionsBase';

export interface IHubDecoratorOptions<TInstance = any, TUser = any, TValidation = any, TSelection = any> extends IDecoratorOptionsBase<TInstance, TUser> {
    validate?: (instance: TInstance, user: TUser, credentials: TValidation) => Promise<boolean>;
    select?: (instance: TInstance, user: TUser, userValidation: TValidation, serverSelection: TSelection) => Promise<boolean>;
}

export const hubDecoratorKey = 'custom:hub';

type HubType = <TInstance = any, TUser = any, TValidation = any, TSelection = any> (options?: IHubDecoratorOptions<TInstance, TUser, TValidation, TSelection>) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const Hub: HubType = (options) => {
    return Reflect.metadata(hubDecoratorKey, !options ? {} : options);
};
