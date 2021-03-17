import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventValidationData<TValidator, TData> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (validation: TValidator, data: TData) => void): HubEventValidationData<TValidator, TData>;
    public on(key: string, action: (validation: TValidator, data: TData) => void): HubEventValidationData<TValidator, TData>;
    public on(...args: any[]): HubEventValidationData<TValidator, TData> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventValidationData<TValidator, TData>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventValidationData<TValidator, TData>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(data: TData): void { super.emit(data); }
}
