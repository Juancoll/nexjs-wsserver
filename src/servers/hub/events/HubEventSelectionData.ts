import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventSelectionData<TSelector, TData> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (selection: TSelector, data: TData) => void): HubEventSelectionData<TSelector, TData>;
    public on(key: string, action: (selection: TSelector, data: TData) => void): HubEventSelectionData<TSelector, TData>;
    public on(...args: any[]): HubEventSelectionData<TSelector, TData> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventSelectionData<TSelector, TData>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventSelectionData<TSelector, TData>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(selection: TSelector, data: TData): void { super.emit(selection, data); }
}
