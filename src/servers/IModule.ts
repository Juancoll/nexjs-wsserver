import { ISocketServer } from '../base/sockets/ISocketServer';

export interface IModule {
    init(server: ISocketServer): void;
}
