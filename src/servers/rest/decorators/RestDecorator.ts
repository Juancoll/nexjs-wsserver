import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';

// tslint:disable-next-line: no-empty-interface
export interface RestDecoratorOptions extends IDecoratorOptionsBase {
}

export const restDecoratorKey = 'custom:rest';

type RestType = (options?: RestDecoratorOptions) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;

// tslint:disable-next-line: variable-name
export const Rest: RestType = (options) => {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(restDecoratorKey, !options ? {} : options, target, propertyKey);
    };
};
