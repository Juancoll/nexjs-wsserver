import { IMethodMetadata } from '../../../decorators/IMethodMetadata';
import { IDecoratorOptionsBase } from '../../../decorators/IDecoratorOptionsBase';

export interface IRestMethodDescriptor {
    service: string;
    method: string;
    metadata: IMethodMetadata;
    options: IDecoratorOptionsBase;
}
