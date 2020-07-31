import { AuthServer } from './servers/auth/AuthServer';
import { HubServer } from './servers/hub/HubServer';
import { RestServer } from './servers/rest/RestServer';
import { IAuthStrategy } from './servers/auth/types/IAuthStrategy';
import { ISocketServer } from './base/sockets/ISocketServer';

export class WSServer<TUser, TToken> {

    public server: ISocketServer;
    public readonly auth: AuthServer<TUser, TToken>;
    public readonly hub: HubServer<TUser, TToken>;
    public readonly rest: RestServer<TUser, TToken>;

    constructor(authStrategy?: IAuthStrategy<TUser, TToken>) {
        if (authStrategy)
            this.auth = new AuthServer<TUser, TToken>(this, authStrategy);
        this.hub = new HubServer<TUser, TToken>(this);
        this.rest = new RestServer<TUser, TToken>(this);
    }

    init(server: ISocketServer) {
        this.server = server;
        if (this.auth)
            this.auth.init(server);
        this.hub.init(server);
        this.rest.init(server);
    }

    register(instance: any) {
        this.hub.register(instance);
        this.rest.register(instance);
    }
}
