import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventSelector<TValidation, TSelection> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (validation: TValidation, selection: TSelection) => void): HubEventSelector<TValidation, TSelection>;
    public on(key: string, action: (validation: TValidation, selection: TSelection) => void): HubEventSelector<TValidation, TSelection>;
    public on(...args: any[]): HubEventSelector<TValidation, TSelection> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventSelector<TValidation, TSelection>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventSelector<TValidation, TSelection>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(selection: TSelection): void { super.emit(selection); }
}
