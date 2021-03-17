// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';
import { HubOptionsType } from '../types/HubOptionsType';

export interface IHubDecoratorValidatorOptions<TInstance, TUser, TValidator> extends IDecoratorOptionsBase {
    validate: (instance: TInstance, user: TUser, credentials: TValidator) => Promise<boolean>;
}

export const hubDecoratorValidatorKey = 'custom:hubValidator';

type HubValidatorType = <TInstance, TUser, TValidator> (options: IHubDecoratorValidatorOptions<TInstance, TUser, TValidator>) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const HubValidator: HubValidatorType = (options) => {
    (options as any)._type = HubOptionsType.IHubDecoratorValidator
    return Reflect.metadata(hubDecoratorValidatorKey, options);
};
