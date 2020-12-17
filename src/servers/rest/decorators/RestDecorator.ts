import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';

// tslint:disable-next-line: no-empty-interface
export interface RestDecoratorOptions<TInstance = any, TUser = any> extends IDecoratorOptionsBase<TInstance, TUser> {
}

export const restDecoratorKey = 'custom:rest';

type RestType = <TInstance = any, TUser = any> (options?: RestDecoratorOptions<TInstance, TUser>) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;

// tslint:disable-next-line: variable-name
export const Rest: RestType = (options) => {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(restDecoratorKey, !options ? {} : options, target, propertyKey);
    };
};
