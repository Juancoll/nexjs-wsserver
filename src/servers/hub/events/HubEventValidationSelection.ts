import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventValidationSelection<TValidator, TSelector> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (validation: TValidator, selection: TSelector) => void): HubEventValidationSelection<TValidator, TSelector>;
    public on(key: string, action: (validation: TValidator, selection: TSelector) => void): HubEventValidationSelection<TValidator, TSelector>;
    public on(...args: any[]): HubEventValidationSelection<TValidator, TSelector> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventValidationSelection<TValidator, TSelector>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventValidationSelection<TValidator, TSelector>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(selection: TSelector): void { super.emit(selection); }
}
