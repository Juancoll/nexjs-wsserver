import { IModule } from './IModule';
import { ISocketServer } from '../base/sockets/ISocketServer';
import { WSServer } from '../WSServer';

export abstract class ModuleBase<TUser, TToken> implements IModule {

    protected readonly wss: WSServer<TUser, TToken>;

    constructor(wss: WSServer<TUser, TToken>) {
        this.wss = wss;
    }
    abstract init(server: ISocketServer): void;
}
