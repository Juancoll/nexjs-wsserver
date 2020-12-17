import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventSelectorData<TValidation, TSelection, TData> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (validation: TValidation, selection: TSelection, data: TData) => void): HubEventSelectorData<TValidation, TSelection, TData>;
    public on(key: string, action: (validation: TValidation, selection: TSelection, data: TData) => void): HubEventSelectorData<TValidation, TSelection, TData>;
    public on(...args: any[]): HubEventSelectorData<TValidation, TSelection, TData> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventSelectorData<TValidation, TSelection, TData>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventSelectorData<TValidation, TSelection, TData>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(selection: TSelection, data: TData): void { super.emit(selection, data); }
}
