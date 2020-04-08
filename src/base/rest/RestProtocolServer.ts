import { ISocketServer } from '../sockets/ISocketServer';
import { IRestProtocolRequest } from './messages/IRestProtocolRequest';
import { ISocketClient } from '../sockets/ISocketClient';
import { IRestProtocolResponse } from './messages/IRestPRotocolResponse';
import { SimpleEventDispatcher } from 'strongly-typed-events';
import { IRestProtocolError } from './types/IRestProtocolError';
import { IWSError } from '../../types/IWSError';
import { WSErrorCode } from '../../types/WSErrorCode';

export class RestProtocolServer<TRequest, TResponse> {
    //#region  [ constants ]
    private get REQUEST_EVENT() { return `__${this.name}::restprotocol::request__`; }
    private get RESPONSE_EVENT() { return `__${this.name}::restprotocol::response__`; }
    //#endregion

    //#region [ fields ]
    private _actions: Array<(server: ISocketServer, client: ISocketClient, data: TRequest) => TResponse> = [];
    //#endregion

    //#region [ properties ]
    public readonly name: string;
    public readonly onRestProtocolError = new SimpleEventDispatcher<IRestProtocolError>();
    //#endregion

    //#region [ constructor ]
    constructor(name: string) {
        this.name = name;
    }
    //#endregion

    //#region [ public ]
    public init(server: ISocketServer): void {
        server.onConnection(client => {
            client.on(this.REQUEST_EVENT, async (req: IRestProtocolRequest<TRequest>) => {
                this.emit(server, client, req);
            });
        });
    }
    public on(action: (server: ISocketServer, client: ISocketClient, data: TRequest) => TResponse) {
        this._actions.push(action);
    }
    public off() {
        this._actions = [];
    }
    //#endregion

    //#region [ private ]
    private emit(server: ISocketServer, client: ISocketClient, req: IRestProtocolRequest<TRequest>) {
        this._actions.forEach(async action => {
            try {
                let result: TResponse | Promise<TResponse> = action(server, client, req.data);
                if (this.isPromise(result)) {
                    result = await result;
                }
                client.emit(this.RESPONSE_EVENT, {
                    id: req.id,
                    isSuccess: true,
                    module: req.module,
                    data: result,
                } as IRestProtocolResponse<TResponse>);

            } catch (err) {
                const error = {
                    code: err.code ? err.code : WSErrorCode.ws_restprotocol_error,
                    message: err.message ? err.message : undefined,
                } as IWSError;

                client.emit(this.RESPONSE_EVENT, {
                    id: req.id,
                    isSuccess: false,
                    module: req.module,
                    error,
                } as IRestProtocolResponse<TResponse>);

                this.onRestProtocolError.dispatch({ request: req, error });
            }
        });
    }
    private isPromise(value: any): boolean {
        if (!value) { return false; }
        return typeof value.then == 'function';
    }

    //#endregion
}
