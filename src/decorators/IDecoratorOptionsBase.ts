export interface IDecoratorOptionsBase<TInstance = any, TUser = any> {
    service?: string;
    isAuth?: boolean;
    roles?: string[];
}
