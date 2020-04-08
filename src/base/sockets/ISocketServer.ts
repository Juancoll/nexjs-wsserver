import { ISocketClient } from './ISocketClient';
import { SimpleEventDispatcher } from 'strongly-typed-events';

export interface ISocketServer {
    onConnection(action: (client: ISocketClient) => void): ISocketServer;
}
