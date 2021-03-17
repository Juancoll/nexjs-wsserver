// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';
import { HubOptionsType } from '../types/HubOptionsType';

export interface IHubDecoratorValidatorSelectorOptions<TInstance, TUser, TValidator, TValidateResult, TSelection> extends IDecoratorOptionsBase {
    validate: (instance: TInstance, user: TUser, credentials: TValidator) => Promise<TValidateResult | boolean>;
    select: (instance: TInstance, user: TUser, validateResult: TValidateResult, serverSelection: TSelection) => Promise<boolean>;
}

export const hubDecoratorValidatorSelectorKey = 'custom:hubValidatorSelector';

type HubType = <TInstance, TUser, TValidator, TValidateResult, TSelection> (options: IHubDecoratorValidatorSelectorOptions<TInstance, TUser, TValidator, TValidateResult, TSelection>) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const HubValidatorSelector: HubType = (options) => {
    (options as any)._type = HubOptionsType.IHubDecoratorValidatorSelector
    return Reflect.metadata(hubDecoratorValidatorSelectorKey, options);
};
