import { ISocketClient } from '../base/sockets/ISocketClient';
import { Socket } from 'socket.io';

export class SocketIOClient implements ISocketClient {

    //#region  [ fields ]
    _ioclient: Socket;
    //#endregion

    //#region [ constructor ]
    constructor(client: Socket) {
        this._ioclient = client;
    }
    //#endregion

    //#region  [ implements ISocketClient ]
    get id(): string { return this._ioclient.id; }
    get address(): string { return this._ioclient.handshake.address; }
    get url(): string { return this._ioclient.handshake.url; }
    get origin(): string | string[] | undefined { return this._ioclient.handshake.headers.origin; }
    disconnect(): void {
        this._ioclient.disconnect();
    }
    onDisconnect(action: () => void): void {
        this._ioclient.on('disconnect', action);
    }
    on(name: string, action: (data: any) => void): ISocketClient {
        this._ioclient.on(name, action);
        return this;
    }
    emit(name: string, data?: any): void {
        this._ioclient.emit(name, data);
    }
    //#endregion
}
