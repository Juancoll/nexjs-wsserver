import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventValidation<TValidator> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (validation: TValidator) => void): HubEventValidation<TValidator>;
    public on(key: string, action: (validation: TValidator) => void): HubEventValidation<TValidator>;
    public on(...args: any[]): HubEventValidation<TValidator> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventValidation<TValidator>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventValidation<TValidator>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(): void { super.emit(); }
}
