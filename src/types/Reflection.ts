import { paramDecoratorKey } from '../servers/rest/decorators/ParamDecorators';
import { IParamDecorator } from '../decorators/IParamDecorator';
import { IMethodMetadata } from '../decorators/IMethodMetadata';

export class Reflection {
    public static isPromise(value: any): boolean {
        if (!value) { return false; }
        return typeof value.then == 'function';
    }
    public static getMethods(instance: any): string[] {
        let props: string[] = [];
        let current = instance;
        do {
            props = props.concat(Object.getOwnPropertyNames(current));
            current = Object.getPrototypeOf(current);
        } while (current);

        return props.sort().filter((name, idx, arr) => name != arr[idx + 1] && typeof instance[name] == 'function');
    }
    public static getMethodsParamNames(fn: any): string[] {
        const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const DEFAULT_PARAMS = /=[^,]+/mg;
        const FAT_ARROWS = /=>.*$/mg;

        const code = fn.toString()
            .replace(COMMENTS, '')
            .replace(FAT_ARROWS, '')
            .replace(DEFAULT_PARAMS, '');

        const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
            .match(/([^\s,]+)/g);

        return result === null
            ? []
            : result;
    }
    public static hasParamDecorators(target: any, propertyName: string): boolean {
        const metadata = Reflect.getMetadata(paramDecoratorKey, target, propertyName);
        return metadata ? true : false;
    }
    public static getParamDecorators(target: any, propertyName: string): IParamDecorator[] {
        const metadata = Reflect.getMetadata(paramDecoratorKey, target, propertyName);
        return metadata || [];
    }
    public static getMethodMetadata(target: any, propertyName: string): IMethodMetadata {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', target, propertyName);
        const returnType: any = Reflect.getMetadata('design:returntype', target, propertyName);
        const paramNames: string[] = this.getMethodsParamNames(target[propertyName]);
        const paramDecorators: IParamDecorator[] = this.getParamDecorators(target, propertyName);

        return {
            target,
            returnType,
            params: paramTypes.map((type, idx) => ({
                name: paramNames[idx],
                type,
                inject: paramDecorators.find(x => x.idx == idx),
            })),
        };

    }
    public static extractServicePropertyFromInstance(instance: any): string {
        if (!instance.service) {
            throw new Error('object doesn\'t contains service: string property. define service in decorator.');
        }
        if (typeof instance.service != 'string') {
            throw new Error('service property must be string');
        }
        return instance.service;
    }
    public static extractIsAuthPropertyFromInstance(instance: any): boolean {
        if (instance.isAuth && typeof instance.isAuth != 'boolean') {
            throw new Error('isAuth property must be boolean');
        }
        return instance.isAuth || false;
    }

    public static extractRolesPropertyFromInstance(instance: any): string[] {
        if (instance.roles && Array.isArray(instance.roles) == false) {
            throw new Error('roles property must be array[]');
        }
        return instance.roles
    }
}
