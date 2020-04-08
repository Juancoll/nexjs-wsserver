import { Server } from 'socket.io';
import { ISocketServer } from '../base/sockets/ISocketServer';
import { ISocketClient } from '../base/sockets/ISocketClient';
import { SocketIOClient } from './SocketIOClient';

export class SocketIOServer implements ISocketServer {

    //#region  [ fields ]
    _ioserver: Server;
    //#endregion

    //#region [ implements ISocketServer ]
    onConnection(action: (client: ISocketClient) => void): ISocketServer {
        this._ioserver.on('connection', client => {
            action(new SocketIOClient(client));
        });
        return this;
    }
    //#endregion

    //#region [ constructor ]
    constructor(socket: Server) {
        this._ioserver = socket;
    }
    //#endregion
}
